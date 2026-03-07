"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ScopeToggle from "@/components/ui/ScopeToggle";
import { expenseService } from "@/services/expenseService";
import { userService, UserSettings } from "@/services/userService";
import { Spesa } from "@/types/expenses";
import { useScope } from "@/context/ScopeContext";
import { getCurrentMonthRange, formatCurrency, getCustomPeriodRange } from "@/lib/formatUtils";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Info, Receipt, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import clsx from "clsx";

// Colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#FF6384'];
// Forecast colors (lighter/different)
const COLORS_FORECAST = ['#82ca9d', '#8884d8', '#ffc658', '#FF6384', '#0088FE', '#00C49F', '#FFBB28', '#FF8042']; 
const SALDO_COLORS = ['#10B981', '#EF4444']; // Green, Red
const SALDO_FORECAST_COLORS = ['#6EE7B7', '#FCA5A5']; // Lighter Green, Red

interface ChartDataPoint {
  name: string;
  value: number;
}

interface ListDataPoint {
  ambito: string;
  actual: number;
  forecast: number;
}

export default function AnalisiPage() {
  const { scope, isInitialized } = useScope();
  const [loading, setLoading] = useState(true);
  
  // Raw transactions
  const [transactions, setTransactions] = useState<Spesa[]>([]);

  // Computed data
  const [chartDataActual, setChartDataActual] = useState<ChartDataPoint[]>([]);
  const [chartDataForecast, setChartDataForecast] = useState<ChartDataPoint[]>([]);
  const [listData, setListData] = useState<ListDataPoint[]>([]);
  
  // Center values (Total or Net Balance)
  const [centerValues, setCenterValues] = useState({ actual: 0, forecast: 0 });

  const [range, setRange] = useState(getCurrentMonthRange());
  const [pendingRange, setPendingRange] = useState(getCurrentMonthRange());
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    userService.getSettings().then((s) => {
      setUserSettings(s);
      if (s.custom_period_active) {
          const today = new Date();
          let targetMonth = today.getMonth();
          let targetYear = today.getFullYear();
          
          if (today.getDate() >= s.custom_period_start_day) {
             targetMonth++;
             if (targetMonth > 11) {
                targetMonth = 0;
                targetYear++;
             }
          }
          
          setRange(getCustomPeriodRange(targetYear, targetMonth, s.custom_period_start_day, true));
          setPendingRange(getCustomPeriodRange(targetYear, targetMonth, s.custom_period_start_day, true));
      }
      setSettingsLoaded(true);
    });
  }, []);

  const [filterType, setFilterType] = useState<'saldo' | 'spesa' | 'entrata'>('saldo');
  const [detailAmbito, setDetailAmbito] = useState<string | null>(null);

  // 1. Fetch data
  useEffect(() => {
    if (!isInitialized || !settingsLoaded) return;

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await expenseService.getExpenses(range.start, range.end, scope);
            setTransactions(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [range, scope, isInitialized, settingsLoaded]);

  // 2. Compute stats
  useEffect(() => {
    processStats();
  }, [transactions, filterType]);

  const processStats = () => {
      const today = new Date().toISOString().split('T')[0];

      // Helper to process a subset of transactions
      const getBreakdown = (txs: Spesa[], type: 'saldo' | 'spesa' | 'entrata') => {
          if (type === 'saldo') {
             const entrate = txs.filter(t => t.tipo_transazione === 'entrata').reduce((s, t) => s + t.importo, 0);
             const uscite = txs.filter(t => t.tipo_transazione === 'spesa').reduce((s, t) => s + t.importo, 0);
             return {
                 chart: [
                    { name: 'Entrate', value: entrate },
                    { name: 'Uscite', value: uscite }
                 ],
                 specialSaldoListMap: () => {
                     const m = new Map<string, number>();
                     txs.forEach(t => {
                        const val = t.tipo_transazione === 'entrata' ? t.importo : -t.importo;
                        m.set(t.ambito, (m.get(t.ambito) || 0) + val);
                     });
                     return m;
                 },
                 total: entrate - uscite
             };
          } else {
             // Spesa or Entrata
             const filtered = txs.filter(t => t.tipo_transazione === type);
             const map = new Map<string, number>();
             filtered.forEach(t => {
                map.set(t.ambito, (map.get(t.ambito) || 0) + t.importo);
             });
             
             const chart = Array.from(map.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

             const total = filtered.reduce((s, t) => s + t.importo, 0);

             return { chart, specialSaldoListMap: () => map, total };
          }
      };

      // 1. Filter Transactions
      const actualTxs = transactions.filter(e => e.confermata && e.data_spesa.split('T')[0] <= today);
      const forecastTxs = transactions; // All are part of forecast

      // 2. Process Both
      const actualStats = getBreakdown(actualTxs, filterType);
      const forecastStats = getBreakdown(forecastTxs, filterType);

      // 3. Set Chart Data
      setChartDataActual(actualStats.chart);
      setChartDataForecast(forecastStats.chart);
      setCenterValues({ actual: actualStats.total, forecast: forecastStats.total });

      // 4. Merge List Data
      // For Saldo, we use Net Value per Ambito. For Spesa/Entrata, we use absolute sum.
      const actualMap = actualStats.specialSaldoListMap();
      const forecastMap = forecastStats.specialSaldoListMap();

      const allKeys = new Set([...actualMap.keys(), ...forecastMap.keys()]);
      
      const mergedList: ListDataPoint[] = Array.from(allKeys).map(ambito => ({
          ambito,
          actual: actualMap.get(ambito) || 0,
          forecast: forecastMap.get(ambito) || 0
      }));

      // Sort
      mergedList.sort((a, b) => Math.abs(b.forecast) - Math.abs(a.forecast));

      setListData(mergedList);
  };

  const shiftPeriod = (direction: 'prev' | 'next') => {
    if (userSettings?.custom_period_active && userSettings.custom_period_start_day > 1) {
      const startDate = new Date(range.start + 'T00:00:00');
      let targetYear = startDate.getFullYear();
      let targetMonth = startDate.getMonth() + 1 + (direction === 'next' ? 1 : -1);
      if (targetMonth > 11) { targetMonth -= 12; targetYear++; }
      if (targetMonth < 0)  { targetMonth += 12; targetYear--; }
      setRange(getCustomPeriodRange(targetYear, targetMonth, userSettings.custom_period_start_day, true));
      setPendingRange(getCustomPeriodRange(targetYear, targetMonth, userSettings.custom_period_start_day, true));
    } else {
      const startDate = new Date(range.start + 'T00:00:00');
      let y = startDate.getFullYear();
      let m = startDate.getMonth() + (direction === 'next' ? 1 : -1);
      if (m > 11) { m = 0; y++; }
      if (m < 0)  { m = 11; y--; }
      const lastDay = new Date(y, m + 1, 0).getDate();
      const mm = String(m + 1).padStart(2, '0');
      const r = { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
      setRange(r);
      setPendingRange(r);
    }
  };

  const resetToCurrentPeriod = () => {
    if (userSettings?.custom_period_active) {
      const today = new Date();
      let targetMonth = today.getMonth();
      let targetYear = today.getFullYear();
      if (today.getDate() >= userSettings.custom_period_start_day) {
        targetMonth++;
        if (targetMonth > 11) { targetMonth = 0; targetYear++; }
      }
      const r = getCustomPeriodRange(targetYear, targetMonth, userSettings.custom_period_start_day, true);
      setRange(r);
      setPendingRange(r);
    } else {
      const r = getCurrentMonthRange();
      setRange(r);
      setPendingRange(r);
    }
  };

  const rangeIsDirty = pendingRange.start !== range.start || pendingRange.end !== range.end;

  const chartColorsInner = filterType === 'saldo' ? SALDO_COLORS : COLORS;
  const chartColorsOuter = filterType === 'saldo' ? SALDO_FORECAST_COLORS : COLORS_FORECAST;

  return (
    <ProtectedRoute>
      <div className={clsx("min-h-screen pb-20 transition-colors duration-300", scope === 'P' ? "bg-gray-50/90 dark:bg-gray-950/90" : "bg-gray-50 dark:bg-gray-950")}>
        <header className="bg-white dark:bg-gray-900 shadow-sm p-4 sticky top-0 z-10 flex items-center justify-between border-b border-transparent dark:border-gray-800">
            <div className="flex items-center gap-2">
                <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <ScopeToggle />
            </div>
        </header>

        <main className="p-4 max-end mx-auto space-y-4">
            
            {/* Filter Controls */}
            <div className="flex flex-col gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
               {/* Date navigation */}
               <div className="flex items-center gap-1.5">
                 <button
                   onClick={() => shiftPeriod('prev')}
                   title="Periodo precedente"
                   className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition-colors shrink-0"
                 >
                   <ChevronLeft className="w-4 h-4" />
                 </button>
                 <div className="flex items-center gap-1 flex-1 min-w-0">
                   <input
                     type="date"
                     value={pendingRange.start}
                     onChange={(e) => setPendingRange({ ...pendingRange, start: e.target.value })}
                     className="text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer w-full min-w-0"
                   />
                   <span className="text-gray-400 text-xs shrink-0">—</span>
                   <input
                     type="date"
                     value={pendingRange.end}
                     onChange={(e) => setPendingRange({ ...pendingRange, end: e.target.value })}
                     className="text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer w-full min-w-0"
                   />
                 </div>
                 <button
                   onClick={() => shiftPeriod('next')}
                   title="Periodo successivo"
                   className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition-colors shrink-0"
                 >
                   <ChevronRight className="w-4 h-4" />
                 </button>
                 <div className="flex items-center gap-0.5 shrink-0">
                   <button
                     onClick={resetToCurrentPeriod}
                     title="Ripristina periodo corrente"
                     className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                   >
                     <RotateCcw className="w-3.5 h-3.5" />
                   </button>
                   <button
                     onClick={() => { if (rangeIsDirty) setRange(pendingRange); }}
                     title="Applica intervallo personalizzato"
                     disabled={!rangeIsDirty}
                     className={clsx(
                       "p-1.5 rounded-lg transition-colors",
                       rangeIsDirty
                         ? "text-white bg-blue-600 hover:bg-blue-700"
                         : "text-gray-300 dark:text-gray-600 cursor-default"
                     )}
                   >
                     <Check className="w-3.5 h-3.5" />
                   </button>
                 </div>
               </div>
               {/* Saldo/Entrate/Uscite toggle */}
               <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  <button 
                      onClick={() => setFilterType('saldo')} 
                      className={clsx("flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-all", filterType === 'saldo' ? "bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}
                  >
                      Saldo
                  </button>
                  <button 
                      onClick={() => setFilterType('entrata')} 
                      className={clsx("flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-all", filterType === 'entrata' ? "bg-white dark:bg-gray-700 shadow text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}
                  >
                      Entrate
                  </button>
                  <button 
                      onClick={() => setFilterType('spesa')} 
                      className={clsx("flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-all", filterType === 'spesa' ? "bg-white dark:bg-gray-700 shadow text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}
                  >
                      Uscite
                  </button>
               </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400">Caricamento grafico...</div>
            ) : chartDataForecast.length === 0 || chartDataForecast.every(d => d.value === 0) ? (
                <div className="text-center py-20 text-gray-400">Nessun dato per il periodo selezionato.</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Stats Box */}
                        <div className="p-6 rounded-xl border flex flex-col justify-center items-center bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm text-center">
                            
                            {/* Actual */}
                            <div className="mb-6">
                                <p className={clsx("text-xs uppercase tracking-wider font-bold mb-1", 
                                    filterType === 'saldo' ? "text-blue-600 dark:text-blue-400" : 
                                    filterType === 'entrata' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}>
                                    {filterType === 'saldo' ? 'Saldo Attuale' : filterType === 'entrata' ? 'Entrate Reali' : 'Uscite Reali'}
                                </p>
                                <p className={clsx("font-bold text-3xl", 
                                    filterType === 'saldo' ? (centerValues.actual >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") :
                                    filterType === 'entrata' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}>
                                    {filterType === 'saldo' && centerValues.actual > 0 ? '+' : ''}{formatCurrency(centerValues.actual)}
                                </p>
                            </div>

                            <div className="w-1/2 h-px bg-gray-100 dark:bg-gray-800 mb-6"></div>

                            {/* Forecast */}
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">
                                    {filterType === 'saldo' ? 'Previsto (Fine Mese)' : 'Totale Previsto'}
                                </p>
                                <p className={clsx("font-semibold text-xl", 
                                    filterType === 'saldo' ? (centerValues.forecast >= 0 ? "text-green-600/70 dark:text-green-400/70" : "text-red-600/70 dark:text-red-400/70") :
                                    filterType === 'entrata' ? "text-green-600/70 dark:text-green-400/70" : "text-red-600/70 dark:text-red-400/70"
                                )}>
                                    {filterType === 'saldo' && centerValues.forecast > 0 ? '+' : ''}{formatCurrency(centerValues.forecast)}
                                </p>
                            </div>
                        </div>

                        {/* Chart Card */}
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 h-64 relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    {/* Inner: Actual */}
                                    <Pie
                                        data={chartDataActual}
                                        innerRadius={50}
                                        outerRadius={65}
                                        paddingAngle={2}
                                        dataKey="value"
                                        nameKey="name"
                                        stroke="none"
                                    >
                                        {chartDataActual.map((entry, index) => (
                                            <Cell key={`cell-act-${index}`} fill={chartColorsInner[index % chartColorsInner.length]} />
                                        ))}
                                    </Pie>
                                    {/* Outer: Forecast */}
                                    <Pie
                                        data={chartDataForecast}
                                        innerRadius={70}
                                        outerRadius={85}
                                        paddingAngle={2}
                                        dataKey="value"
                                        nameKey="name"
                                        stroke="none"
                                    >
                                        {chartDataForecast.map((entry, index) => (
                                            <Cell key={`cell-for-${index}`} fill={chartColorsOuter[index % chartColorsOuter.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                      formatter={(value, name) => [formatCurrency(Number(value)), name]} 
                                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '8px' }}
                                      itemStyle={{ color: '#f3f4f6' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Details List */}
                    <div className="space-y-2">
                        {listData.sort((a,b) => Math.abs(b.actual) - Math.abs(a.actual)).map((item, index) => {
                            // Determine visual color marker
                            let color = '#ccc';
                            if (filterType === 'saldo') {
                                color = item.actual >= 0 ? '#10B981' : '#EF4444';
                            } else {
                                color = chartColorsInner[index % chartColorsInner.length];
                            }

                            return (
                                <div key={item.ambito} className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{item.ambito}</span>
                                        </div>
                                        <button 
                                            onClick={() => setDetailAmbito(item.ambito)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                        >
                                            <Info className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm pl-5">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Attuale</span>
                                             <span className={clsx("font-bold", 
                                                filterType === 'saldo' 
                                                    ? (item.actual >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
                                                    : "text-gray-800 dark:text-gray-100"
                                            )}>
                                                {formatCurrency(item.actual)}
                                            </span>
                                        </div>
                                        {Math.abs(item.forecast - item.actual) > 0.01 && (
                                            <div className="flex flex-col text-right">
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Previsto</span>
                                                <span className={clsx("font-medium", 
                                                    filterType === 'saldo' 
                                                        ? (item.forecast >= 0 ? "text-green-600/70 dark:text-green-400/70" : "text-red-600/70 dark:text-red-400/70")
                                                        : "text-gray-500 dark:text-gray-400"
                                                )}>
                                                    {formatCurrency(item.forecast)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Detail Modal */}
            {detailAmbito && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 rounded-t-xl z-10">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                {detailAmbito}
                                <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
                                    ({filterType === 'saldo' ? 'Tutto' : filterType === 'entrata' ? 'Solo Entrate' : 'Solo Uscite'})
                                </span>
                            </h3>
                            <button onClick={() => setDetailAmbito(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto space-y-3">
                            {transactions
                                .filter(t => {
                                    if (t.ambito !== detailAmbito) return false;
                                    if (filterType === 'spesa' && t.tipo_transazione !== 'spesa') return false;
                                    if (filterType === 'entrata' && t.tipo_transazione !== 'entrata') return false;
                                    return true;
                                })
                                .sort((a,b) => new Date(b.data_spesa).getTime() - new Date(a.data_spesa).getTime())
                                .map((t, idx) => (
                                    <div key={t.id || idx} className="flex justify-between items-center py-2 border-b border-dashed border-gray-100 dark:border-gray-800 last:border-0">
                                        <div className="flex items-start gap-3">
                                            <div className={clsx("mt-1 p-2 rounded-full",
                                                t.tipo_transazione === 'entrata' ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                            )}>
                                                <Receipt className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm line-clamp-1">{t.negozio}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(t.data_spesa).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                                    {t.note_spese && ` • ${t.note_spese}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={clsx("font-bold text-sm", 
                                                t.tipo_transazione === 'entrata' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                                                !t.confermata && "opacity-60"
                                            )}>
                                                {t.tipo_transazione === 'entrata' ? '+' : '-'}{formatCurrency(t.importo)}
                                            </p>
                                            {!t.confermata && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">Previsto</span>}
                                        </div>
                                    </div>
                                ))
                            }
                            {transactions.filter(t => {
                                if (t.ambito !== detailAmbito) return false;
                                if (filterType === 'spesa' && t.tipo_transazione !== 'spesa') return false;
                                if (filterType === 'entrata' && t.tipo_transazione !== 'entrata') return false;
                                return true;
                            }).length === 0 && (
                                <div className="text-center py-10 text-gray-400 text-sm">Nessuna transazione trovata per i filtri correnti.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
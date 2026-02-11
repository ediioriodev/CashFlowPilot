"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { expenseService } from "@/services/expenseService";
import { Spesa } from "@/types/expenses";
import { useScope } from "@/context/ScopeContext";
import { getCurrentMonthRange, formatCurrency, formatDateForAPI } from "@/lib/formatUtils";
import { Info, Receipt, X } from "lucide-react";
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
  const [filterType, setFilterType] = useState<'saldo' | 'spesa' | 'entrata'>('saldo');
  const [detailAmbito, setDetailAmbito] = useState<string | null>(null);

  // 1. Fetch data
  useEffect(() => {
    if (!isInitialized) return;

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
  }, [range, scope, isInitialized]);

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
      const actualTxs = transactions.filter(e => e.confermata && e.data_spesa <= today);
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

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; 
    if (!val) return;
    const [year, month] = val.split('-');
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0);
    
    setRange({
      start: formatDateForAPI(start),
      end: formatDateForAPI(end)
    });
  };

  const chartColorsInner = filterType === 'saldo' ? SALDO_COLORS : COLORS;
  const chartColorsOuter = filterType === 'saldo' ? SALDO_FORECAST_COLORS : COLORS_FORECAST;

  return (
    <ProtectedRoute>
      <div className={clsx("min-h-screen pb-20 transition-colors duration-300", scope === 'P' ? "bg-gray-50/90" : "bg-gray-50")}>
        <main className="p-4 max-w-2xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Analisi</h1>

            
            {/* Filter Controls */}
            <div className="flex flex-col gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
               <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                 <input 
                    type="month" 
                    value={range.start.substring(0, 7)}
                    onChange={handleMonthChange}
                    className="font-bold text-gray-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                 />
                 <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                    <button 
                        onClick={() => setFilterType('saldo')} 
                        className={clsx("flex-1 sm:flex-none px-3 py-1 text-xs font-semibold rounded-md transition-all", filterType === 'saldo' ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        Saldo
                    </button>
                    <button 
                        onClick={() => setFilterType('entrata')} 
                        className={clsx("flex-1 sm:flex-none px-3 py-1 text-xs font-semibold rounded-md transition-all", filterType === 'entrata' ? "bg-white shadow text-green-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        Entrate
                    </button>
                    <button 
                        onClick={() => setFilterType('spesa')} 
                        className={clsx("flex-1 sm:flex-none px-3 py-1 text-xs font-semibold rounded-md transition-all", filterType === 'spesa' ? "bg-white shadow text-red-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        Uscite
                    </button>
                 </div>
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
                        <div className="p-6 rounded-xl border flex flex-col justify-center items-center bg-white border-gray-100 shadow-sm text-center">
                            
                            {/* Actual */}
                            <div className="mb-6">
                                <p className={clsx("text-xs uppercase tracking-wider font-bold mb-1", 
                                    filterType === 'saldo' ? "text-blue-600" : 
                                    filterType === 'entrata' ? "text-green-600" : "text-red-600"
                                )}>
                                    {filterType === 'saldo' ? 'Saldo Attuale' : filterType === 'entrata' ? 'Entrate Reali' : 'Uscite Reali'}
                                </p>
                                <p className={clsx("font-bold text-3xl", 
                                    filterType === 'saldo' ? (centerValues.actual >= 0 ? "text-green-600" : "text-red-600") :
                                    filterType === 'entrata' ? "text-green-600" : "text-red-600"
                                )}>
                                    {filterType === 'saldo' && centerValues.actual > 0 ? '+' : ''}{formatCurrency(centerValues.actual)}
                                </p>
                            </div>

                            <div className="w-1/2 h-px bg-gray-100 mb-6"></div>

                            {/* Forecast */}
                            <div>
                                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">
                                    {filterType === 'saldo' ? 'Previsto (Fine Mese)' : 'Totale Previsto'}
                                </p>
                                <p className={clsx("font-semibold text-xl", 
                                    filterType === 'saldo' ? (centerValues.forecast >= 0 ? "text-green-600/70" : "text-red-600/70") :
                                    filterType === 'entrata' ? "text-green-600/70" : "text-red-600/70"
                                )}>
                                    {filterType === 'saldo' && centerValues.forecast > 0 ? '+' : ''}{formatCurrency(centerValues.forecast)}
                                </p>
                            </div>
                        </div>

                        {/* Chart Card */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-64 relative flex items-center justify-center">
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
                                    <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
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
                                <div key={item.ambito} className="bg-white p-3 rounded-lg border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                            <span className="font-medium text-gray-700">{item.ambito}</span>
                                        </div>
                                        <button 
                                            onClick={() => setDetailAmbito(item.ambito)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Info className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm pl-5">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 uppercase">Attuale</span>
                                             <span className={clsx("font-bold", 
                                                filterType === 'saldo' 
                                                    ? (item.actual >= 0 ? "text-green-600" : "text-red-600")
                                                    : "text-gray-800"
                                            )}>
                                                {formatCurrency(item.actual)}
                                            </span>
                                        </div>
                                        {Math.abs(item.forecast - item.actual) > 0.01 && (
                                            <div className="flex flex-col text-right">
                                                <span className="text-[10px] text-gray-400 uppercase">Previsto</span>
                                                <span className={clsx("font-medium", 
                                                    filterType === 'saldo' 
                                                        ? (item.forecast >= 0 ? "text-green-600/70" : "text-red-600/70")
                                                        : "text-gray-500"
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
                        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-xl z-10">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                {detailAmbito}
                                <span className="text-sm font-normal text-gray-400">
                                    ({filterType === 'saldo' ? 'Tutto' : filterType === 'entrata' ? 'Solo Entrate' : 'Solo Uscite'})
                                </span>
                            </h3>
                            <button onClick={() => setDetailAmbito(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
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
                                    <div key={t.id || idx} className="flex justify-between items-center py-2 border-b border-dashed border-gray-100 last:border-0">
                                        <div className="flex items-start gap-3">
                                            <div className={clsx("mt-1 p-2 rounded-full",
                                                t.tipo_transazione === 'entrata' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                            )}>
                                                <Receipt className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm line-clamp-1">{t.negozio}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(t.data_spesa).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                                    {t.note_spese && ` • ${t.note_spese}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={clsx("font-bold text-sm", 
                                                t.tipo_transazione === 'entrata' ? "text-green-600" : "text-red-600",
                                                !t.confermata && "opacity-60"
                                            )}>
                                                {t.tipo_transazione === 'entrata' ? '+' : '-'}{formatCurrency(t.importo)}
                                            </p>
                                            {!t.confermata && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Previsto</span>}
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
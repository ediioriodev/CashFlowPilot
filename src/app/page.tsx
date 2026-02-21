"use client";

import { useState, useEffect, useRef } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ScopeToggle from "@/components/ui/ScopeToggle";
import { useAuth } from "@/context/AuthContext";
import { useScope } from "@/context/ScopeContext";
import { 
  PlusCircle, 
  List, 
  PieChart as PieChartIcon, 
  Settings, 
  LogOut, 
  Wallet,
  User,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { expenseService } from "@/services/expenseService";
import { userService } from "@/services/userService";
import { getCurrentMonthRange, formatCurrency, getCustomPeriodRange } from "@/lib/formatUtils";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const { user, profile, signOut } = useAuth();
  const { scope, isInitialized } = useScope();
  
  // State for menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // State for Chart
  const [stats, setStats] = useState({ 
    actual: { entrate: 0, uscite: 0 }, 
    forecast: { entrate: 0, uscite: 0 } 
  });
  const [loading, setLoading] = useState(true);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch stats for the current month
  useEffect(() => {
    // Don't fetch until scope is definitively loaded from localStorage
    if (!isInitialized) return;

    let isCurrent = true;

    const fetchStats = async () => {
      try {
        setLoading(true);

        // Se le impostazioni non sono ancora caricate dal context, aspetta. 
        // Ma per evitare blocchi infiniti, usiamo un default locale se settings è null ma user c'è.
        // In realtà, possiamo chiamare getSettings() direttamente qui come fallback se il context è lento,
        // ma è meglio attendere il context se possibile o usare la query diretta.
        
        // FIX: Usiamo una chiamata diretta per sicurezza, dato che questo useEffect dipende da scope cambiata
        const settings = await userService.getSettings();
        let start, end;

        if (settings.custom_period_active) {
            const today = new Date();
            let targetMonth = today.getMonth();
            let targetYear = today.getFullYear();
          
            // If today is past the start day, we are in the period ending NEXT month
            if (today.getDate() >= settings.custom_period_start_day) {
                targetMonth++;
                if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear++;
                }
            }
            const range = getCustomPeriodRange(targetYear, targetMonth, settings.custom_period_start_day, true);
            start = range.start;
            end = range.end;
        } else {
            const range = getCurrentMonthRange();
            start = range.start;
            end = range.end;
        }

        const expenses = await expenseService.getExpenses(start, end, scope);
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Actual: Confirmed AND <= Today
        const actualEntrate = expenses
          .filter(t => t.tipo_transazione === 'entrata' && t.confermata && t.data_spesa <= todayStr)
          .reduce((sum, t) => sum + t.importo, 0);
          
        const actualUscite = expenses
          .filter(t => t.tipo_transazione === 'spesa' && t.confermata && t.data_spesa <= todayStr)
          .reduce((sum, t) => sum + t.importo, 0);

        // Forecast: All expenses in month (Predicted)
        const forecastEntrate = expenses
          .filter(t => t.tipo_transazione === 'entrata')
          .reduce((sum, t) => sum + t.importo, 0);

        const forecastUscite = expenses
          .filter(t => t.tipo_transazione === 'spesa')
          .reduce((sum, t) => sum + t.importo, 0);

        // Ignore result if a newer fetch has already started
        if (!isCurrent) return;

        setStats({ 
            actual: { entrate: actualEntrate, uscite: actualUscite },
            forecast: { entrate: forecastEntrate, uscite: forecastUscite }
        });
      } catch (error) {
        if (isCurrent) console.error("Error fetching stats:", error);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchStats();

    // Cleanup: mark this run as stale when scope changes or component unmounts
    return () => { isCurrent = false; };
  }, [scope, isInitialized]);

  const menuItems = [
    { name: "Nuova Transazione", icon: PlusCircle, href: "/spese/nuova", color: scope === 'C' ? "bg-blue-600" : "bg-indigo-600" },
    { name: "Storico", icon: List, href: "/spese", color: "bg-emerald-600" },
    { name: "Analisi", icon: PieChartIcon, href: "/analisi", color: "bg-purple-600" },
  ];

  const chartDataActual = [
    { name: 'Entrate (Reali)', value: stats.actual.entrate },
    { name: 'Uscite (Reali)', value: stats.actual.uscite }
  ];

  const chartDataForecast = [
    { name: 'Entrate (Previste)', value: stats.forecast.entrate },
    { name: 'Uscite (Previste)', value: stats.forecast.uscite }
  ];
  
  const COLORS = ['#10B981', '#EF4444']; // Emerald-500, Red-500
  const COLORS_FORECAST = ['#6EE7B7', '#FCA5A5']; // Emerald-300, Red-300

  const saldo = stats.actual.entrate - stats.actual.uscite;
  const saldoPrevisto = stats.forecast.entrate - stats.forecast.uscite;

  return (
    <ProtectedRoute>
      <div className={`min-h-screen pb-20 transition-colors duration-500 ${scope === 'P' ? 'bg-gray-50/90 dark:bg-gray-950/90' : 'bg-gray-50 dark:bg-gray-950'}`}>
        {/* Header removed - using global Header */}

        <main className="p-4 max-w-4xl mx-auto space-y-6">
          {/* Welcome Card & Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              Ciao, {profile ? (profile.first_name || user?.email?.split('@')[0]) : <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>}
            </h2>
            <div className="text-gray-500 dark:text-gray-400 mt-1">
                {profile ? (
                  <span>
                    Stai visualizzando il portafoglio <span className="font-bold">{scope === 'C' ? (profile.group_name || 'di Gruppo') : (profile.first_name || 'Personale') }</span>.
                  </span>
                ) : (
                  <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
                )}
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Balance Box */}
                <div className={`p-6 rounded-xl border flex flex-col justify-between h-full transition-colors duration-300 ${scope === 'C' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' : 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30'}`}>
                    
                    {/* Actual Balance */}
                    <div className="flex flex-col items-center justify-center">
                      <span className={`font-medium mb-1 uppercase tracking-wider text-xs ${scope === 'C' ? 'text-blue-600 dark:text-blue-400' : 'text-indigo-600 dark:text-indigo-400'}`}>Bilancio Attuale</span>
                      <span className={`text-3xl font-bold ${scope === 'C' ? 'text-blue-800 dark:text-blue-200' : 'text-indigo-800 dark:text-indigo-200'}`}>
                          {loading ? "..." : formatCurrency(saldo)}
                      </span>
                      
                      <div className="w-full grid grid-cols-2 gap-4 text-center mt-2">
                        <div>
                          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wide">Entrate Reali</span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">{formatCurrency(stats.actual.entrate)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-red-500 dark:text-red-400 uppercase font-bold tracking-wide">Uscite Reali</span>
                          <span className="text-red-700 dark:text-red-300 font-semibold text-sm">{formatCurrency(stats.actual.uscite)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-px bg-gray-200/50 dark:bg-gray-700/50 my-4"></div>

                    {/* Forecast Balance */}
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-medium mb-1 uppercase tracking-wider text-xs text-gray-500 dark:text-gray-400">Fine Mese (Previsto)</span>
                      <span className="text-xl font-bold text-gray-600 dark:text-gray-300">
                          {loading ? "..." : formatCurrency(saldoPrevisto)}
                      </span>
                      
                      <div className="w-full grid grid-cols-2 gap-4 text-center mt-2">
                        <div>
                          <span className="block text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase font-bold tracking-wide">Previste</span>
                          <span className="text-emerald-700/80 dark:text-emerald-300/80 font-semibold text-sm">{formatCurrency(stats.forecast.entrate)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-red-500/70 dark:text-red-400/70 uppercase font-bold tracking-wide">Previste</span>
                          <span className="text-red-700/80 dark:text-red-300/80 font-semibold text-sm">{formatCurrency(stats.forecast.uscite)}</span>
                        </div>
                      </div>
                    </div>

                </div>

                {/* Chart Section */}
                <div className="h-56 relative border border-gray-100 dark:border-gray-800 rounded-xl p-2 bg-white dark:bg-gray-900 overflow-hidden">
                   {loading ? (
                         <div className="flex items-center justify-center h-full w-full">
                           <div className="rounded-full bg-gray-200 dark:bg-gray-800 h-32 w-32 animate-pulse"></div>
                         </div>
                    ) : (stats.forecast.entrate === 0 && stats.forecast.uscite === 0) ? (
                        <div className="flex items-center justify-center h-full w-full text-center p-4">
                          <div>
                            <PieChartIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-400 dark:text-gray-500 text-sm">Nessuna transazione prevista</p>
                          </div>
                        </div>
                    ) : (
                        <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                {/* Inner Ring: Actuals */}
                                <Pie
                                    data={chartDataActual}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartDataActual.map((entry, index) => (
                                    <Cell key={`cell-actual-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie> 
                                {/* Outer Ring: Forecast */}
                                <Pie
                                    data={chartDataForecast}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={75}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartDataForecast.map((entry, index) => (
                                    <Cell key={`cell-forecast-${index}`} fill={COLORS_FORECAST[index % COLORS_FORECAST.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value, name) => [formatCurrency(value as number), name]} 
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1f2937', color: '#f3f4f6' }}
                                  itemStyle={{ color: '#f3f4f6' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Grid Menu */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                className="group flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 transition-all active:scale-95"
              >
                <div className={`p-3 rounded-full mb-3 text-white transition-all duration-300 group-hover:scale-110 ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.name}</span>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

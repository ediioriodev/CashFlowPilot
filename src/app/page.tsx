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
import { getCurrentMonthRange, formatCurrency } from "@/lib/formatUtils";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const { user, signOut } = useAuth();
  const { scope } = useScope();
  
  // State for menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // State for Chart
  const [stats, setStats] = useState({ 
    actual: { entrate: 0, uscite: 0 }, 
    forecast: { entrate: 0, uscite: 0 } 
  });
  const [loading, setLoading] = useState(true);

  // State for User Name
  const [firstName, setFirstName] = useState<string>("");
  const [groupName, setGroupName] = useState<string>("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users_group')
          .select('*')
          .eq('user_id', user.id);
          
        if (userData && userData.length > 0) {
          setFirstName(userData[0].first_name);

          if (userData[0].group_id) {
            const { data: groupData } = await supabase
              .from('groups_account')
              .select('*')
              .eq('id', userData[0].group_id);
              
            if (groupData && groupData.length > 0) {
              setGroupName(groupData[0].group_name);
            }
          }
        }
      }
    };
    fetchUserProfile();
  }, [user]);

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
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { start, end } = getCurrentMonthRange();
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

        setStats({ 
            actual: { entrate: actualEntrate, uscite: actualUscite },
            forecast: { entrate: forecastEntrate, uscite: forecastUscite }
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [scope]);

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
      <div className={`min-h-screen pb-20 transition-colors duration-500 ${scope === 'P' ? 'bg-gray-50/90' : 'bg-gray-50'}`}>
        {/* Header removed - using global Header */}

        <main className="p-4 max-w-4xl mx-auto space-y-6">
          {/* Welcome Card & Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-800">
              Ciao, {firstName || user?.email?.split('@')[0]}
            </h2>
            <p className="text-gray-500 mt-1">
                Stai visualizzando il portafoglio <span className="font-bold">{scope === 'C' ? (groupName || 'di Gruppo') : (firstName || 'Personale') }</span>.
            </p>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Balance Box */}
                <div className={`p-6 rounded-xl border flex flex-col justify-between h-full transition-colors duration-300 ${scope === 'C' ? 'bg-blue-50 border-blue-100' : 'bg-indigo-50 border-indigo-100'}`}>
                    
                    {/* Actual Balance */}
                    <div className="flex flex-col items-center justify-center">
                      <span className={`font-medium mb-1 uppercase tracking-wider text-xs ${scope === 'C' ? 'text-blue-600' : 'text-indigo-600'}`}>Bilancio Attuale</span>
                      <span className={`text-3xl font-bold ${scope === 'C' ? 'text-blue-800' : 'text-indigo-800'}`}>
                          {loading ? "..." : formatCurrency(saldo)}
                      </span>
                      
                      <div className="w-full grid grid-cols-2 gap-4 text-center mt-2">
                        <div>
                          <span className="block text-[10px] text-emerald-600 uppercase font-bold tracking-wide">Entrate Reali</span>
                          <span className="text-emerald-700 font-semibold text-sm">{formatCurrency(stats.actual.entrate)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-red-500 uppercase font-bold tracking-wide">Uscite Reali</span>
                          <span className="text-red-700 font-semibold text-sm">{formatCurrency(stats.actual.uscite)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-px bg-gray-200/50 my-4"></div>

                    {/* Forecast Balance */}
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-medium mb-1 uppercase tracking-wider text-xs text-gray-500">Fine Mese (Previsto)</span>
                      <span className="text-xl font-bold text-gray-600">
                          {loading ? "..." : formatCurrency(saldoPrevisto)}
                      </span>
                      
                      <div className="w-full grid grid-cols-2 gap-4 text-center mt-2">
                        <div>
                          <span className="block text-[10px] text-emerald-600/70 uppercase font-bold tracking-wide">Previste</span>
                          <span className="text-emerald-700/80 font-semibold text-sm">{formatCurrency(stats.forecast.entrate)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-red-500/70 uppercase font-bold tracking-wide">Previste</span>
                          <span className="text-red-700/80 font-semibold text-sm">{formatCurrency(stats.forecast.uscite)}</span>
                        </div>
                      </div>
                    </div>

                </div>

                {/* Chart Section */}
                <div className="h-full min-h-[14rem] relative border border-gray-100 rounded-xl p-2 bg-white flex items-center justify-center">
                   {loading ? (
                         <div className="animate-pulse flex items-center justify-center h-full w-full">
                           <div className="rounded-full bg-gray-200 h-32 w-32"></div>
                         </div>
                    ) : (stats.forecast.entrate === 0 && stats.forecast.uscite === 0) ? (
                        <div className="text-center p-4">
                          <PieChartIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">Nessuna transazione prevista</p>
                        </div>
                    ) : (
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
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
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
                className="group flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all active:scale-95"
              >
                <div className={`p-3 rounded-full mb-3 text-white transition-all duration-300 group-hover:scale-110 ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">{item.name}</span>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

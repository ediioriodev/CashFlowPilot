"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { UserSettings } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useScope } from "@/context/ScopeContext";
import { Shield, Moon, Wallet, Receipt } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";

export default function ImpostazioniPage() {
  const { settings, updateSettings, loading } = useAuth();
  const { toggleTheme, isDarkMode } = useTheme();
  const { refreshScope } = useScope();

  // Handle other settings updates normally
  const handleUpdate = async (key: keyof UserSettings, value: any) => {
    if (!settings) return;
    
    // Use dedicated theme toggle for dark mode
    if (key === 'dark_mode') {
        await toggleTheme();
        return;
    }
    
    // Validation for Portfolio Visibility
    if ((key === 'show_personal_expenses' || key === 'show_shared_expenses') && value === false) {
      const otherKey = key === 'show_personal_expenses' ? 'show_shared_expenses' : 'show_personal_expenses';
      
      if (!settings[otherKey]) {
         toast.error("Devi mantenere visibile almeno un portafoglio.");
         return; 
      }
    }

    try {
      await updateSettings({ [key]: value });
      
      // Refresh scope context if visibility changed
      if (key === 'show_personal_expenses' || key === 'show_shared_expenses') {
        await refreshScope();
      }
    } catch (error) {
      console.error(error);
      toast.error("Errore durante l'aggiornamento delle impostazioni");
    }
  };

  if (loading || !settings) return <div className="text-center p-10">Caricamento...</div>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-20 dark:bg-gray-950">
        <main className="max-w-lg mx-auto mt-4 space-y-4 px-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Impostazioni</h1>
            
            {/* Wallet Visibility Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200">Portafogli</h2>
                </div>
                
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Portafoglio Personale</span>
                        <Toggle 
                            checked={settings.show_personal_expenses} 
                            onChange={(v) => handleUpdate('show_personal_expenses', v)} 
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Portafoglio Condiviso</span>
                        <Toggle 
                            checked={settings.show_shared_expenses} 
                            onChange={(v) => handleUpdate('show_shared_expenses', v)} 
                        />
                    </div>
                </div>
            </div>

            {/* General Settings */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200">Generali</h2>
                </div>
                
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Conferma Eliminazione</span>
                        <Toggle 
                            checked={settings.del_confirm} 
                            onChange={(v) => handleUpdate('del_confirm', v)} 
                        />
                    </div>
                </div>
            </div>

            {/* Periodo Fiscale */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200">Periodo Fiscale</h2>
                </div>
                
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                           <span className="block text-gray-700 dark:text-gray-300">Periodo Personalizzato</span>
                           <span className="text-xs text-gray-400 dark:text-gray-500">Attiva per cambiare il giorno di inizio del mese.</span>
                        </div>
                        <Toggle 
                            checked={Boolean(settings.custom_period_active)} 
                            onChange={(v) => handleUpdate('custom_period_active', v)} 
                        />
                    </div>
                    
                    {settings.custom_period_active && (
                       <div className="flex items-center justify-between mt-4 pl-2 border-l-2 border-green-100 dark:border-green-900">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Giorno di Inizio Mese</span>
                          <select
                            value={settings.custom_period_start_day || 1}
                            onChange={(e) => handleUpdate('custom_period_start_day', Number(e.target.value))}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-sm focus:outline-green-500 text-gray-900 dark:text-gray-100"
                          >
                             {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                <option key={day} value={day}>{day}</option>
                             ))}
                          </select>
                       </div>
                    )}
                </div>
            </div>

             {/* Dark Mode */}
             <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200">Aspetto</h2>
                </div>
                <div className="p-4 flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Tema Scuro</span>
                    <Toggle 
                        checked={isDarkMode} 
                        onChange={() => toggleTheme()} 
                    />
                </div>
            </div>

        </main>
      </div>
    </ProtectedRoute>
  );
}

function Toggle({ checked, onChange, disabled = false }: { checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }) {
    return (
        <button 
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={clsx(
                "w-12 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none",
                checked ? "bg-blue-600 dark:bg-blue-500" : "bg-gray-300 dark:bg-gray-600",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <div 
                className={clsx(
                    "w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200 ease-in-out",
                    checked ? "translate-x-7" : "translate-x-1"
                )}
            />
        </button>
    );
}

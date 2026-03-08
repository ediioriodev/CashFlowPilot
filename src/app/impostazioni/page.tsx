"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { UserSettings } from "@/services/userService";
import { notificationService } from "@/services/notificationService";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useScope } from "@/context/ScopeContext";
import { Shield, Moon, Wallet, Receipt, Bell, BellOff, Clock } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function ImpostazioniPage() {
  const { settings, updateSettings, loading } = useAuth();
  const { toggleTheme, isDarkMode } = useTheme();
  const { refreshScope } = useScope();

  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [notifLoading, setNotifLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSInstalled, setIsIOSInstalled] = useState(false);

  useEffect(() => {
    setNotifPermission(notificationService.getPermissionState());
    if (typeof window !== 'undefined') {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setIsIOS(ios);
      // PWA installed check: standalone mode
      setIsIOSInstalled((window.navigator as any).standalone === true);
    }
  }, []);

  const handleNotificationToggle = async (enable: boolean) => {
    setNotifLoading(true);
    try {
      if (enable) {
        const result = await notificationService.enableNotifications();
        if (result.success) {
          toast.success('Notifiche push attivate!');
          setNotifPermission('granted');
          await updateSettings({ notifications_enabled: true });
        } else {
          toast.error(result.error || 'Errore attivazione notifiche');
        }
      } else {
        await notificationService.unsubscribe();
        await updateSettings({ notifications_enabled: false });
        setNotifPermission(notificationService.getPermissionState());
        toast.success('Notifiche disattivate');
      }
    } catch (e) {
      console.error(e);
      toast.error('Errore durante la gestione delle notifiche');
    } finally {
      setNotifLoading(false);
    }
  };

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

            {/* Notifiche */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200">Notifiche Push</h2>
                </div>

                <div className="p-4 space-y-3">
                  {/* iOS not installed banner */}
                  {isIOS && !isIOSInstalled && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
                      <BellOff className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Su iOS le notifiche push funzionano solo se l&apos;app è installata. Usa <strong>Aggiungi alla schermata Home</strong> da Safari.</span>
                    </div>
                  )}

                  {/* Denied banner */}
                  {notifPermission === 'denied' && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                      <BellOff className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Il permesso è stato negato. Abilitalo nelle impostazioni del browser / sistema.</span>
                    </div>
                  )}

                  {/* Unsupported banner */}
                  {notifPermission === 'unsupported' && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                      Notifiche push non supportate su questo browser/dispositivo.
                    </div>
                  )}

                  {notifPermission !== 'unsupported' && (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block text-gray-700 dark:text-gray-300">Attiva Notifiche Push</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">Ricevi avvisi per i promemoria anche a schermo spento.</span>
                      </div>
                      <Toggle
                        checked={!!(settings?.notifications_enabled && notifPermission === 'granted')}
                        onChange={handleNotificationToggle}
                        disabled={notifLoading || notifPermission === 'denied'}
                      />
                    </div>
                  )}

                  {/* Recurring expense notifications sub-section */}
                  {settings?.notifications_enabled && notifPermission === 'granted' && (
                    <div className="mt-2 space-y-3 pl-2 border-l-2 border-orange-100 dark:border-orange-900">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="block text-sm text-gray-700 dark:text-gray-300">Spese Ricorrenti da Confermare</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">Ricevi una notifica se hai spese ricorrenti in sospeso.</span>
                        </div>
                        <Toggle
                          checked={!!settings.recurring_notifications_enabled}
                          onChange={(v) => handleUpdate('recurring_notifications_enabled', v)}
                        />
                      </div>

                      {settings.recurring_notifications_enabled && (
                        <div className="flex items-center justify-between pl-2 border-l-2 border-orange-100 dark:border-orange-900">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Orario notifica</span>
                          </div>
                          <input
                            type="time"
                            value={(settings.notification_time ?? '19:30').substring(0, 5)}
                            onChange={(e) => handleUpdate('notification_time', e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      )}
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

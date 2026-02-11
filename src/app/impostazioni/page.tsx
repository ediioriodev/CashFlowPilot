"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { userService, UserSettings } from "@/services/userService";
import { useScope } from "@/context/ScopeContext";
import { ArrowLeft, Bell, Trash2, Shield, Moon, Wallet } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

export default function ImpostazioniPage() {
  const { refreshScope } = useScope();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await userService.getSettings();
      setSettings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!settings) return;
    
    // Validation for Portfolio Visibility
    if ((key === 'show_personal_expenses' || key === 'show_shared_expenses') && value === false) {
      const otherKey = key === 'show_personal_expenses' ? 'show_shared_expenses' : 'show_personal_expenses';
      // If the other one is already false (should technically not happen if logic works) 
      // OR if we are about to make the current one false, we rely on the other one being true.
      if (!settings[otherKey]) {
         // Prevent turning off the last enabled scope
         // Since we don't have a toast library connected here (except sonner in layout, but not imported), alert is fallback
         // But wait, layout has Toaster. I can use toast from sonner.
         // Let's just prevent update for now silently or console.error, UI will just toggle back effectively if I don't update state.
         return; 
      }
    }

    // Optimistic update
    setSettings({ ...settings, [key]: value });

    try {
      await userService.updateSettings({ [key]: value });
      
      // Refresh scope context if visibility changed
      if (key === 'show_personal_expenses' || key === 'show_shared_expenses') {
        await refreshScope();
      }
    } catch (error) {
      console.error(error);
      // Revert on error
      loadSettings(); 
    }
  };

  if (loading || !settings) return <div className="text-center p-10">Caricamento...</div>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-20">
        <main className="max-w-lg mx-auto mt-4 space-y-4 px-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Impostazioni</h1>
            
            {/* Wallet Visibility Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-semibold text-gray-800">Portafogli</h2>
                </div>
                
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700">Portafoglio Personale</span>
                        <Toggle 
                            checked={settings.show_personal_expenses} 
                            onChange={(v) => updateSetting('show_personal_expenses', v)} 
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700">Portafoglio Condiviso</span>
                        <Toggle 
                            checked={settings.show_shared_expenses} 
                            onChange={(v) => updateSetting('show_shared_expenses', v)} 
                        />
                    </div>
                </div>
            </div>

            {/* Notification Section */}
            {/* <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <h2 className="font-semibold text-gray-800">Notifiche</h2>
                </div>
                
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700">Abilita Notifiche</span>
                        <Toggle 
                            checked={settings.notifications_enabled} 
                            onChange={(v) => updateSetting('notifications_enabled', v)} 
                        />
                    </div>
                    
                    {settings.notifications_enabled && (
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700">Orario promemoria</span>
                            <input 
                                type="time" 
                                value={settings.notification_time || "19:30"}
                                onChange={(e) => updateSetting('notification_time', e.target.value)}
                                className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 focus:outline-blue-500"
                            />
                        </div>
                    )}
                </div>
            </div> */}

            {/* General Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <h2 className="font-semibold text-gray-800">Generali</h2>
                </div>
                
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700">Conferma Eliminazione</span>
                        <Toggle 
                            checked={settings.del_confirm} 
                            onChange={(v) => updateSetting('del_confirm', v)} 
                        />
                    </div>
                </div>
            </div>

             {/* Dark Mode (Future Proofing UI) */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden opacity-50">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <Moon className="w-5 h-5 text-purple-600" />
                    <h2 className="font-semibold text-gray-800">Aspetto</h2>
                </div>
                <div className="p-4 flex items-center justify-between">
                    <span className="text-gray-700">Tema Scuro (Presto disponibile)</span>
                    <Toggle checked={settings.dark_mode} onChange={() => {}} disabled />
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
                checked ? "bg-blue-600" : "bg-gray-300",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <div 
                className={clsx(
                    "w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200 ease-in-out",
                    checked ? "left-7" : "left-1"
                )}
            />
        </button>
    );
}

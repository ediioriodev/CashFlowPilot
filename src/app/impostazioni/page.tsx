"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, CalendarRange, Clock, Moon, Wallet } from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import { Button, Card, CardHeader, Skeleton, Toggle, inputClass } from "@/components/ui/kit";
import { UserSettings } from "@/services/userService";
import { notificationService } from "@/services/notificationService";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useScope } from "@/context/ScopeContext";

export default function ImpostazioniPage() {
  const { settings, updateSettings, loading } = useAuth();
  const { toggleTheme, isDarkMode } = useTheme();
  const { refreshScope } = useScope();

  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSInstalled, setIsIOSInstalled] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    setNotifPermission(notificationService.getPermissionState());
    if (typeof window !== "undefined") {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setIsIOS(ios);
      setIsIOSInstalled((window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    }
  }, []);

  // Se il browser ha perso la sottoscrizione push (reinstallazione PWA,
  // aggiornamento) la ricreiamo in silenzio — ma solo se l'utente le voleva.
  const autoSubscribe = useCallback(async () => {
    if (notifPermission !== "granted" || !settings) return;
    if (!settings.notifications_enabled) return;
    try {
      if (!("serviceWorker" in navigator)) return;
      const registration = await navigator.serviceWorker.ready;
      if (await registration.pushManager.getSubscription()) return;
    } catch {
      return;
    }
    const result = await notificationService.enableNotifications();
    if (result.success) await updateSettings({ notifications_enabled: true });
  }, [notifPermission, settings, updateSettings]);

  useEffect(() => {
    autoSubscribe();
  }, [autoSubscribe]);

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (isSubscribing) return;
    setIsSubscribing(true);
    try {
      if (enabled) {
        const result = await notificationService.enableNotifications();
        if (result.success) {
          await updateSettings({ notifications_enabled: true });
          setNotifPermission("granted");
          toast.success("Notifiche push attivate");
        } else {
          toast.error(result.error ?? "Registrazione push non riuscita");
          setNotifPermission(notificationService.getPermissionState());
        }
      } else {
        await notificationService.unsubscribe();
        await updateSettings({ notifications_enabled: false });
        toast.success("Notifiche push disattivate");
      }
    } catch (err) {
      console.error(err);
      toast.error("Gestione delle notifiche non riuscita");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleUpdate = async <K extends keyof UserSettings>(key: K, value: UserSettings[K] | boolean) => {
    if (!settings) return;

    if (key === "dark_mode") {
      await toggleTheme();
      return;
    }

    if ((key === "show_personal_expenses" || key === "show_shared_expenses") && value === false) {
      const other = key === "show_personal_expenses" ? "show_shared_expenses" : "show_personal_expenses";
      if (!settings[other]) {
        toast.error("Devi tenere visibile almeno un portafoglio.");
        return;
      }
    }

    try {
      await updateSettings({ [key]: value });
      if (key === "show_personal_expenses" || key === "show_shared_expenses") await refreshScope();
    } catch (error) {
      console.error(error);
      toast.error("Aggiornamento non riuscito");
    }
  };

  if (loading || !settings) {
    return (
      <ProtectedRoute>
        <PageHeader title="Impostazioni" />
        <PageBody
          main={
            <>
              <Skeleton className="h-36 w-full rounded-card" />
              <Skeleton className="h-36 w-full rounded-card" />
              <Skeleton className="h-52 w-full rounded-card" />
            </>
          }
        />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageHeader title="Impostazioni" subtitle="Portafogli, periodo, notifiche e tema" backHref="/altro" />

      <PageBody
        main={
          <>
            {/* ---------- Portafogli ---------- */}
            <Card className="p-4 lg:p-5">
              <CardHeader
                title={<SectionTitle icon={Wallet}>Portafogli</SectionTitle>}
                hint="Quali portafogli puoi scegliere nel selettore (gruppo o solo tuo)."
              />
              <div className="flex flex-col">
                <SettingRow
                  label="Portafoglio personale"
                  desc="Le tue spese, visibili solo a te."
                  control={
                    <Toggle
                      checked={settings.show_personal_expenses}
                      onChange={(v) => handleUpdate("show_personal_expenses", v)}
                      label="Mostra il portafoglio personale"
                    />
                  }
                />
                <SettingRow
                  label="Portafoglio condiviso"
                  desc="Le spese del gruppo familiare."
                  control={
                    <Toggle
                      checked={settings.show_shared_expenses}
                      onChange={(v) => handleUpdate("show_shared_expenses", v)}
                      label="Mostra il portafoglio condiviso"
                    />
                  }
                />
              </div>
            </Card>

            {/* ---------- Periodo ---------- */}
            <Card className="p-4 lg:p-5">
              <CardHeader
                title={<SectionTitle icon={CalendarRange}>Periodo</SectionTitle>}
                hint="Vale per tutta l'app: Oggi, Movimenti, Analisi, Famiglia."
              />
              <div className="flex flex-col">
                <SettingRow
                  label="Periodo personalizzato"
                  desc="Se il tuo mese non inizia il 1°, per esempio dopo lo stipendio."
                  control={
                    <Toggle
                      checked={Boolean(settings.custom_period_active)}
                      onChange={(v) => handleUpdate("custom_period_active", v)}
                      label="Periodo personalizzato"
                    />
                  }
                />

                {settings.custom_period_active && (
                  <div className="anim-up mt-3 flex items-center justify-between gap-3 rounded-md border-l-2 border-accent bg-surface-2 p-3.5">
                    <label htmlFor="giorno-inizio" className="text-sm text-muted">
                      Il mese inizia il giorno
                    </label>
                    <select
                      id="giorno-inizio"
                      value={settings.custom_period_start_day || 1}
                      onChange={(e) => handleUpdate("custom_period_start_day", Number(e.target.value))}
                      className={`${inputClass} w-auto min-h-11`}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </Card>

            {/* ---------- Notifiche ---------- */}
            <Card className="p-4 lg:p-5">
              <CardHeader title={<SectionTitle icon={Bell}>Notifiche push</SectionTitle>} />

              <div className="flex flex-col gap-3">
                {isIOS && !isIOSInstalled && (
                  <Banner tone="warn">
                    Su iOS le notifiche funzionano solo con l&apos;app installata. Da Safari usa{" "}
                    <strong className="font-semibold">Aggiungi alla schermata Home</strong>.
                  </Banner>
                )}

                {notifPermission === "denied" && (
                  <Banner tone="neg">
                    Il permesso è stato negato. Riattivalo dalle impostazioni del dispositivo, poi torna qui.
                  </Banner>
                )}

                {notifPermission === "unsupported" && (
                  <Banner tone="neutral">Questo browser non supporta le notifiche push.</Banner>
                )}

                {notifPermission === "default" && !(isIOS && !isIOSInstalled) && (
                  <SettingRow
                    label="Attiva le notifiche"
                    desc="Servono per promemoria e spese ricorrenti da confermare."
                    control={
                      <Button
                        size="sm"
                        variant="primary"
                        loading={isSubscribing}
                        onClick={() => handleNotificationsToggle(true)}
                      >
                        Abilita
                      </Button>
                    }
                  />
                )}

                {notifPermission === "granted" && (
                  <>
                    <SettingRow
                      label="Notifiche push"
                      desc="Promemoria e avvisi sull'app."
                      control={
                        <Toggle
                          checked={!!settings.notifications_enabled}
                          onChange={handleNotificationsToggle}
                          label="Notifiche push"
                        />
                      }
                    />

                    {settings.notifications_enabled && (
                      <>
                        <SettingRow
                          label="Ricorrenti da confermare"
                          desc="Un avviso quando hai spese ricorrenti in sospeso."
                          control={
                            <Toggle
                              checked={!!settings.recurring_notifications_enabled}
                              onChange={(v) => handleUpdate("recurring_notifications_enabled", v)}
                              label="Avviso spese ricorrenti"
                            />
                          }
                        />

                        {settings.recurring_notifications_enabled && (
                          <div className="anim-up flex items-center justify-between gap-3 rounded-md border-l-2 border-accent bg-surface-2 p-3.5">
                            <label htmlFor="orario" className="flex items-center gap-2 text-sm text-muted">
                              <Clock className="h-4 w-4" aria-hidden />
                              Orario dell&apos;avviso
                            </label>
                            <input
                              id="orario"
                              type="time"
                              value={(settings.notification_time ?? "19:30").substring(0, 5)}
                              onChange={(e) => handleUpdate("notification_time", e.target.value)}
                              className={`${inputClass} w-auto min-h-11`}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </Card>

            {/* ---------- Aspetto ---------- */}
            <Card className="p-4 lg:p-5">
              <CardHeader title={<SectionTitle icon={Moon}>Aspetto</SectionTitle>} />
              <SettingRow
                label="Tema scuro"
                desc="Si salva sul tuo profilo e ti segue su ogni dispositivo."
                control={<Toggle checked={isDarkMode} onChange={() => toggleTheme()} label="Tema scuro" />}
              />
            </Card>
          </>
        }
      />
    </ProtectedRoute>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-accent" aria-hidden />
      {children}
    </span>
  );
}

function SettingRow({
  label,
  desc,
  control,
}: {
  label: string;
  desc?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-line py-3 [&+&]:border-t">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {desc && <p className="mt-0.5 text-xs leading-relaxed text-faint">{desc}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "warn" | "neg" | "neutral"; children: React.ReactNode }) {
  const styles = {
    warn: "bg-warn-soft text-warn",
    neg: "bg-neg-soft text-neg",
    neutral: "bg-surface-3 text-muted",
  }[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-md p-3.5 text-[13px] leading-relaxed ${styles}`}>
      <BellOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

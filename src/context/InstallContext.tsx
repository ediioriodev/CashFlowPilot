"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import InstallGuideModal from "@/components/install/InstallGuideModal";

/* ============================================================
   INSTALLAZIONE DELL'APP

   Il browser decide come si installa una PWA, e non tutti lo lasciano
   fare al sito:

   - Chrome, Edge, Samsung Internet (Android e desktop) lanciano
     beforeinstallprompt: chiamando prompt() si apre il dialogo nativo
     "Installa". È l'unico caso in cui basta davvero un tocco.
   - iOS/iPadOS non espone alcuna API: nessun sito può installarsi da
     solo. Il massimo è una guida che mostra dove toccare.
   - Firefox Android e i browser interni ad altre app (Instagram,
     WhatsApp…) non lanciano l'evento: anche lì una guida.

   L'evento viene trattenuto dallo script inline di layout.tsx, perché
   spesso arriva prima dell'idratazione; qui lo si raccoglie. Tutta la
   documentazione è in docs/installazione-app.md.
   ============================================================ */

/** L'evento non è nei tipi di TypeScript: esiste solo nei browser Chromium. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __cfpInstallEvt?: BeforeInstallPromptEvent | null;
    __cfpInstalled?: boolean;
  }
}

export type InstallPlatform =
  /** già aperta come app: non si propone nulla */
  | "installed"
  /** c'è l'evento: installazione con un tocco */
  | "prompt"
  /** iPhone/iPad: guida Condividi → Aggiungi alla schermata Home */
  | "ios"
  /** Android senza evento (Firefox, oppure già installata): guida dal menu */
  | "android-manual"
  /** browser interno di un'altra app: va aperta in Chrome o Safari */
  | "in-app-browser"
  /** desktop senza supporto (Safari macOS, Firefox): non si propone */
  | "unsupported";

export type InstallOutcome = "accepted" | "dismissed" | "guide";

/* ---------------- Rilevamento ---------------- */

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
  window.__cfpInstalled === true;

/** iPadOS da Safari si presenta come Mac: lo tradisce il touch. */
const isIOSDevice = (ua: string) =>
  /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

/** Browser interni ad altre app: non sanno installare né aggiungere alla Home. */
const isInAppBrowser = (ua: string) =>
  /FBAN|FBAV|FB_IAB|Instagram|Line\/|LinkedInApp|Twitter|WhatsApp|Telegram|Snapchat|MicroMessenger|; wv\)/i.test(ua);

function detectPlatform(): InstallPlatform {
  if (isStandalone()) return "installed";
  if (window.__cfpInstallEvt) return "prompt";
  const ua = navigator.userAgent;
  if (isInAppBrowser(ua)) return "in-app-browser";
  if (isIOSDevice(ua)) return "ios";
  if (/android/i.test(ua)) return "android-manual";
  return "unsupported";
}

/* ---------------- Banner di Oggi: rinvio ---------------- */

const SNOOZE_KEY = "install_banner_snooze_until";
const DISMISS_KEY = "install_banner_dismissals";
/** Dopo una chiusura il banner torna fra due settimane… */
const SNOOZE_DAYS = 14;
/** …ma dopo tre chiusure si smette di insistere: resta la voce in Altro. */
const MAX_DISMISSALS = 3;

function readBannerAllowed(): boolean {
  try {
    const dismissals = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissals >= MAX_DISMISSALS) return false;
    const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    return !until || Date.now() > until;
  } catch {
    /* storage non disponibile: si mostra, la X lo nasconde per la sessione */
    return true;
  }
}

/* ---------------- Context ---------------- */

interface InstallContextType {
  /** null finché non si è sul client: prima dell'idratazione non si sa nulla */
  platform: InstallPlatform | null;
  /** true se c'è qualcosa da proporre (un pulsante o una guida) */
  canInstall: boolean;
  /** true se basta un tocco: il dialogo nativo è disponibile */
  canOneTap: boolean;
  /** Installa con un tocco se si può, altrimenti apre la guida. */
  install: () => Promise<InstallOutcome>;
  openGuide: () => void;
  /** Il banner in Oggi va mostrato (non installata, non rimandato). */
  bannerVisible: boolean;
  dismissBanner: () => void;
}

const InstallContext = createContext<InstallContextType>({
  platform: null,
  canInstall: false,
  canOneTap: false,
  install: async () => "dismissed",
  openGuide: () => {},
  bannerVisible: false,
  dismissBanner: () => {},
});

export function InstallProvider({ children }: { children: React.ReactNode }) {
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [bannerAllowed, setBannerAllowed] = useState(false);

  useEffect(() => {
    const refresh = () => setPlatform(detectPlatform());
    const onInstalled = () => {
      refresh();
      setGuideOpen(false);
      toast.success("App installata: la trovi nella schermata Home");
    };

    refresh();
    setBannerAllowed(readBannerAllowed());

    // Chi apre l'app installata da un link resta nel browser, e viceversa:
    // la modalità di visualizzazione può cambiare a pagina aperta.
    const mq = window.matchMedia("(display-mode: standalone)");
    window.addEventListener("cfp:installable", refresh);
    window.addEventListener("cfp:installed", onInstalled);
    mq.addEventListener?.("change", refresh);
    return () => {
      window.removeEventListener("cfp:installable", refresh);
      window.removeEventListener("cfp:installed", onInstalled);
      mq.removeEventListener?.("change", refresh);
    };
  }, []);

  const openGuide = useCallback(() => setGuideOpen(true), []);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    const evt = window.__cfpInstallEvt;
    if (!evt) {
      setGuideOpen(true);
      return "guide";
    }
    // L'evento si usa una volta sola: dopo prompt() il browser non lo
    // riaccetta. Se l'utente rifiuta, Chrome ne lancia uno nuovo più avanti.
    window.__cfpInstallEvt = null;
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      return outcome;
    } catch {
      setGuideOpen(true);
      return "guide";
    } finally {
      setPlatform(detectPlatform());
    }
  }, []);

  const dismissBanner = useCallback(() => {
    setBannerAllowed(false);
    try {
      const dismissals = Number(localStorage.getItem(DISMISS_KEY) ?? 0) + 1;
      localStorage.setItem(DISMISS_KEY, String(dismissals));
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000));
    } catch {
      /* storage non disponibile: vale per la sessione */
    }
  }, []);

  const canInstall = platform !== null && platform !== "installed" && platform !== "unsupported";

  return (
    <InstallContext.Provider
      value={{
        platform,
        canInstall,
        canOneTap: platform === "prompt",
        install,
        openGuide,
        bannerVisible: canInstall && bannerAllowed,
        dismissBanner,
      }}
    >
      {children}
      <InstallGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        platform={platform}
      />
    </InstallContext.Provider>
  );
}

export const useInstall = () => useContext(InstallContext);

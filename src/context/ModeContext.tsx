"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { userService } from "@/services/userService";
import { useAuth } from "./AuthContext";

/* ============================================================
   SEMPLICE / AVANZATA

   Un interruttore che cambia QUANTO si vede, mai DOVE si trova:
   navigazione, posizioni e nomi restano identici. Il meccanismo è
   tutto qui e in due classi CSS (.simple-only / .adv-only): nessun
   ramo di codice duplicato, nessun componente che esiste in due
   versioni.

   Come per il tema, la verità sta nel DOM (attributo data-mode sulla
   radice, messo dallo script inline di layout.tsx prima della prima
   pittura) e React la legge come stato esterno.

   La preferenza segue l'account (users_group.view_mode), non il
   dispositivo. localStorage resta, ma come copia locale: serve a
   dipingere la schermata giusta prima che la risposta del database
   arrivi. Se le due divergono vince il database.
   ============================================================ */

export type ViewMode = "simple" | "advanced";

/** Modalità di partenza per chi non ha ancora scelto.
 *
 *  È "simple" come vuole design/DIREZIONE-A.md §4. Il passaggio da
 *  "advanced" è stato possibile solo dopo la migrazione 06, che scrive
 *  view_mode = 'advanced' su chi c'era prima: senza quel travaso,
 *  cambiare questa costante avrebbe fatto sparire dei blocchi a chi
 *  li usava ogni giorno. Chi si registra da ora nasce con view_mode
 *  NULL, cioè "scelga l'app", e vede Semplice. */
export const MODE_DEFAULT: ViewMode = "simple";

/** Il valore letto dal database è di provenienza esterna: si accetta
 *  solo se è una delle due modalità. NULL significa "non ha ancora
 *  scelto" e lascia vincere MODE_DEFAULT. */
const isViewMode = (v: unknown): v is ViewMode => v === "simple" || v === "advanced";

interface ModeContextType {
  mode: ViewMode;
  isSimple: boolean;
  setMode: (m: ViewMode) => Promise<void>;
  toggleMode: () => Promise<void>;
}

const ModeContext = createContext<ModeContextType>({
  mode: MODE_DEFAULT,
  isSimple: MODE_DEFAULT === "simple",
  setMode: async () => {},
  toggleMode: async () => {},
});

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
  return () => observer.disconnect();
}

/* Si confronta con "advanced" e non con "simple": l'attributo assente o
   illeggibile deve ricadere su MODE_DEFAULT, non sull'altra modalità. */
const getSnapshot = (): ViewMode =>
  document.documentElement.getAttribute("data-mode") === "advanced" ? "advanced" : "simple";
const getServerSnapshot = (): ViewMode => MODE_DEFAULT;

export function applyMode(mode: ViewMode) {
  document.documentElement.setAttribute("data-mode", mode);
  try {
    localStorage.setItem("view_mode", mode);
  } catch {
    /* storage non disponibile: la scelta vale per la sessione */
  }
}

export const ModeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // La scelta salvata sull'account vince su quella del dispositivo.
  //
  // Il caso NULL non va lasciato passare: su un dispositivo dove ha già
  // lavorato qualcun altro, localStorage contiene la SUA modalità, e
  // chi non ha ancora scelto se la ritroverebbe addosso. Quindi NULL
  // non significa "tieni quello che c'è" ma "riporta al default", che è
  // anche l'unico modo perché un account nuovo veda davvero Semplice.
  // Non si scrive niente a database: la persona non ha ancora scelto.
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    userService
      .getSettings()
      .then((s) => {
        if (!alive) return;
        const voluta = isViewMode(s.view_mode) ? s.view_mode : MODE_DEFAULT;
        if (voluta !== getSnapshot()) applyMode(voluta);
      })
      .catch(() => {
        /* nessuna risposta, o colonna non ancora migrata: si tiene
           quella locale, che è comunque meglio di un lampeggio */
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const setMode = useCallback(
    async (m: ViewMode) => {
      applyMode(m);
      if (!user) return;
      try {
        await userService.updateSettings({ view_mode: m });
      } catch (error) {
        console.error("Impossibile salvare la modalità:", error);
      }
    },
    [user]
  );

  const toggleMode = useCallback(
    () => setMode(getSnapshot() === "simple" ? "advanced" : "simple"),
    [setMode]
  );

  return (
    <ModeContext.Provider value={{ mode, isSimple: mode === "simple", setMode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
};

export const useMode = () => useContext(ModeContext);

"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { userService } from "@/services/userService";
import { useAuth } from "./AuthContext";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => Promise<void>;
  setTheme: (dark: boolean) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: async () => {},
  setTheme: async () => {},
});

/* Il tema vive nel DOM (classe .dark applicata dallo script inline in
   layout.tsx, prima della prima pittura). React lo legge come stato
   esterno invece di duplicarlo: niente lampo bianco, niente doppia verità. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    /* storage non disponibile: il tema resta valido per la sessione */
  }
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const isDarkMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Se l'utente ha salvato una preferenza a DB, quella vince su quella locale.
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    userService
      .getSettings()
      .then((s) => {
        if (!alive || typeof s.dark_mode !== "boolean") return;
        if (s.dark_mode !== document.documentElement.classList.contains("dark")) {
          applyTheme(s.dark_mode);
        }
      })
      .catch(() => {
        /* nessuna preferenza remota: resta quella locale */
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const setTheme = useCallback(
    async (dark: boolean) => {
      applyTheme(dark);
      if (user) {
        try {
          await userService.updateSettings({ dark_mode: dark });
        } catch (error) {
          console.error("Impossibile salvare la preferenza tema:", error);
        }
      }
    },
    [user]
  );

  const toggleTheme = useCallback(
    () => setTheme(!document.documentElement.classList.contains("dark")),
    [setTheme]
  );

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

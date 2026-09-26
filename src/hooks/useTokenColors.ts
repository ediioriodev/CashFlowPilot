"use client";

import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";

const TOKENS = ["--accent", "--pos", "--neg", "--warn", "--line", "--faint", "--muted", "--surface", "--text"] as const;
type Token = (typeof TOKENS)[number];

const FALLBACK: Record<Token, string> = {
  "--accent": "#153E75",
  "--pos": "#0F7A4D",
  "--neg": "#B42318",
  "--warn": "#B54708",
  "--line": "#E3E0DA",
  "--faint": "#6B717A",
  "--muted": "#4B5159",
  "--surface": "#FFFFFF",
  "--text": "#14171C",
};

/**
 * Le librerie di grafici di terze parti vogliono colori concreti, non var().
 * Qui li risolviamo dai token e li ricalcoliamo quando cambia il tema, così
 * i grafici non restano indietro in modalità scura.
 * Il valore si ricalcola in render: la classe .dark è già applicata quando
 * isDarkMode cambia, quindi la lettura è sempre coerente.
 */
export function useTokenColors(): Record<Token, string> {
  const { isDarkMode } = useTheme();

  return useMemo(() => {
    // isDarkMode è volutamente fra le dipendenze: i token non compaiono nel
    // corpo del memo, ma il loro valore cambia con la classe .dark del DOM.
    void isDarkMode;
    if (typeof document === "undefined") return FALLBACK;
    const cs = getComputedStyle(document.documentElement);
    const next = {} as Record<Token, string>;
    TOKENS.forEach((t) => {
      next[t] = cs.getPropertyValue(t).trim() || FALLBACK[t];
    });
    return next;
  }, [isDarkMode]);
}

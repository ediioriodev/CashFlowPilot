"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { userService } from "@/services/userService";
import {
  formatDateForAPI,
  getCurrentMonthRange,
  getCustomPeriodRange,
} from "@/lib/formatUtils";

export interface Range {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

interface PeriodContextType {
  range: Range;
  label: string;
  /** "giorno 14 di 30" */
  progressLabel: string;
  /** 0-1, quanto del periodo è trascorso */
  elapsed: number;
  daysLeft: number;
  isCurrentPeriod: boolean;
  /** true finché non conosciamo le impostazioni di periodo personalizzato */
  loading: boolean;
  shift: (direction: "prev" | "next") => void;
  reset: () => void;
  setRange: (r: Range) => void;
}

const fallback = getCurrentMonthRange();

const PeriodContext = createContext<PeriodContextType>({
  range: fallback,
  label: "",
  progressLabel: "",
  elapsed: 0,
  daysLeft: 0,
  isCurrentPeriod: true,
  loading: true,
  shift: () => {},
  reset: () => {},
  setRange: () => {},
});

const DAY = 86_400_000;
const toDate = (iso: string) => new Date(iso + "T00:00:00");
const today = () => formatDateForAPI(new Date());

/** Periodo corrente, tenendo conto del giorno d'inizio personalizzato. */
function currentRange(customActive: boolean, startDay: number): Range {
  if (!customActive || startDay <= 1) return getCurrentMonthRange();
  const now = new Date();
  let month = now.getMonth();
  let year = now.getFullYear();
  // superato il giorno d'inizio, siamo nel periodo che chiude il mese dopo
  if (now.getDate() >= startDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return getCustomPeriodRange(year, month, startDay, true);
}

export const PeriodProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [customActive, setCustomActive] = useState(false);
  const [startDay, setStartDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [range, setRangeState] = useState<Range>(fallback);

  // Un solo posto in tutta l'app dove si leggono le impostazioni di periodo.
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    userService
      .getSettings()
      .then((s) => {
        if (!alive) return;
        const active = !!s.custom_period_active;
        const day = s.custom_period_start_day ?? 1;
        setCustomActive(active);
        setStartDay(day);
        setRangeState(currentRange(active, day));
      })
      .catch(() => {
        /* restiamo sul mese solare */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const shift = useCallback(
    (direction: "prev" | "next") => {
      const delta = direction === "next" ? 1 : -1;
      setRangeState((prev) => {
        const s = toDate(prev.start);
        if (customActive && startDay > 1) {
          // getCustomPeriodRange costruisce start su (mese - 1): il mese di
          // riferimento del periodo è quindi quello dello start + 1.
          let month = s.getMonth() + 1 + delta;
          let year = s.getFullYear();
          if (month > 11) { month -= 12; year += 1; }
          if (month < 0)  { month += 12; year -= 1; }
          return getCustomPeriodRange(year, month, startDay, true);
        }
        let month = s.getMonth() + delta;
        let year = s.getFullYear();
        if (month > 11) { month = 0; year += 1; }
        if (month < 0)  { month = 11; year -= 1; }
        return {
          start: formatDateForAPI(new Date(year, month, 1)),
          end: formatDateForAPI(new Date(year, month + 1, 0)),
        };
      });
    },
    [customActive, startDay]
  );

  const reset = useCallback(
    () => setRangeState(currentRange(customActive, startDay)),
    [customActive, startDay]
  );

  const setRange = useCallback((r: Range) => {
    if (r.start && r.end && r.start <= r.end) setRangeState(r);
  }, []);

  const derived = useMemo(() => {
    const s = toDate(range.start);
    const e = toDate(range.end);
    const now = toDate(today());

    const sameYear = s.getFullYear() === e.getFullYear();
    const sameMonth = sameYear && s.getMonth() === e.getMonth();
    const fmtMonth = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });
    const fmtShort = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
    const fmtFull = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

    // Mese solare intero → "novembre 2025". Altrimenti l'intervallo esplicito.
    const isWholeMonth =
      sameMonth && s.getDate() === 1 && e.getDate() === new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate();
    const label = isWholeMonth
      ? fmtMonth.format(s)
      : sameYear
        ? `${fmtShort.format(s)} – ${fmtFull.format(e)}`
        : `${fmtFull.format(s)} – ${fmtFull.format(e)}`;

    const total = Math.max(1, Math.round((e.getTime() - s.getTime()) / DAY) + 1);
    const done = Math.round((now.getTime() - s.getTime()) / DAY) + 1;
    const isCurrentPeriod = now >= s && now <= e;
    const dayIndex = Math.min(Math.max(done, 0), total);
    const daysLeft = isCurrentPeriod ? total - dayIndex : 0;

    return {
      label: label.charAt(0).toUpperCase() + label.slice(1),
      progressLabel: isCurrentPeriod ? `giorno ${dayIndex} di ${total}` : `${total} giorni`,
      elapsed: isCurrentPeriod ? dayIndex / total : now > e ? 1 : 0,
      daysLeft,
      isCurrentPeriod,
    };
  }, [range]);

  return (
    <PeriodContext.Provider
      value={{ range, ...derived, loading, shift, reset, setRange }}
    >
      {children}
    </PeriodContext.Provider>
  );
};

export const usePeriod = () => useContext(PeriodContext);

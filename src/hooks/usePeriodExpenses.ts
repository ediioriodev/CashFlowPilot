"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useScope } from "@/context/ScopeContext";
import { usePeriod } from "@/context/PeriodContext";
import { expenseService } from "@/services/expenseService";
import { goalService } from "@/services/goalService";
import { buildOverview, type Overview } from "@/lib/finance";
import type { Spesa } from "@/types/expenses";

/**
 * Un'unica sorgente per i movimenti del periodo corrente.
 * Le pagine non rifanno più il calcolo (né la fetch) per conto loro.
 */
export function usePeriodExpenses() {
  const { user } = useAuth();
  const { scope, isInitialized } = useScope();
  const { range, loading: periodLoading } = usePeriod();

  const [transactions, setTransactions] = useState<Spesa[]>([]);
  const [accantonato, setAccantonato] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  const load = useCallback(async () => {
    // Al logout la sessione sparisce ma i componenti restano montati per
    // un frame: senza questa guardia partiva una fetch che il service
    // rifiutava con "User not authenticated".
    if (!user) {
      runId.current++;
      setTransactions([]);
      setAccantonato(0);
      setError(null);
      setLoading(false);
      return;
    }
    if (!isInitialized || periodLoading) return;

    const id = ++runId.current;
    setLoading(true);
    setError(null);
    try {
      // l'accantonato viaggia insieme ai movimenti: senza, «Puoi spendere»
      // lampeggerebbe a ogni caricamento con due valori diversi
      const [data, messoDaParte] = await Promise.all([
        expenseService.getExpenses(range.start, range.end, scope),
        goalService.sumContributions({ start: range.start, end: range.end }, scope),
      ]);
      if (id !== runId.current) return; // una richiesta più recente ha già vinto
      setTransactions(data ?? []);
      setAccantonato(messoDaParte);
    } catch (e) {
      if (id !== runId.current) return;
      console.error(e);
      setError("Non siamo riusciti a caricare i movimenti.");
    } finally {
      if (id === runId.current) setLoading(false);
    }
  }, [user, isInitialized, periodLoading, range.start, range.end, scope]);

  useEffect(() => {
    load();
  }, [load]);

  const overview: Overview = useMemo(
    () => buildOverview(transactions, range, undefined, accantonato),
    [transactions, range, accantonato]
  );

  /** Aggiorna una voce senza rifare la fetch (conferma, modifica locale). */
  const patch = useCallback((id: number, changes: Partial<Spesa>) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  }, []);

  const remove = useCallback((id: number) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { transactions, overview, loading, error, reload: load, patch, remove };
}

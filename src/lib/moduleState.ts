import type { PostgrestError } from "@supabase/supabase-js";

/* ============================================================
   MODULI NON ANCORA MIGRATI

   Budget, obiettivi, quote/conguagli e scontrini vivono su tabelle
   che possono non esistere ancora: le migrazioni si applicano a mano
   (vedi design/DB-APPLICAZIONE.md) e possono arrivare in un secondo
   momento, o da un altro computer.

   Finché non ci sono, l'app non deve rompersi: la pagina mostra cosa
   manca e come attivarlo, il resto continua a funzionare. È lo stesso
   trattamento che familyService riservava a paid_by prima del 16/09.
   ============================================================ */

/** Migrazione che dà vita a un modulo, così la UI può dire quale applicare. */
export const MIGRATION = {
  helpers: "20260101000000_helpers.sql",
  budgets: "20260101000100_budgets.sql",
  goals: "20260101000200_goals.sql",
  splits: "20260101000300_splits_settlements.sql",
  receipts: "20260101000400_receipts.sql",
} as const;

export type MigrationFile = (typeof MIGRATION)[keyof typeof MIGRATION];

/**
 * True se l'errore dice "questa cosa non esiste ancora" invece di
 * "qualcosa è andato storto".
 *
 *   42P01 / PGRST205  tabella o vista assente
 *   42883 / PGRST202  funzione assente (o firma diversa)
 *   42703             colonna assente
 *
 * PostgREST tiene una cache dello schema: quando una tabella non c'è
 * risponde con un codice proprio e un messaggio in inglese, non con
 * l'errore Postgres. Vanno riconosciuti entrambi.
 */
export function isMissingModule(error: unknown): boolean {
  if (!error) return false;
  const e = error as Partial<PostgrestError> & { message?: string };
  const code = (e.code ?? "").toUpperCase();
  if (["42P01", "42883", "42703", "PGRST202", "PGRST205"].includes(code)) return true;

  const msg = `${e.message ?? ""} ${e.details ?? ""}`.toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the function") ||
    msg.includes("schema cache")
  );
}

/** Bucket di Storage non ancora creato. */
export function isMissingBucket(error: unknown): boolean {
  if (!error) return false;
  const e = error as { message?: string; statusCode?: string | number };
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("bucket not found") || msg.includes("not found") || String(e.statusCode) === "404";
}

/** Risultato di una lettura che può arrivare prima della sua migrazione. */
export interface ModuleResult<T> {
  data: T;
  /** la migrazione non è ancora applicata: la UI lo dice e non allarma */
  needsMigration: boolean;
  /** errore vero, da mostrare come tale */
  error: string | null;
}

export const ok = <T,>(data: T): ModuleResult<T> => ({ data, needsMigration: false, error: null });
export const missing = <T,>(data: T): ModuleResult<T> => ({ data, needsMigration: true, error: null });
export const failed = <T,>(data: T, error: string): ModuleResult<T> => ({ data, needsMigration: false, error });

/**
 * L'accantonamento automatico degli obiettivi lo esegue
 * public.run_auto_contributions(), che però gira solo se è pianificata
 * con pg_cron (OP-022, design/DB-APPLICAZIONE.md). Finché non lo è, la UI
 * non deve promettere versamenti che non partiranno: va messo a true
 * nello stesso momento in cui si crea il job.
 */
export const AUTO_CONTRIBUTIONS_SCHEDULED = false;

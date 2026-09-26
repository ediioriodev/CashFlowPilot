import { supabase } from "@/lib/supabaseClient";
import { groupService } from "./groupService";
import { isMissingModule, ok, missing, failed, type ModuleResult } from "@/lib/moduleState";

/* ============================================================
   BUDGET A BUSTE

   Un tetto per categoria, versionato per periodo: alzare il budget
   di novembre non riscrive ottobre. Il tetto attivo è quello con
   valido_a null, e l'indice unico parziale garantisce che ce ne sia
   uno solo per categoria.

   Lettura  → get_budget_status()  (stessa distinzione reale/previsto
              di src/lib/finance.ts)
   Scrittura → set_budget() / clear_budget(), atomiche lato database.

   Tabella: public.budgets — migrazione 20260101000100_budgets.sql.
   ============================================================ */

export type BudgetStato = "ok" | "attenzione" | "superato";

export interface BudgetStatus {
  categoria: string;
  tetto: number;
  spesoReale: number;
  spesoPrevisto: number;
  /** speso reale sul tetto, in percentuale */
  percentuale: number;
  /** quanto resta davvero da spendere */
  residuo: number;
  stato: BudgetStato;
}

export interface BudgetTotals {
  tetto: number;
  spesoReale: number;
  spesoPrevisto: number;
  residuo: number;
  percentuale: number;
}

interface Range {
  start: string;
  end: string;
}

type Scope = "C" | "P";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Soglie: sempre accompagnate da icona e parola, mai solo colore. */
export function statoDi(percentuale: number): BudgetStato {
  if (percentuale > 100) return "superato";
  if (percentuale >= 85) return "attenzione";
  return "ok";
}

export const STATO_LABEL: Record<BudgetStato, string> = {
  ok: "In linea",
  attenzione: "Quasi finito",
  superato: "Superato",
};

export const STATO_TONE: Record<BudgetStato, "pos" | "warn" | "neg"> = {
  ok: "pos",
  attenzione: "warn",
  superato: "neg",
};

interface StatusRow {
  categoria: string;
  tetto: number | string;
  speso_reale: number | string;
  speso_previsto: number | string;
}

/** Chi possiede i budget: il gruppo sul condiviso, l'utente sul personale. */
async function owner(scope: Scope): Promise<{ groupId: number | null; userId: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { groupId: null, userId: null };
  if (scope === "P") return { groupId: null, userId: user.id };
  return { groupId: await groupService.getGroupId(), userId: null };
}

async function fetchStatus(range: Range, scope: Scope): Promise<ModuleResult<BudgetStatus[]>> {
  const { groupId, userId } = await owner(scope);
  if (scope === "C" && !groupId) return ok([]);
  if (scope === "P" && !userId) return ok([]);

  const { data, error } = await supabase.rpc("get_budget_status", {
    p_scope: scope,
    p_group_id: groupId,
    p_user_id: userId,
    p_start: range.start,
    p_end: range.end,
  });

  if (error) {
    if (isMissingModule(error)) return missing([]);
    console.error("Errore nel caricamento dei budget:", error);
    return failed([], "Non siamo riusciti a caricare i budget.");
  }

  const rows = ((data ?? []) as StatusRow[]).map((r) => {
    const tetto = Number(r.tetto || 0);
    const spesoReale = Number(r.speso_reale || 0);
    const spesoPrevisto = Number(r.speso_previsto || 0);
    const percentuale = tetto > 0 ? (spesoReale / tetto) * 100 : 0;
    return {
      categoria: r.categoria,
      tetto: round2(tetto),
      spesoReale: round2(spesoReale),
      spesoPrevisto: round2(spesoPrevisto),
      percentuale: Math.round(percentuale * 10) / 10,
      residuo: round2(tetto - spesoReale),
      stato: statoDi(percentuale),
    } satisfies BudgetStatus;
  });

  return ok(rows.sort((a, b) => b.percentuale - a.percentuale));
}

/* Richieste identiche partite insieme (doppio effetto di StrictMode,
   più pagine che chiedono lo stesso periodo) condividono la stessa
   promise: una sola chiamata a get_budget_status finché è in volo. */
const inFlight = new Map<string, Promise<ModuleResult<BudgetStatus[]>>>();

export const budgetService = {
  /** Stato di tutte le buste nel periodo. */
  getStatus(range: Range, scope: Scope): Promise<ModuleResult<BudgetStatus[]>> {
    const key = `${scope}|${range.start}|${range.end}`;
    let p = inFlight.get(key);
    if (!p) {
      p = fetchStatus(range, scope)
        .catch((e) => {
          // senza catch una promise rifiutata lasciava /budget su «Caricamento in corso…»
          console.error("Errore nel caricamento dei budget:", e);
          return failed<BudgetStatus[]>([], "Non siamo riusciti a caricare i budget.");
        })
        .finally(() => inFlight.delete(key));
      inFlight.set(key, p);
    }
    return p;
  },

  /** Una sola busta: per la pagina di dettaglio. */
  async getOne(categoria: string, range: Range, scope: Scope): Promise<ModuleResult<BudgetStatus | null>> {
    const res = await this.getStatus(range, scope);
    const found = res.data.find((b) => b.categoria.toLowerCase() === categoria.toLowerCase()) ?? null;
    return { ...res, data: found };
  },

  /**
   * Fissa o cambia il tetto di una categoria.
   * `periodStart` è l'inizio del periodo corrente dell'app: serve al
   * database per decidere se aggiornare la versione in corso o aprirne
   * una nuova senza sovrapporsi al periodo precedente.
   */
  async upsert(
    categoria: string,
    tetto: number,
    scope: Scope,
    periodStart: string
  ): Promise<ModuleResult<boolean>> {
    const { groupId, userId } = await owner(scope);
    if (scope === "C" && !groupId) return failed(false, "Non fai parte di nessun gruppo.");

    const { error } = await supabase.rpc("set_budget", {
      p_scope: scope,
      p_group_id: groupId,
      p_user_id: userId,
      p_categoria: categoria.trim(),
      p_tetto: tetto,
      p_period_start: periodStart,
    });

    if (error) {
      if (isMissingModule(error)) return missing(false);
      console.error("Errore nel salvataggio del budget:", error);
      return failed(false, "Non siamo riusciti a salvare il tetto.");
    }
    return ok(true);
  },

  /** Toglie il tetto senza cancellare lo storico. */
  async remove(categoria: string, scope: Scope, periodStart: string): Promise<ModuleResult<boolean>> {
    const { groupId, userId } = await owner(scope);
    if (scope === "C" && !groupId) return failed(false, "Non fai parte di nessun gruppo.");

    const { error } = await supabase.rpc("clear_budget", {
      p_scope: scope,
      p_group_id: groupId,
      p_user_id: userId,
      p_categoria: categoria.trim(),
      p_period_start: periodStart,
    });

    if (error) {
      if (isMissingModule(error)) return missing(false);
      console.error("Errore nella rimozione del budget:", error);
      return failed(false, "Non siamo riusciti a togliere il tetto.");
    }

    /* clear_budget è invoker: se RLS gli nega la riga (una busta nata in
       questo mese si cancella, e cancellare è dell'amministratore) non
       solleva niente, torna 204 e la busta resta. Si rilegge per non dire
       «Tetto rimosso» su un tetto ancora attivo. */
    let ancora = supabase
      .from("budgets")
      .select("id", { count: "exact", head: true })
      .eq("scope", scope)
      .is("valido_a", null)
      .ilike("categoria", categoria.trim().replace(/[%_\\]/g, "\\$&")); // uguale senza maiuscole, come lower() nella RPC
    ancora = scope === "C" ? ancora.eq("group_id", groupId!) : ancora.eq("user_id", userId!);
    const { count } = await ancora;
    if ((count ?? 0) > 0) {
      return failed(
        false,
        "Solo l'amministratore del gruppo può togliere una busta creata in questo mese."
      );
    }
    return ok(true);
  },
};

/** Somma delle buste: il numero grande in cima a /budget. */
export function budgetTotals(list: BudgetStatus[]): BudgetTotals {
  const tetto = list.reduce((s, b) => s + b.tetto, 0);
  const spesoReale = list.reduce((s, b) => s + b.spesoReale, 0);
  const spesoPrevisto = list.reduce((s, b) => s + b.spesoPrevisto, 0);
  return {
    tetto: round2(tetto),
    spesoReale: round2(spesoReale),
    spesoPrevisto: round2(spesoPrevisto),
    residuo: round2(tetto - spesoReale),
    percentuale: tetto > 0 ? Math.round((spesoReale / tetto) * 1000) / 10 : 0,
  };
}

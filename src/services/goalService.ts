import { supabase } from "@/lib/supabaseClient";
import { groupService } from "./groupService";
import { isMissingModule, ok, missing, failed, type ModuleResult } from "@/lib/moduleState";

/* ============================================================
   OBIETTIVI DI RISPARMIO

   Il saldo di un obiettivo non è una colonna: si somma dai versamenti
   (vista goals_progress). Una colonna si disallinea alla prima
   modifica fatta fuori dall'app.

   Il punto che rende il modulo utile invece che decorativo: i soldi
   accantonati escono da «Puoi spendere». Per questo esiste
   sumContributions(), che src/hooks/usePeriodExpenses.ts passa a
   buildOverview().

   Tabelle: public.goals + public.goal_contributions
   Migrazione: 20260101000200_goals.sql
   ============================================================ */

export type Scope = "C" | "P";

export interface Goal {
  id: number;
  scope: Scope;
  nome: string;
  icona: string;
  target: number;
  dataObiettivo: string | null;
  autoImporto: number | null;
  autoGiorno: number | null;
  archiviato: boolean;
  /** somma dei versamenti, prelievi compresi */
  accantonato: number;
  mancante: number;
  percentuale: number;
  ultimoVersamento: string | null;
  /** mesi al traguardo con l'accantonamento automatico corrente */
  mesiStimati: number | null;
}

export interface GoalInput {
  nome: string;
  icona: string;
  target: number;
  dataObiettivo?: string | null;
  autoImporto?: number | null;
  autoGiorno?: number | null;
}

export interface Contribution {
  id: number;
  goalId: number;
  userId: string;
  importo: number;
  data: string;
  nota: string | null;
  automatico: boolean;
}

interface GoalRow {
  id: number;
  scope: Scope;
  nome: string;
  icona: string | null;
  target: number | string;
  data_obiettivo: string | null;
  auto_importo: number | string | null;
  auto_giorno: number | null;
  archiviato: boolean;
  accantonato: number | string | null;
  mancante: number | string | null;
  percentuale: number | string | null;
  ultimo_versamento: string | null;
  mesi_stimati: number | string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function toGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    scope: r.scope,
    nome: r.nome,
    icona: r.icona || "piggy-bank",
    target: Number(r.target || 0),
    dataObiettivo: r.data_obiettivo,
    autoImporto: r.auto_importo === null ? null : Number(r.auto_importo),
    autoGiorno: r.auto_giorno,
    archiviato: r.archiviato,
    accantonato: round2(Number(r.accantonato || 0)),
    mancante: round2(Number(r.mancante || 0)),
    percentuale: Number(r.percentuale || 0),
    ultimoVersamento: r.ultimo_versamento,
    mesiStimati: r.mesi_stimati === null ? null : Number(r.mesi_stimati),
  };
}

async function owner(scope: Scope): Promise<{ groupId: number | null; userId: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { groupId: null, userId: null };
  if (scope === "P") return { groupId: null, userId: user.id };
  return { groupId: await groupService.getGroupId(), userId: null };
}

export const goalService = {
  /** Obiettivi attivi del portafoglio, con il progresso già calcolato. */
  async list(scope: Scope, includeArchiviati = false): Promise<ModuleResult<Goal[]>> {
    const { groupId, userId } = await owner(scope);
    if (scope === "C" && !groupId) return ok([]);
    if (scope === "P" && !userId) return ok([]);

    let query = supabase.from("goals_progress").select("*").eq("scope", scope);
    query = scope === "C" ? query.eq("group_id", groupId) : query.eq("user_id", userId);
    if (!includeArchiviati) query = query.eq("archiviato", false);

    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      if (isMissingModule(error)) return missing([]);
      console.error("Errore nel caricamento degli obiettivi:", error);
      return failed([], "Non siamo riusciti a caricare gli obiettivi.");
    }
    return ok(((data ?? []) as GoalRow[]).map(toGoal));
  },

  async create(input: GoalInput, scope: Scope): Promise<ModuleResult<number | null>> {
    const { groupId, userId } = await owner(scope);
    if (scope === "C" && !groupId) return failed(null, "Non fai parte di nessun gruppo.");

    const { data, error } = await supabase
      .from("goals")
      .insert({
        scope,
        group_id: scope === "C" ? groupId : null,
        user_id: scope === "P" ? userId : null,
        nome: input.nome.trim(),
        icona: input.icona,
        target: input.target,
        data_obiettivo: input.dataObiettivo || null,
        auto_importo: input.autoImporto ?? null,
        auto_giorno: input.autoImporto ? (input.autoGiorno ?? 1) : null,
      })
      .select("id")
      .single();

    if (error) {
      if (isMissingModule(error)) return missing(null);
      console.error("Errore nella creazione dell'obiettivo:", error);
      return failed(null, "Non siamo riusciti a creare l'obiettivo.");
    }
    return ok((data as { id: number }).id);
  },

  async update(id: number, input: GoalInput): Promise<ModuleResult<boolean>> {
    const { error } = await supabase
      .from("goals")
      .update({
        nome: input.nome.trim(),
        icona: input.icona,
        target: input.target,
        data_obiettivo: input.dataObiettivo || null,
        auto_importo: input.autoImporto ?? null,
        auto_giorno: input.autoImporto ? (input.autoGiorno ?? 1) : null,
      })
      .eq("id", id);

    if (error) {
      if (isMissingModule(error)) return missing(false);
      console.error("Errore nella modifica dell'obiettivo:", error);
      return failed(false, "Non siamo riusciti a salvare l'obiettivo.");
    }
    return ok(true);
  },

  /**
   * Un versamento o un prelievo (importo negativo).
   * Non tocca il saldo: il saldo è la somma di queste righe.
   */
  async contribute(
    goalId: number,
    importo: number,
    nota?: string
  ): Promise<ModuleResult<boolean>> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return failed(false, "Sessione scaduta.");

    const { error } = await supabase.from("goal_contributions").insert({
      goal_id: goalId,
      user_id: user.id,
      importo: round2(importo),
      nota: nota?.trim() || null,
      automatico: false,
    });

    if (error) {
      if (isMissingModule(error)) return missing(false);
      console.error("Errore nel versamento:", error);
      return failed(false, "Non siamo riusciti a registrare il versamento.");
    }
    return ok(true);
  },

  /** Storico di un obiettivo, dal più recente. */
  async contributions(goalId: number, limit = 20): Promise<Contribution[]> {
    const { data, error } = await supabase
      .from("goal_contributions")
      .select("id, goal_id, user_id, importo, data, nota, automatico")
      .eq("goal_id", goalId)
      .order("data", { ascending: false })
      .limit(limit);

    if (error) {
      if (!isMissingModule(error)) console.error("Errore nella lettura dei versamenti:", error);
      return [];
    }
    type Row = {
      id: number;
      goal_id: number;
      user_id: string;
      importo: number | string;
      data: string;
      nota: string | null;
      automatico: boolean;
    };
    return ((data ?? []) as Row[]).map((r) => ({
      id: r.id,
      goalId: r.goal_id,
      userId: r.user_id,
      importo: Number(r.importo || 0),
      data: r.data,
      nota: r.nota,
      automatico: r.automatico,
    }));
  },

  /** Archivia: l'obiettivo sparisce dall'elenco ma lo storico resta. */
  async archive(goalId: number, archiviato = true): Promise<ModuleResult<boolean>> {
    const { error } = await supabase.from("goals").update({ archiviato }).eq("id", goalId);
    if (error) {
      if (isMissingModule(error)) return missing(false);
      console.error("Errore nell'archiviazione:", error);
      return failed(false, "Non siamo riusciti ad archiviare l'obiettivo.");
    }
    return ok(true);
  },

  /**
   * Quanto è entrato nel salvadanaio, mese per mese.
   * Serve alle barre della crescita: il ritmo del risparmio si legge
   * meglio di un totale.
   */
  async monthlyGrowth(scope: Scope, months = 6): Promise<{ label: string; value: number }[]> {
    const { groupId, userId } = await owner(scope);
    if (scope === "C" && !groupId) return [];
    if (scope === "P" && !userId) return [];

    const da = new Date();
    da.setMonth(da.getMonth() - (months - 1));
    da.setDate(1);
    const dal = `${da.getFullYear()}-${String(da.getMonth() + 1).padStart(2, "0")}-01`;

    let goalsQuery = supabase.from("goals").select("id").eq("scope", scope);
    goalsQuery = scope === "C" ? goalsQuery.eq("group_id", groupId) : goalsQuery.eq("user_id", userId);
    const { data: goals, error: goalsError } = await goalsQuery;
    if (goalsError) return [];

    const ids = ((goals ?? []) as { id: number }[]).map((g) => g.id);
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from("goal_contributions")
      .select("importo, data")
      .in("goal_id", ids)
      .gte("data", dal);

    if (error) {
      if (!isMissingModule(error)) console.error("Errore nella crescita del risparmio:", error);
      return [];
    }

    const perMese = new Map<string, number>();
    for (let i = 0; i < months; i++) {
      const d = new Date(da.getFullYear(), da.getMonth() + i, 1);
      perMese.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
    }
    ((data ?? []) as { importo: number | string; data: string }[]).forEach((r) => {
      const chiave = r.data.slice(0, 7);
      if (perMese.has(chiave)) perMese.set(chiave, perMese.get(chiave)! + Number(r.importo || 0));
    });

    const fmt = new Intl.DateTimeFormat("it-IT", { month: "short" });
    return [...perMese.entries()].map(([chiave, value]) => {
      const [y, m] = chiave.split("-").map(Number);
      return { label: fmt.format(new Date(y, m - 1, 1)), value: Math.max(0, round2(value)) };
    });
  },

  /**
   * Quanto è stato messo da parte nel periodo.
   * È la cifra che esce da «Puoi spendere»: i soldi accantonati non
   * sono più disponibili, anche se sono ancora sul conto.
   */
  async sumContributions(
    range: { start: string; end: string },
    scope: Scope
  ): Promise<number> {
    const { groupId, userId } = await owner(scope);
    if (scope === "C" && !groupId) return 0;
    if (scope === "P" && !userId) return 0;

    let goalsQuery = supabase.from("goals").select("id").eq("scope", scope);
    goalsQuery = scope === "C" ? goalsQuery.eq("group_id", groupId) : goalsQuery.eq("user_id", userId);

    const { data: goals, error: goalsError } = await goalsQuery;
    if (goalsError) {
      if (!isMissingModule(goalsError)) console.error("Errore nel calcolo dell'accantonato:", goalsError);
      return 0;
    }

    const ids = ((goals ?? []) as { id: number }[]).map((g) => g.id);
    if (ids.length === 0) return 0;

    const { data, error } = await supabase
      .from("goal_contributions")
      .select("importo")
      .in("goal_id", ids)
      .gte("data", range.start)
      .lte("data", range.end);

    if (error) {
      if (!isMissingModule(error)) console.error("Errore nel calcolo dell'accantonato:", error);
      return 0;
    }

    const totale = ((data ?? []) as { importo: number | string }[]).reduce(
      (s, r) => s + Number(r.importo || 0),
      0
    );
    // un prelievo netto non deve regalare disponibilità: sotto zero si azzera
    return Math.max(0, round2(totale));
  },
};

/** Somme di tutti gli obiettivi: il numero in cima a /obiettivi. */
export function goalTotals(goals: Goal[]) {
  const target = goals.reduce((s, g) => s + g.target, 0);
  const accantonato = goals.reduce((s, g) => s + g.accantonato, 0);
  return {
    target: round2(target),
    accantonato: round2(accantonato),
    mancante: round2(Math.max(0, target - accantonato)),
    percentuale: target > 0 ? Math.min(100, Math.round((accantonato / target) * 1000) / 10) : 0,
    autoPerMese: round2(goals.reduce((s, g) => s + (g.autoImporto ?? 0), 0)),
  };
}

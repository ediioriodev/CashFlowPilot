import { supabase } from "@/lib/supabaseClient";
import type { Spesa, RecurringConfig } from "@/types/expenses";
import { expenseService } from "./expenseService";

/* ============================================================
   FISSE E ABBONAMENTI
   Vista dedicata sulle spese ricorrenti già presenti a DB
   (spese.is_recurring_parent + recurring_config).
   Nessuna nuova tabella: è una lettura diversa di ciò che c'è.
   ============================================================ */

export type Cadence = RecurringConfig["ricorrenza"];

const round2 = (n: number) => Math.round(n * 100) / 100;

interface RigaOccorrenza {
  id: number | string;
  data_spesa: string | null;
  importo: number | string | null;
  confermata: boolean | null;
}

/** Quante volte all'anno si ripete una ricorrenza. */
export function occurrencesPerYear(config?: RecurringConfig | null): number {
  if (!config) return 12;
  switch (config.ricorrenza) {
    case "giornaliera":
      return 365;
    case "settimanale": {
      const days = config.giorni_settimana?.length || 1;
      return 52 * days;
    }
    case "mensile":
      return 12;
    case "bimestrale":
      return 6;
    case "trimestrale":
      return 4;
    case "semestrale":
      return 2;
    case "annuale":
      return 1;
    default:
      return 12;
  }
}

export const CADENCE_LABEL: Record<Cadence, string> = {
  giornaliera: "ogni giorno",
  settimanale: "ogni settimana",
  mensile: "ogni mese",
  bimestrale: "ogni 2 mesi",
  trimestrale: "ogni 3 mesi",
  semestrale: "ogni 6 mesi",
  annuale: "ogni anno",
};

export interface RecurringItem {
  expense: Spesa;
  name: string;
  category: string;
  amount: number;
  cadence: Cadence;
  cadenceLabel: string;
  /** costo equivalente al mese e all'anno */
  perMonth: number;
  perYear: number;
  isIncome: boolean;
  /** true se la ricorrenza è scaduta */
  ended: boolean;
  endDate: string | null;
  autoConfirm: boolean;
}

export interface RecurringSummary {
  items: RecurringItem[];
  outPerMonth: number;
  outPerYear: number;
  inPerMonth: number;
  /** quota delle uscite mensili coperta dalle spese fisse, 0-100 */
  shareOfSpending: number;
}


/* ------------------------------------------------------------
   LA VITA DI UNA VOCE — storico e previsto (OP-036 · RIL-010)

   Nessuna tabella nuova: le occorrenze di una ricorrenza sono già
   righe di spese con recurring_parent_id valorizzato, generate in
   blocco alla creazione.

   L'orizzonte del previsto è l'ANNO SOLARE in corso, deciso il
   19/09/2026: le occorrenze a database arrivano fino a dieci anni
   quando manca una data di fine, e un totale su quell'arco non
   significherebbe niente. Il «€/anno» mostrato in pagina (perYear) è
   un'altra cosa ancora: è una tariffa, importo × occorrenze annue, e
   su una voce aperta a novembre direbbe 143,88 € dove l'anno costa
   23,98 €. Qui si contano le occorrenze vere.
   ------------------------------------------------------------ */

export interface Occorrenza {
  id: number;
  data: string;
  importo: number;
  confermata: boolean;
}

export interface RecurringLife {
  anno: number;
  /** occorrenze dell'anno già passate (oggi compreso) */
  storico: Occorrenza[];
  /** occorrenze dell'anno ancora da venire */
  previsto: Occorrenza[];
  totaleStorico: number;
  totalePrevisto: number;
  /** storico + previsto: quanto costa in questo anno solare */
  totaleAnno: number;
  /** tutte le occorrenze mai registrate, senza limiti di anno */
  totaleVita: number;
  nVita: number;
  /** data dell'ultima occorrenza registrata: le future sono generate in blocco
      fino a data_fine o, senza, per dieci anni (expenseService.createExpense) */
  ultimaData: string | null;
  /** l'importo è cambiato nel tempo */
  importiDiversi: boolean;
}

export const recurringService = {
  async getSummary(scope: "C" | "P", monthlyOutflow = 0): Promise<RecurringSummary> {
    const parents = await expenseService.getRecurringExpenses(scope);
    const today = new Date().toISOString().split("T")[0];

    const items: RecurringItem[] = parents.map((e) => {
      const config = (e.recurring_config ?? null) as RecurringConfig | null;
      const cadence = (config?.ricorrenza ?? "mensile") as Cadence;
      const perYear = Number(e.importo || 0) * occurrencesPerYear(config);
      const endDate = config?.data_fine ?? null;
      return {
        expense: e,
        name: (e.negozio || "").trim() || (e.ambito || "").trim() || "Senza nome",
        category: (e.ambito || "").trim() || "Senza categoria",
        amount: Number(e.importo || 0),
        cadence,
        cadenceLabel: CADENCE_LABEL[cadence] ?? "ogni mese",
        perMonth: perYear / 12,
        perYear,
        isIncome: e.tipo_transazione === "entrata",
        ended: !!endDate && endDate < today,
        endDate,
        autoConfirm: config?.tipo_conferma === "A",
      };
    });

    const active = items.filter((i) => !i.ended);
    const outPerMonth = active.filter((i) => !i.isIncome).reduce((s, i) => s + i.perMonth, 0);
    const inPerMonth = active.filter((i) => i.isIncome).reduce((s, i) => s + i.perMonth, 0);

    return {
      items: items.sort((a, b) => b.perYear - a.perYear),
      outPerMonth,
      outPerYear: outPerMonth * 12,
      inPerMonth,
      shareOfSpending: monthlyOutflow > 0 ? Math.min(100, (outPerMonth / monthlyOutflow) * 100) : 0,
    };
  },

  async getLife(parentId: number, scope: "C" | "P"): Promise<RecurringLife | null> {
    const tabella = scope === "C" ? "spese" : "spese_personali";
    const { data, error } = await supabase
      .from(tabella)
      .select("id, data_spesa, importo, confermata")
      // la capostipite è la prima occorrenza: senza di lei lo storico
      // partiva dalla seconda rata
      .or(`id.eq.${parentId},recurring_parent_id.eq.${parentId}`)
      .is("deleted_at", null)
      .order("data_spesa", { ascending: true });

    if (error) {
      console.error("Errore nella lettura delle occorrenze:", error);
      return null;
    }

    const righe = ((data ?? []) as RigaOccorrenza[]).map((r) => ({
      id: Number(r.id),
      data: String(r.data_spesa ?? "").split("T")[0],
      importo: Number(r.importo || 0),
      confermata: !!r.confermata,
    }));

    const oggi = new Date().toISOString().split("T")[0];
    const anno = new Date().getFullYear();
    const daAnno = `${anno}-01-01`;
    const aAnno = `${anno}-12-31`;

    const dellAnno = righe.filter((r) => r.data >= daAnno && r.data <= aAnno);
    const storico = dellAnno.filter((r) => r.data <= oggi);
    const previsto = dellAnno.filter((r) => r.data > oggi);
    const somma = (xs: Occorrenza[]) => round2(xs.reduce((s, x) => s + x.importo, 0));

    const importi = new Set(righe.map((r) => r.importo));

    return {
      anno,
      storico,
      previsto,
      totaleStorico: somma(storico),
      totalePrevisto: somma(previsto),
      totaleAnno: round2(somma(storico) + somma(previsto)),
      totaleVita: somma(righe),
      nVita: righe.length,
      ultimaData: righe.length ? righe[righe.length - 1].data : null,
      importiDiversi: importi.size > 1,
    };
  }
};

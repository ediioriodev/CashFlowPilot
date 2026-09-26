import type { Spesa } from "@/types/expenses";
import { formatDateForAPI } from "@/lib/formatUtils";

/* ============================================================
   Modello unico "reale / previsto".
   Prima esisteva in quattro copie diverse (home, storico,
   analisi, report) con quattro nomi diversi e risultati diversi.

     REALE       = confermata  E  data <= oggi
     PREVISTO    = tutto ciò che cade nel periodo
     IMPEGNATO   = previsto − reale  (uscite che devono ancora uscire)
     ACCANTONATO = messo negli obiettivi in questo periodo
     LIBERO      = saldo reale − impegnato − accantonato
   ============================================================ */

export const todayISO = () => formatDateForAPI(new Date());

const isReal = (t: Spesa, today: string) => !!t.confermata && t.data_spesa <= today;
const sum = (list: Spesa[]) => list.reduce((s, t) => s + Number(t.importo || 0), 0);

export interface CategoryTotal {
  name: string;
  real: number;
  plan: number;
}

export interface MerchantTotal {
  name: string;
  total: number;
  count: number;
}

export interface Bucket {
  label: string;
  value: number;
  planned?: boolean;
  partial?: boolean;
}

export interface Overview {
  /* incassato e speso davvero */
  realIn: number;
  realOut: number;
  /* totale del periodo, comprese le voci future o da confermare */
  planIn: number;
  planOut: number;

  /** quello che hai in cassa oggi */
  saldoReale: number;
  /** uscite del periodo che devono ancora avvenire */
  impegnato: number;
  /** entrate del periodo che devi ancora incassare */
  atteso: number;
  /** messo da parte negli obiettivi in questo periodo: non è più disponibile */
  accantonato: number;
  /** quanto puoi spendere senza intaccare impegnato e accantonato */
  libero: number;
  /** stima del saldo a fine periodo */
  saldoPrevisto: number;

  /** movimenti non confermati, dal più vicino */
  daConfermare: Spesa[];
  daConfermareTotale: number;

  /** saldo cumulato giorno per giorno; da cutIndex in poi è previsione */
  serie: number[];
  serieCut: number;

  /** ritmo di spesa per settimana */
  settimane: Bucket[];

  categorie: CategoryTotal[];
  negozi: MerchantTotal[];
  count: number;
}

const DAY = 86_400_000;
const toDate = (iso: string) => new Date(iso + "T00:00:00");
const toISO = (d: Date) => formatDateForAPI(d);

/** Tutti i giorni del periodo, estremi inclusi. */
function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const s = toDate(start).getTime();
  const e = toDate(end).getTime();
  for (let t = s; t <= e; t += DAY) out.push(toISO(new Date(t)));
  return out;
}

const label = (t: Spesa, field: "ambito" | "negozio") => {
  const v = (t[field] || "").trim();
  return v || "Senza categoria";
};

export function buildOverview(
  transactions: Spesa[],
  range: { start: string; end: string },
  today = todayISO(),
  /** somma versata negli obiettivi nel periodo: esce dal disponibile */
  accantonato = 0
): Overview {
  // La capostipite di una ricorrente è la sua PRIMA occorrenza (le figlie
  // partono dalla data successiva, expenseService.createExpense): si conta
  // come ogni altra riga. Escluderla toglieva la prima rata da ogni totale.
  const tx = transactions;

  const entrate = tx.filter((t) => t.tipo_transazione === "entrata");
  const uscite = tx.filter((t) => t.tipo_transazione === "spesa");

  const realIn = sum(entrate.filter((t) => isReal(t, today)));
  const realOut = sum(uscite.filter((t) => isReal(t, today)));
  const planIn = sum(entrate);
  const planOut = sum(uscite);

  const saldoReale = realIn - realOut;
  const impegnato = Math.max(0, planOut - realOut);
  const atteso = Math.max(0, planIn - realIn);
  // i soldi accantonati sono ancora sul conto ma non sono più spendibili:
  // senza questa riga l'obiettivo di risparmio sarebbe decorativo
  const libero = saldoReale - impegnato - Math.max(0, accantonato);
  const saldoPrevisto = planIn - planOut;

  const daConfermare = tx
    .filter((t) => !t.confermata)
    .sort((a, b) => a.data_spesa.localeCompare(b.data_spesa));
  const daConfermareTotale = daConfermare.reduce(
    (s, t) => s + (t.tipo_transazione === "spesa" ? Number(t.importo) : -Number(t.importo)),
    0
  );

  /* ---- saldo cumulato ---- */
  const giorni = daysBetween(range.start, range.end);
  /* Fino a oggi la linea è «già successo»: solo il reale, così il punto di
     oggi coincide con «In cassa oggi». Prima sommava anche le voci non
     confermate e i due numeri divergevano. Quelle già scadute ma ancora da
     confermare entrano nel tratto previsto, dal giorno dopo. */
  const domani = toISO(new Date(toDate(today).getTime() + DAY));
  const perDay = new Map<string, number>();
  tx.forEach((t) => {
    const delta = t.tipo_transazione === "entrata" ? Number(t.importo) : -Number(t.importo);
    const giorno = isReal(t, today) || t.data_spesa > today ? t.data_spesa : domani;
    perDay.set(giorno, (perDay.get(giorno) ?? 0) + delta);
  });
  let running = 0;
  const serieFull = giorni.map((g) => {
    running += perDay.get(g) ?? 0;
    return running;
  });
  const idxToday = giorni.findIndex((g) => g === today);
  const serieCutFull = idxToday >= 0 ? idxToday : today < range.start ? 0 : giorni.length - 1;

  // su periodi lunghi campioniamo: 40 punti bastano per leggere la forma
  const MAX_POINTS = 40;
  let serie = serieFull;
  let serieCut = serieCutFull;
  if (serieFull.length > MAX_POINTS) {
    const step = serieFull.length / MAX_POINTS;
    serie = Array.from({ length: MAX_POINTS }, (_, i) => serieFull[Math.min(serieFull.length - 1, Math.round(i * step))]);
    serieCut = Math.round(serieCutFull / step);
  }

  /* ---- ritmo settimanale ---- */
  const fmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
  const settimane: Bucket[] = [];
  for (let i = 0; i < giorni.length; i += 7) {
    const chunk = giorni.slice(i, i + 7);
    const from = chunk[0];
    const to = chunk[chunk.length - 1];
    const value = sum(uscite.filter((t) => t.data_spesa >= from && t.data_spesa <= to));
    settimane.push({
      label: i === 0 ? fmt.format(toDate(from)) : String(toDate(from).getDate()),
      value,
      planned: from > today,
      partial: from <= today && to >= today,
    });
  }

  /* ---- categorie ---- */
  const catMap = new Map<string, CategoryTotal>();
  uscite.forEach((t) => {
    const name = label(t, "ambito");
    const c = catMap.get(name) ?? { name, real: 0, plan: 0 };
    const v = Number(t.importo);
    c.plan += v;
    if (isReal(t, today)) c.real += v;
    catMap.set(name, c);
  });
  const categorie = [...catMap.values()].sort((a, b) => b.plan - a.plan);

  /* ---- negozi ---- */
  const merMap = new Map<string, MerchantTotal>();
  uscite.forEach((t) => {
    const name = label(t, "negozio");
    const m = merMap.get(name) ?? { name, total: 0, count: 0 };
    m.total += Number(t.importo);
    m.count += 1;
    merMap.set(name, m);
  });
  const negozi = [...merMap.values()].sort((a, b) => b.total - a.total);

  return {
    realIn, realOut, planIn, planOut,
    saldoReale, impegnato, atteso,
    accantonato: Math.max(0, accantonato),
    libero, saldoPrevisto,
    daConfermare, daConfermareTotale,
    serie, serieCut,
    settimane,
    categorie, negozi,
    count: tx.length,
  };
}

/** Raggruppa i movimenti per giorno, dal più recente. */
export function groupByDay(tx: Spesa[], today = todayISO()) {
  const map = new Map<string, Spesa[]>();
  tx.forEach((t) => {
    const arr = map.get(t.data_spesa) ?? [];
    arr.push(t);
    map.set(t.data_spesa, arr);
  });

  const yesterday = toISO(new Date(toDate(today).getTime() - DAY));
  const fmt = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" });

  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({
      date,
      label:
        date === today ? "Oggi" : date === yesterday ? "Ieri" : fmt.format(toDate(date)),
      total: items.reduce(
        (s, t) => s + (t.tipo_transazione === "entrata" ? Number(t.importo) : -Number(t.importo)),
        0
      ),
      items: items.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    }));
}

/** Percentuale di periodo trascorso, per la tacca "dove dovresti essere". */
export function periodProgress(range: { start: string; end: string }, today = todayISO()) {
  const s = toDate(range.start).getTime();
  const e = toDate(range.end).getTime();
  const n = toDate(today).getTime();
  if (n <= s) return 0;
  if (n >= e) return 100;
  return ((n - s) / (e - s)) * 100;
}

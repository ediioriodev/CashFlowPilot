import type { DailyStats, DateRange, TrendStats } from "@/types/reports";

/* ============================================================
   LA SERIE DEL GRAFICO

   Due regole, e nessuna delle due è un dettaglio di forma.

   1. I secchielli si generano DALL'INTERVALLO, non dai dati. Le RPC
      raggruppano per data e restituiscono solo i giorni in cui è
      successo qualcosa: costruendo la serie da lì, i giorni vuoti
      sparirebbero e le barre risulterebbero equidistanti anche quando
      i giorni non lo sono. Un giorno senza movimenti è un giorno a
      zero, e va disegnato come tale.

   2. Su intervalli lunghi si raggruppa, perché novanta barre
      giornaliere non si leggono. La soglia è automatica e il riquadro
      dichiara sempre quale sta usando: un totale settimanale scambiato
      per giornaliero sarebbe un errore peggiore di quello che stiamo
      correggendo.
   ============================================================ */

export type Raggruppamento = "giorno" | "settimana" | "mese";

const GIORNO = 86400000;
const iso = (d: Date) => d.toISOString().split("T")[0];

export function raggruppamentoDi({ startDate, endDate }: DateRange): Raggruppamento {
  const giorni = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / GIORNO) + 1;
  if (giorni <= 35) return "giorno";
  if (giorni <= 183) return "settimana";
  return "mese";
}

/** Lunedì della settimana di una data: le settimane sono lunedì-domenica. */
function lunediDi(d: Date): Date {
  const x = new Date(d);
  const giorno = (x.getUTCDay() + 6) % 7; // 0 = lunedì
  x.setUTCDate(x.getUTCDate() - giorno);
  return x;
}

function secchiello(data: string, modo: Raggruppamento): string {
  const d = new Date(data + "T00:00:00Z");
  if (modo === "giorno") return iso(d);
  if (modo === "settimana") return iso(lunediDi(d));
  return data.slice(0, 7) + "-01";
}

export function serieCompleta(
  income: DailyStats[],
  expense: DailyStats[],
  startDate: string,
  endDate: string
): TrendStats[] {
  const modo = raggruppamentoDi({ startDate, endDate });

  // 1. tutti i secchielli dell'intervallo, a zero
  const map = new Map<string, TrendStats>();
  for (let t = new Date(startDate + "T00:00:00Z"); iso(t) <= endDate; t = new Date(t.getTime() + GIORNO)) {
    const k = secchiello(iso(t), modo);
    if (!map.has(k)) map.set(k, { date: k, income: 0, expense: 0 });
  }

  // 2. i movimenti dentro al secchiello che gli compete
  const versa = (rows: DailyStats[], key: "income" | "expense") => {
    rows.forEach((r) => {
      const giorno = String(r.period_date).split("T")[0];
      const k = secchiello(giorno, modo);
      const cur = map.get(k) ?? { date: k, income: 0, expense: 0 };
      cur[key] += Number(r.total);
      map.set(k, cur);
    });
  };
  versa(income, "income");
  versa(expense, "expense");

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

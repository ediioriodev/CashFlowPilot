"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Info, Receipt, Repeat, Store, Tag } from "lucide-react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import PeriodBar from "@/components/layout/PeriodBar";
import ScopeSwitch from "@/components/ui/ScopeSwitch";
import {
  Card,
  CardHeader,
  CatRow,
  EmptyState,
  Eyebrow,
  Modal,
  Note,
  Pill,
  SegTabs,
  Skeleton,
} from "@/components/ui/kit";
import { Bars, StackBar, AreaTrend } from "@/components/ui/charts";
import { usePeriod } from "@/context/PeriodContext";
import { usePeriodExpenses } from "@/hooks/usePeriodExpenses";
import { useScope } from "@/context/ScopeContext";
import { expenseService } from "@/services/expenseService";
import { buildOverview } from "@/lib/finance";
import { formatCurrency } from "@/lib/formatUtils";

type Vista = "uscite" | "entrate" | "saldo";

/** Sfumature dello stesso accento: una sola scala, non tre palette diverse. */
const catColor = (i: number) => `color-mix(in srgb, var(--accent) ${Math.max(20, 100 - i * 14)}%, var(--surface-3))`;

/** Sposta una data ISO di n mesi (negativo = indietro), tenendo il giorno. */
function shiftMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, d));
  return t.toISOString().slice(0, 10);
}

function dayBefore(iso: string): string {
  const t = new Date(iso + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
}

/** Quanti periodi indietro guardare per dire «il solito». */
const MESI_CONFRONTO = 3;

export default function AnalisiPage() {
  const { label, isCurrentPeriod } = usePeriod();
  const { transactions, overview: o, loading } = usePeriodExpenses();
  const [vista, setVista] = useState<Vista>("uscite");
  const [dettaglio, setDettaglio] = useState<string | null>(null);

  const totale = vista === "uscite" ? o.realOut : vista === "entrate" ? o.realIn : o.saldoReale;
  const previsto = vista === "uscite" ? o.planOut : vista === "entrate" ? o.planIn : o.saldoPrevisto;

  /* ---------- «Rispetto al solito» ----------
     La domanda della schermata (DIREZIONE-A §1) chiede un confronto: i tre
     periodi prima di quello mostrato, stessa lunghezza, contati sul reale. */
  const { range } = usePeriod();
  const { scope, isInitialized } = useScope();
  const [passati, setPassati] = useState<{ uscite: number; entrate: number; saldo: number }[] | null>(null);

  useEffect(() => {
    if (!isInitialized || !range.start) return;
    let vivo = true;
    const inizio = shiftMonths(range.start, -MESI_CONFRONTO);
    const fine = dayBefore(range.start);
    expenseService
      .getExpenses(inizio, fine, scope)
      .then((righe) => {
        if (!vivo) return;
        const periodi = Array.from({ length: MESI_CONFRONTO }, (_, i) => {
          const start = shiftMonths(range.start, -(i + 1));
          const end = dayBefore(shiftMonths(range.start, -i));
          const ov = buildOverview(
            (righe ?? []).filter((t) => t.data_spesa >= start && t.data_spesa <= end),
            { start, end }
          );
          return { uscite: ov.realOut, entrate: ov.realIn, saldo: ov.saldoReale };
        });
        setPassati(periodi);
      })
      .catch(() => vivo && setPassati(null));
    return () => {
      vivo = false;
    };
  }, [range.start, scope, isInitialized]);

  const media = useMemo(() => {
    if (!passati) return null;
    const conDati = passati.filter((p) => p.uscite !== 0 || p.entrate !== 0);
    if (conDati.length === 0) return null;
    const somma = conDati.reduce((s, p) => s + p[vista], 0);
    return { valore: somma / conDati.length, mesi: conDati.length };
  }, [passati, vista]);

  // Per entrate e saldo le categorie si ricalcolano sul tipo scelto.
  const categorie = useMemo(() => {
    if (vista === "uscite") return o.categorie;
    const map = new Map<string, { name: string; real: number; plan: number }>();
    transactions
      .filter((t) => (vista === "entrate" ? t.tipo_transazione === "entrata" : true))
      .forEach((t) => {
        const name = (t.ambito || "").trim() || "Senza categoria";
        const c = map.get(name) ?? { name, real: 0, plan: 0 };
        const signed =
          vista === "saldo" && t.tipo_transazione === "spesa" ? -Number(t.importo) : Number(t.importo);
        c.plan += signed;
        if (t.confermata) c.real += signed;
        map.set(name, c);
      });
    return [...map.values()].sort((a, b) => Math.abs(b.plan) - Math.abs(a.plan));
  }, [vista, o.categorie, transactions]);

  const movimentiCategoria = useMemo(
    () =>
      transactions
        .filter((t) => ((t.ambito || "").trim() || "Senza categoria") === dettaglio)
        .filter((t) =>
          vista === "uscite" ? t.tipo_transazione === "spesa" : vista === "entrate" ? t.tipo_transazione === "entrata" : true
        )
        .sort((a, b) => b.data_spesa.localeCompare(a.data_spesa)),
    [transactions, dettaglio, vista]
  );

  const totaleCategorie = categorie.reduce((s, c) => s + Math.abs(c.plan), 0) || 1;

  return (
    <ProtectedRoute>
      <PageHeader title="Analisi" subtitle={label}>
        <ScopeSwitch />
        <PeriodBar />
        <SegTabs
          ariaLabel="Cosa guardare"
          value={vista}
          onChange={setVista}
          options={[
            { value: "uscite", label: "Uscite", tone: "neg" },
            { value: "entrate", label: "Entrate", tone: "pos" },
            { value: "saldo", label: "Saldo" },
          ]}
        />
      </PageHeader>

      <PageBody
        main={
          <>
            {/* ---------- Totale + ritmo ---------- */}
            <Card className="p-4 lg:p-5">
              {loading ? (
                <>
                  <Skeleton className="h-8 w-44" />
                  <Skeleton className="mt-4 h-[150px] w-full" />
                </>
              ) : (
                <>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <Eyebrow>
                        {vista === "uscite" ? "Uscite del periodo" : vista === "entrate" ? "Entrate del periodo" : "Saldo del periodo"}
                      </Eyebrow>
                      <p
                        className="tnum mt-1 text-[28px] font-extrabold leading-none lg:text-[32px]"
                        style={{
                          color:
                            vista === "uscite" ? "var(--neg)" : vista === "entrate" ? "var(--pos)" : totale >= 0 ? "var(--pos)" : "var(--neg)",
                        }}
                      >
                        {formatCurrency(totale)}
                      </p>
                      <p className="mt-1.5 text-[13px] text-muted">
                        previsti <strong className="tnum font-bold text-ink">{formatCurrency(previsto)}</strong> a fine
                        periodo
                      </p>
                    </div>
                  </div>

                  {/* Il confronto al posto della vecchia pastiglia «95%», che non
                      diceva di cosa fosse la percentuale. Il periodo in corso si
                      confronta sulla stima di fine periodo, non sul parziale. */}
                  {media && (
                    <p className="-mt-2 mb-4 text-[13px] text-muted">
                      {media.mesi === 1 ? "Il periodo prima" : `In media nei ${media.mesi} periodi prima`}:{" "}
                      <strong className="tnum font-bold text-ink">{formatCurrency(media.valore)}</strong>
                      {vista !== "saldo" && media.valore > 0 && (
                        <>
                          {" "}
                          · {isCurrentPeriod ? "questo, a fine periodo," : "questo"}{" "}
                          {(() => {
                            const base = isCurrentPeriod ? previsto : totale;
                            const diff = Math.round(((base - media.valore) / media.valore) * 100);
                            const buono = vista === "uscite" ? diff <= 0 : diff >= 0;
                            return (
                              <strong
                                className="tnum font-bold"
                                style={{ color: Math.abs(diff) < 5 ? "var(--muted)" : buono ? "var(--pos)" : "var(--neg)" }}
                              >
                                {Math.abs(diff) < 5 ? "in linea" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)}%`}
                              </strong>
                            );
                          })()}
                        </>
                      )}
                    </p>
                  )}

                  {vista === "saldo" ? (
                    <AreaTrend
                      values={o.serie}
                      cutIndex={o.serieCut}
                      ariaLabel={`Saldo cumulato: ${formatCurrency(o.saldoReale)} a oggi, stima ${formatCurrency(o.saldoPrevisto)}.`}
                    />
                  ) : (
                    <Bars
                      items={o.settimane}
                      tone={vista === "entrate" ? "pos" : "accent"}
                      ariaLabel="Andamento per settimana; le settimane future sono previsioni."
                    />
                  )}
                  <Note icon={Info}>
                    barra piena = già successo, tratteggiata = ancora previsto
                  </Note>
                </>
              )}
            </Card>

            {/* ---------- Composizione ---------- */}
            <Card className="p-4 lg:p-5">
              <CardHeader
                title="Dove vanno i soldi"
                hint={loading ? undefined : `${categorie.length} categorie`}
              />
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full rounded-pill" />
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : categorie.length === 0 ? (
                <EmptyState
                  icon={Tag}
                  title="Nessun dato nel periodo"
                  body="Cambia periodo o aggiungi qualche movimento."
                />
              ) : (
                <>
                  <StackBar
                    height={18}
                    ariaLabel="Composizione per categoria"
                    items={categorie.map((c, i) => ({
                      label: c.name,
                      value: Math.abs(c.plan),
                      color: catColor(i),
                    }))}
                  />
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                    {categorie.slice(0, 6).map((c, i) => (
                      <span key={c.name} className="inline-flex items-center gap-1.5 text-[11.5px] text-muted">
                        <i className="h-2.5 w-2.5 rounded-sm" style={{ background: catColor(i) }} aria-hidden />
                        {c.name}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col">
                    {categorie.map((c, i) => (
                      <CatRow
                        key={c.name}
                        icon={Tag}
                        name={c.name}
                        sub={
                          Math.abs(c.plan - c.real) > 0.01
                            ? `previsti ${formatCurrency(Math.abs(c.plan))}`
                            : undefined
                        }
                        percent={(Math.abs(c.plan) / totaleCategorie) * 100}
                        tone={catColor(i)}
                        value={formatCurrency(c.real)}
                        onClick={() => setDettaglio(c.name)}
                      />
                    ))}
                  </div>

                  {/* Alternativa testuale: un grafico da solo non è leggibile
                      da uno screen reader. */}
                  <details className="mt-4">
                    <summary className="min-h-10 cursor-pointer text-xs font-semibold text-accent">
                      Mostra i dati in tabella
                    </summary>
                    <table className="mt-2 w-full border-collapse text-xs">
                      <caption className="sr-only">Totali per categoria nel periodo</caption>
                      <thead>
                        <tr>
                          <th scope="col" className="border-b border-line py-2 text-left font-semibold text-faint">Categoria</th>
                          <th scope="col" className="border-b border-line py-2 text-right font-semibold text-faint">Reale</th>
                          <th scope="col" className="border-b border-line py-2 text-right font-semibold text-faint">Previsto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categorie.map((c) => (
                          <tr key={c.name}>
                            <td className="border-b border-line py-2 text-muted">{c.name}</td>
                            <td className="tnum border-b border-line py-2 text-right">{formatCurrency(c.real)}</td>
                            <td className="tnum border-b border-line py-2 text-right text-faint">{formatCurrency(c.plan)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </>
              )}
            </Card>
          </>
        }
        side={
          <>
            <Card className="p-4 lg:p-5">
              <CardHeader
                title="Fisse e abbonamenti"
                action={
                  <Link href="/ricorrenti" className="flex items-center gap-1 p-1.5 text-xs font-semibold text-accent">
                    Apri <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                }
              />
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-card bg-accent-soft text-accent">
                  <Repeat className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-[13px] leading-relaxed text-muted">
                  Quanto ti costano davvero le spese che si ripetono — al mese <em>e all&apos;anno</em>.
                </p>
              </div>
            </Card>

            <Card className="adv-only p-4 lg:p-5">
              <CardHeader title="Dove spendi di più" hint="Per negozio o beneficiario" />
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : o.negozi.length === 0 ? (
                <p className="py-4 text-center text-xs text-faint">Nessun negozio registrato nel periodo.</p>
              ) : (
                <div className="flex flex-col">
                  {o.negozi.slice(0, 8).map((m) => (
                    <CatRow
                      key={m.name}
                      icon={Store}
                      name={m.name}
                      sub={`${m.count} ${m.count === 1 ? "movimento" : "movimenti"}`}
                      percent={(m.total / (o.negozi[0]?.total || 1)) * 100}
                      value={formatCurrency(m.total)}
                    />
                  ))}
                </div>
              )}
            </Card>

            {isCurrentPeriod && (
              <Card className="adv-only p-4 lg:p-5">
                <CardHeader title="A fine periodo" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Stima del saldo</span>
                  <span
                    className="tnum text-lg font-bold"
                    style={{ color: o.saldoPrevisto >= 0 ? "var(--pos)" : "var(--neg)" }}
                  >
                    {formatCurrency(o.saldoPrevisto)}
                  </span>
                </div>
                <Note icon={Info}>
                  comprende {formatCurrency(o.impegnato)} di uscite previste e {formatCurrency(o.atteso)} di entrate
                  attese
                </Note>
              </Card>
            )}
          </>
        }
      />

      {/* ---------- Dettaglio categoria: si apre, non sta a colpo d'occhio ---------- */}
      <Modal open={!!dettaglio} onClose={() => setDettaglio(null)} title={dettaglio ?? ""} size="md">
        {movimentiCategoria.length === 0 ? (
          <p className="py-6 text-center text-sm text-faint">Nessun movimento con questi filtri.</p>
        ) : (
          <ul className="-mx-1 max-h-[60vh] overflow-y-auto">
            {movimentiCategoria.map((t) => (
              <li key={t.id} className="flex items-center gap-3 border-b border-line px-1 py-3 last:border-0">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-md"
                  style={{
                    background: t.tipo_transazione === "entrata" ? "var(--pos-soft)" : "var(--surface-3)",
                    color: t.tipo_transazione === "entrata" ? "var(--pos)" : "var(--muted)",
                  }}
                >
                  <Receipt className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.negozio || "Senza nome"}</p>
                  <p className="truncate text-xs text-faint">
                    {new Date(t.data_spesa + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                    {t.note_spese ? ` · ${t.note_spese}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="tnum text-sm font-bold"
                    style={{
                      color: t.tipo_transazione === "entrata" ? "var(--pos)" : "var(--text)",
                      opacity: t.confermata ? 1 : 0.6,
                    }}
                  >
                    {t.tipo_transazione === "entrata" ? "+" : "−"}
                    {formatCurrency(Number(t.importo))}
                  </p>
                  {!t.confermata && <Pill tone="warn" className="mt-0.5">previsto</Pill>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </ProtectedRoute>
  );
}

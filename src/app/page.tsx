"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Info,
  Repeat,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import PeriodBar from "@/components/layout/PeriodBar";
import ScopeSwitch from "@/components/ui/ScopeSwitch";
import {
  Button,
  Card,
  CardHeader,
  Eyebrow,
  EmptyState,
  Modal,
  Note,
  Pill,
  Skeleton,
  CatRow,
} from "@/components/ui/kit";
import { AreaTrend, Bars, SplitBar, MiniBar, ProgressTrack } from "@/components/ui/charts";
import { usePeriod } from "@/context/PeriodContext";
import { useScope } from "@/context/ScopeContext";
import { usePeriodExpenses } from "@/hooks/usePeriodExpenses";
import { expenseService } from "@/services/expenseService";
import { budgetService, budgetTotals, STATO_TONE, statoDi, type BudgetStatus } from "@/services/budgetService";
import { goalService, goalTotals, type Goal } from "@/services/goalService";
import { formatCurrency } from "@/lib/formatUtils";
import { periodProgress } from "@/lib/finance";

const CAT_ICON = Wallet;

export default function OggiPage() {
  const { range, label, progressLabel, daysLeft, isCurrentPeriod } = usePeriod();
  const { scope, isInitialized } = useScope();
  const { overview: o, loading, patch } = usePeriodExpenses();
  const [explain, setExplain] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [buste, setBuste] = useState<BudgetStatus[]>([]);
  const [obiettivi, setObiettivi] = useState<Goal[]>([]);

  const alGiorno = daysLeft > 0 ? o.libero / daysLeft : o.libero;
  const elapsed = useMemo(() => periodProgress(range), [range]);

  /* Le tile "Budget" e "Obiettivi" compaiono solo quando c'è qualcosa
     da mostrare: senza tetti o salvadanai (o prima delle migrazioni)
     restano le tile di sempre. */
  const loadModuli = useCallback(async () => {
    if (!isInitialized) return;
    const [b, g] = await Promise.all([
      budgetService.getStatus(range, scope),
      goalService.list(scope),
    ]);
    setBuste(b.data);
    setObiettivi(g.data);
  }, [range, scope, isInitialized]);

  useEffect(() => {
    loadModuli();
  }, [loadModuli]);

  const budget = useMemo(() => budgetTotals(buste), [buste]);
  const risparmi = useMemo(() => goalTotals(obiettivi), [obiettivi]);

  const confirm = async (id: number) => {
    setConfirming(id);
    try {
      await expenseService.confirmExpense(id, scope);
      patch(id, { confermata: true });
      toast.success("Movimento confermato");
    } catch (e) {
      console.error(e);
      toast.error("Non è stato possibile confermare", {
        action: { label: "Riprova", onClick: () => confirm(id) },
      });
    } finally {
      setConfirming(null);
    }
  };

  return (
    <ProtectedRoute>
      <PageHeader title="Oggi" subtitle={`${label}${isCurrentPeriod ? ` · ${progressLabel}` : ""}`}>
        <ScopeSwitch />
        <PeriodBar />
      </PageHeader>

      <PageBody
        main={
          <>
            {/* ---------- 1. Il numero ---------- */}
            <Card className="p-5 lg:p-6">
              {loading ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <Skeleton className="h-[168px] w-[300px] max-w-full rounded-card" />
                  <Skeleton className="h-4 w-52" />
                </div>
              ) : (
                <>
                  <SplitBar
                    ariaLabel={`Del periodo: ${formatCurrency(o.realOut)} già spesi, ${formatCurrency(
                      o.impegnato
                    )} impegnati in spese previste, ${formatCurrency(o.libero)} ancora liberi.`}
                    segments={[
                      { value: Math.max(0, o.realOut), tone: "neg", label: "Speso" },
                      { value: o.impegnato, tone: "warn", planned: true, label: "Impegnato" },
                      ...(o.accantonato > 0
                        ? [{ value: o.accantonato, tone: "pos" as const, label: "Da parte" }]
                        : []),
                      { value: Math.max(0, o.libero), tone: "accent", label: "Libero" },
                    ]}
                  >
                    <Eyebrow>{o.libero >= 0 ? "Puoi spendere" : "Sei oltre il disponibile"}</Eyebrow>
                    <p
                      className="tnum mt-1 text-[34px] font-extrabold leading-none lg:text-[40px]"
                      style={{ color: o.libero >= 0 ? "var(--accent)" : "var(--neg)" }}
                    >
                      {formatCurrency(Math.abs(o.libero))}
                    </p>
                  </SplitBar>

                  <div className="mt-2 flex gap-2">
                    <LegendItem swatch="var(--neg)" label="Speso" value={o.realOut} />
                    <LegendItem hatch label="Impegnato" value={o.impegnato} />
                    {o.accantonato > 0 && (
                      <LegendItem swatch="var(--pos)" label="Da parte" value={o.accantonato} />
                    )}
                    <LegendItem swatch="var(--accent)" label="Libero" value={o.libero} accent />
                  </div>

                  <Note icon={CalendarDays}>
                    {daysLeft > 0 && o.libero < 0 ? (
                      /* «-77,50 € al giorno» non è una cifra che si possa spendere:
                         in rosso la frase dice quanto si è oltre, non una media. */
                      <>restano {daysLeft} giorni · ogni nuova spesa allarga lo scoperto</>
                    ) : daysLeft > 0 ? (
                      <>
                        circa <strong className="tnum font-bold text-muted">{formatCurrency(alGiorno)}</strong> al
                        giorno · restano {daysLeft} giorni
                      </>
                    ) : (
                      <>periodo chiuso · saldo finale {formatCurrency(o.saldoPrevisto)}</>
                    )}
                  </Note>

                  <button
                    type="button"
                    onClick={() => setExplain(true)}
                    className="mx-auto mt-1 flex min-h-10 items-center gap-1.5 px-3 text-xs font-semibold text-accent"
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden />
                    Come si calcola
                  </button>
                </>
              )}
            </Card>

            {/* ---------- 2. Tre porte ---------- */}
            <div className="grid grid-cols-3 gap-3">
              {buste.length > 0 ? (
                <Tile
                  href="/budget"
                  label="Budget"
                  value={
                    budget.residuo >= 0
                      ? `restano ${formatCurrency(budget.residuo)}`
                      : `oltre di ${formatCurrency(-budget.residuo)}`
                  }
                  misura={
                    <MiniBar
                      percent={budget.percentuale}
                      tone={STATO_TONE[statoDi(budget.percentuale)]}
                      ariaLabel={`Budget: usato il ${Math.round(budget.percentuale)} per cento dei tetti.`}
                    >
                      {Math.round(budget.percentuale) + "%"}
                    </MiniBar>
                  }
                />
              ) : (
                <Tile
                  href="/analisi"
                  label="Speso"
                  value={loading ? "—" : o.planOut > o.realOut ? `${formatCurrency(o.realOut)} di ${formatCurrency(o.planOut)} previsti` : formatCurrency(o.realOut)}
                  misura={<MiniBar percent={o.planOut ? (o.realOut / o.planOut) * 100 : 0} tone="neg" ariaLabel="Uscite sostenute rispetto a quelle previste nel periodo">{o.planOut ? Math.round((o.realOut / o.planOut) * 100) + "%" : "—"}</MiniBar>}
                />
              )}
              <Tile
                href="/spese?filtro=da-confermare"
                label="Da confermare"
                value={loading ? "—" : o.daConfermare.length > 0 ? formatCurrency(Math.abs(o.daConfermareTotale)) : "tutto confermato"}
                misura={
                  o.daConfermare.length > 0 ? (
                    <span className="grid h-13 w-13 place-items-center rounded-full bg-warn-soft text-2xl font-extrabold text-warn">
                      {o.daConfermare.length}
                    </span>
                  ) : (
                    // Zero non è un avviso: niente arancione, una spunta.
                    <span className="grid h-13 w-13 place-items-center rounded-full bg-pos-soft text-pos">
                      <Check className="h-6 w-6" aria-hidden />
                    </span>
                  )
                }
              />
              {obiettivi.length > 0 ? (
                <Tile
                  href="/obiettivi"
                  label="Obiettivi"
                  value={`${formatCurrency(risparmi.accantonato)} da parte`}
                  misura={
                    <MiniBar
                      percent={risparmi.percentuale}
                      tone="pos"
                      ariaLabel={`Obiettivi: raggiunto il ${Math.round(risparmi.percentuale)} per cento.`}
                    >
                      {Math.round(risparmi.percentuale) + "%"}
                    </MiniBar>
                  }
                />
              ) : (
                <Tile
                  href="/ricorrenti"
                  label="Fisse"
                  value="quanto costano"
                  misura={
                    <span className="grid h-13 w-13 place-items-center rounded-full bg-accent-soft text-accent">
                      <Repeat className="h-6 w-6" aria-hidden />
                    </span>
                  }
                />
              )}
            </div>

            {/* ---------- 3. Da confermare ----------
                Solo se c'è qualcosa da fare: vuoto ripeteva la tessera «Da confermare 0»
                e in Semplice portava la schermata oltre i tre blocchi. */}
            {(loading || o.daConfermare.length > 0) && (
            <Card>
              <div className="p-4 pb-2 lg:p-5 lg:pb-2">
                <CardHeader
                  className="mb-1"
                  title="Da confermare"
                  hint="Quando le confermi entrano nel saldo reale."
                  action={
                    o.daConfermare.length > 0 ? (
                      <Pill tone="warn">{o.daConfermare.length} in attesa</Pill>
                    ) : undefined
                  }
                />
              </div>

              {loading ? (
                <div className="space-y-3 p-4 pt-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {o.daConfermare.slice(0, 5).map((t) => (
                    <li key={t.id} className="flex min-h-16 items-center gap-3 px-4 py-3 lg:px-5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-warn-soft text-warn">
                        {t.tipo_transazione === "entrata" ? (
                          <ArrowDownLeft className="h-4 w-4" aria-hidden />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{t.negozio || t.ambito}</p>
                        <p className="truncate text-xs text-faint">
                          {new Date(t.data_spesa + "T00:00:00").toLocaleDateString("it-IT", {
                            day: "numeric",
                            month: "short",
                          })}
                          {t.negozio && t.ambito ? ` · ${t.ambito}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="pos"
                        icon={Check}
                        loading={confirming === t.id}
                        onClick={() => t.id && confirm(t.id)}
                      >
                        <span className="tnum">{formatCurrency(Number(t.importo))}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {o.daConfermare.length > 5 && (
                <Link
                  href="/spese?filtro=da-confermare"
                  className="flex min-h-12 items-center justify-center gap-1 border-t border-line text-xs font-semibold text-accent"
                >
                  Vedi tutte e {o.daConfermare.length}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </Card>
            )}
          </>
        }
        side={
          <>
            {/* ---------- Andamento · solo Avanzata ----------
                In Semplice la schermata risponde a una domanda sola —
                «quanto posso spendere» — e questo riquadro non è quella. */}
            <Card className="adv-only p-4 lg:p-5">
              <CardHeader
                title="Andamento del saldo"
                action={
                  <Link href="/report" className="flex items-center gap-1 p-1.5 text-xs font-semibold text-accent">
                    Report <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                }
              />
              {loading ? (
                <Skeleton className="h-[170px] w-full" />
              ) : o.count === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="Ancora nessun movimento"
                  body="Aggiungi la prima spesa per vedere l'andamento del periodo."
                  action={
                    <Link href="/spese/nuova">
                      <Button variant="primary" size="sm">Aggiungi spesa</Button>
                    </Link>
                  }
                />
              ) : (
                <>
                  <AreaTrend
                    values={o.serie}
                    cutIndex={o.serieCut}
                    ariaLabel={`Saldo cumulato del periodo: ${formatCurrency(
                      o.saldoReale
                    )} a oggi, stima ${formatCurrency(o.saldoPrevisto)} a fine periodo.`}
                    startLabel={new Date(range.start + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                    endLabel={new Date(range.end + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                  />
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <i className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--accent)" }} aria-hidden />
                      già successo
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <i
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(45deg, var(--accent) 0 2px, transparent 2px 4px)",
                        }}
                        aria-hidden
                      />
                      previsto
                    </span>
                  </div>
                </>
              )}
            </Card>

            {/* ---------- Ritmo di spesa · solo Avanzata ---------- */}
            <Card className="adv-only p-4 lg:p-5">
              <CardHeader title="Ritmo di spesa" action={<Pill>a settimana</Pill>} />
              {loading ? (
                <Skeleton className="h-[150px] w-full" />
              ) : (
                <>
                  <Bars
                    items={o.settimane}
                    tone="accent"
                    ariaLabel="Uscite per settimana del periodo; le settimane future sono previsioni."
                  />
                  <ProgressTrack
                    percent={o.planOut ? (o.realOut / o.planOut) * 100 : 0}
                    markAt={elapsed}
                    className="mt-4"
                    ariaLabel="Uscite sostenute rispetto al previsto"
                  />
                  <Note icon={Target}>
                    la tacca è dove dovresti essere a {Math.round(elapsed)}% del periodo
                  </Note>
                </>
              )}
            </Card>

            {/* ---------- A fine periodo · solo Avanzata ---------- */}
            <Card className="adv-only p-4 lg:p-5">
              <CardHeader title="A fine periodo" />
              <div className="grid grid-cols-2 gap-4">
                <Stat label="In cassa oggi" value={o.saldoReale} loading={loading} />
                <Stat
                  label="Stima a fine periodo"
                  value={o.saldoPrevisto}
                  loading={loading}
                  tone={o.saldoPrevisto >= 0 ? "pos" : "neg"}
                />
              </div>
              <hr className="my-4 border-line" />
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Entrate incassate" value={o.realIn} loading={loading} sub={`di ${formatCurrency(o.planIn)}`} />
                <Stat label="Uscite sostenute" value={o.realOut} loading={loading} sub={`di ${formatCurrency(o.planOut)}`} />
              </div>
            </Card>

            {/* ---------- Dove vanno i soldi ---------- */}
            <Card className="p-4 lg:p-5">
              <CardHeader
                title="Dove vanno i soldi"
                action={
                  <Link href="/analisi" className="flex items-center gap-1 p-1.5 text-xs font-semibold text-accent">
                    Analisi <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                }
              />
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : o.categorie.length === 0 ? (
                <p className="py-4 text-center text-xs text-faint">Nessuna uscita in questo periodo.</p>
              ) : (
                <div className="flex flex-col">
                  {o.categorie.slice(0, 5).map((c) => (
                    <CatRow
                      key={c.name}
                      icon={CAT_ICON}
                      name={c.name}
                      sub={c.plan > c.real ? `previsti ${formatCurrency(c.plan)}` : undefined}
                      percent={o.planOut ? (c.plan / o.planOut) * 100 : 0}
                      value={formatCurrency(c.real)}
                    />
                  ))}
                </div>
              )}
            </Card>
          </>
        }
      />

      {/* ---------- Spiegazione on demand ---------- */}
      <Modal
        open={explain}
        onClose={() => setExplain(false)}
        title="Come si calcola «Puoi spendere»"
        size="md"
        footer={<Button variant="primary" onClick={() => setExplain(false)}>Ho capito</Button>}
      >
        <div className="space-y-3 text-sm">
          <Row label="Entrate incassate" value={o.realIn} />
          <Row label="Uscite già sostenute" value={-o.realOut} />
          <div className="flex items-center justify-between border-t border-line pt-3 font-semibold">
            <span>In cassa oggi</span>
            <span className="tnum">{formatCurrency(o.saldoReale)}</span>
          </div>
          <Row label="Spese previste entro fine periodo" value={-o.impegnato} />
          {o.accantonato > 0 && (
            <Row label="Messo da parte negli obiettivi" value={-o.accantonato} />
          )}
          <div className="flex items-center justify-between border-t-2 border-line-strong pt-3 text-base font-bold">
            <span>Puoi spendere</span>
            <span className="tnum" style={{ color: "var(--accent)" }}>{formatCurrency(o.libero)}</span>
          </div>
          <p className="rounded-md bg-accent-soft p-3 text-xs leading-relaxed text-muted">
            È un calcolo <strong className="font-semibold text-ink">prudente</strong>: non conta le{" "}
            <strong className="tnum font-semibold text-ink">{formatCurrency(o.atteso)}</strong> di entrate che devi
            ancora incassare. Contandole, a fine periodo dovresti chiudere con{" "}
            <strong className="tnum font-semibold text-ink">{formatCurrency(o.saldoPrevisto)}</strong>.
          </p>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}

/* ---------------- pezzi locali ---------------- */

function LegendItem({
  swatch,
  hatch,
  label,
  value,
  accent,
}: {
  swatch?: string;
  hatch?: boolean;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] font-semibold text-faint">
        <i
          className="h-2.5 w-2.5 shrink-0 rounded-sm"
          style={
            hatch
              ? {
                  background: "var(--warn-soft)",
                  backgroundImage: "repeating-linear-gradient(45deg, var(--warn) 0 2px, transparent 2px 4px)",
                }
              : { background: swatch }
          }
          aria-hidden
        />
        {label}
      </span>
      <span className="tnum text-sm font-bold" style={accent ? { color: "var(--accent)" } : undefined}>
        {formatCurrency(value)}
      </span>
    </span>
  );
}

function Tile({
  href,
  label,
  value,
  misura,
}: {
  href: string;
  label: string;
  value: string;
  misura: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface p-3 text-center shadow-card transition-colors hover:bg-surface-2"
    >
      {misura}
      <span className="text-xs font-semibold">{label}</span>
      <span className="tnum text-[11.5px] text-faint">{value}</span>
    </Link>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
  loading,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "pos" | "neg";
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11.5px] font-semibold text-faint">{label}</span>
      {loading ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <span
          className="tnum text-xl font-bold"
          style={tone ? { color: tone === "pos" ? "var(--pos)" : "var(--neg)" } : undefined}
        >
          {formatCurrency(value)}
        </span>
      )}
      {sub && <span className="tnum text-[11.5px] text-faint">{sub}</span>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-muted">
      <span>{label}</span>
      <span className="tnum font-semibold text-ink">
        {value < 0 ? "− " : ""}
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

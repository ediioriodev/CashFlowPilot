"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Pencil,
  Target,
  Trash2,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import PeriodBar from "@/components/layout/PeriodBar";
import MigrationNotice from "@/components/ui/MigrationNotice";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Eyebrow,
  Field,
  Modal,
  Note,
  Pill,
  Skeleton,
  inputClass,
} from "@/components/ui/kit";
import { Bars, SplitBar, ProgressTrack } from "@/components/ui/charts";
import { usePeriod } from "@/context/PeriodContext";
import { useScope } from "@/context/ScopeContext";
import { useAuth } from "@/context/AuthContext";
import { usePeriodExpenses } from "@/hooks/usePeriodExpenses";
import { budgetService, STATO_LABEL, STATO_TONE, type BudgetStatus } from "@/services/budgetService";
import { MIGRATION } from "@/lib/moduleState";
import { formatCurrency } from "@/lib/formatUtils";
import { groupByDay, periodProgress } from "@/lib/finance";

const STATO_ICON = {
  ok: Check,
  attenzione: TriangleAlert,
  superato: AlertTriangle,
} as const;

function parseAmount(raw: string): number | null {
  const clean = raw.replace(/\s/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/**
 * Il dettaglio di una busta: il principio "il dettaglio si apre".
 * In /budget vedi l'anello, qui vedi dove sono finiti i soldi.
 */
export default function DettaglioBudgetPage({ params }: { params: Promise<{ categoria: string }> }) {
  const categoria = decodeURIComponent(use(params).categoria);
  const { range, label, daysLeft, loading: periodLoading } = usePeriod();
  const { scope, isInitialized } = useScope();
  const { user } = useAuth();
  const userId = user?.id;
  const { transactions, loading: txLoading } = usePeriodExpenses();

  const [busta, setBusta] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* Lo stato si aggiorna nella callback della promise, mai nel corpo
     dell'effetto: niente render a cascata. `nonce` forza la rilettura
     dopo che il tetto è cambiato. */
  const [nonce, setNonce] = useState(0);
  const ricarica = useCallback(() => setNonce((n) => n + 1), []);

  // stesse condizioni di /budget: si parte a sessione e periodo assestati
  const { start, end } = range;
  useEffect(() => {
    if (!isInitialized || periodLoading || !userId) return;
    let alive = true;
    budgetService.getOne(categoria, { start, end }, scope).then((res) => {
      if (!alive) return;
      setBusta(res.data);
      setNeedsMigration(res.needsMigration);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [categoria, start, end, scope, isInitialized, periodLoading, userId, nonce]);

  /* ---- i movimenti di questa categoria ---- */
  const movimenti = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.tipo_transazione === "spesa" &&
          (t.ambito || "").trim().toLowerCase() === categoria.toLowerCase()
      ),
    [transactions, categoria]
  );

  const giorni = useMemo(() => groupByDay(movimenti), [movimenti]);

  /* ---- ritmo settimanale della sola categoria ---- */
  const settimane = useMemo(() => {
    const DAY = 86_400_000;
    const toDate = (iso: string) => new Date(iso + "T00:00:00");
    const oggi = new Date().toISOString().split("T")[0];
    const fmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });

    const out: { label: string; value: number; planned?: boolean; partial?: boolean }[] = [];
    const inizio = toDate(range.start).getTime();
    const fine = toDate(range.end).getTime();

    for (let t = inizio, i = 0; t <= fine; t += 7 * DAY, i++) {
      const from = new Date(t).toISOString().split("T")[0];
      const toTime = Math.min(t + 6 * DAY, fine);
      const to = new Date(toTime).toISOString().split("T")[0];
      const value = movimenti
        .filter((m) => m.data_spesa >= from && m.data_spesa <= to)
        .reduce((s, m) => s + Number(m.importo || 0), 0);
      out.push({
        label: i === 0 ? fmt.format(toDate(from)) : String(toDate(from).getDate()),
        value,
        planned: from > oggi,
        partial: from <= oggi && to >= oggi,
      });
    }
    return out;
  }, [movimenti, range.start, range.end]);

  const elapsed = useMemo(() => periodProgress(range), [range]);
  const inCorso = loading || txLoading;

  const speso = busta?.spesoReale ?? movimenti
    .filter((m) => m.confermata && m.data_spesa <= new Date().toISOString().split("T")[0])
    .reduce((s, m) => s + Number(m.importo || 0), 0);
  const previsto = busta?.spesoPrevisto ?? movimenti.reduce((s, m) => s + Number(m.importo || 0), 0);
  const impegnato = Math.max(0, previsto - speso);
  const residuo = busta ? busta.residuo : 0;
  const alGiorno = daysLeft > 0 ? Math.max(0, residuo) / daysLeft : Math.max(0, residuo);

  const salva = async () => {
    const tetto = parseAmount(editing ?? "");
    if (tetto === null) {
      setFormError("Inserisci un tetto maggiore di zero.");
      return;
    }
    setSaving(true);
    const res = await budgetService.upsert(categoria, tetto, scope, range.start);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Tetto aggiornato", { description: `${categoria} · ${formatCurrency(tetto)}` });
    setEditing(null);
    ricarica();
  };

  const togli = async () => {
    const res = await budgetService.remove(categoria, scope, range.start);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Tetto rimosso");
    setEditing(null);
    ricarica();
  };

  const StatoIcon = busta ? STATO_ICON[busta.stato] : Target;

  return (
    <ProtectedRoute>
      <PageHeader
        title={categoria}
        subtitle={`Budget · ${label}`}
        backHref="/budget"
        actions={
          !needsMigration ? (
            <Button
              size="sm"
              icon={Pencil}
              onClick={() => {
                setEditing(busta ? String(busta.tetto).replace(".", ",") : "");
                setFormError(null);
              }}
            >
              {busta ? "Tetto" : "Dai un tetto"}
            </Button>
          ) : undefined
        }
      >
        <PeriodBar />
      </PageHeader>

      {needsMigration ? (
        <PageBody
          main={
            <MigrationNotice
              titolo="I budget non sono ancora attivi"
              cosa="Qui vedrai il tetto di questa categoria, quanto ne resta e il ritmo con cui la stai consumando."
              file={MIGRATION.budgets}
            />
          }
        />
      ) : (
        <PageBody
          main={
            <>
              {/* ---------- Il tachimetro della categoria ---------- */}
              <Card className="p-5 lg:p-6">
                {inCorso ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <Skeleton className="h-[168px] w-[300px] max-w-full rounded-card" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ) : !busta ? (
                  <EmptyState
                    icon={Target}
                    title="Questa categoria non ha un tetto"
                    body={`In questo periodo ci hai speso ${formatCurrency(speso)}. Dandole un tetto sapresti sempre quanto ne resta.`}
                    action={
                      <Button variant="primary" icon={Target} onClick={() => { setEditing(""); setFormError(null); }}>
                        Dai un tetto
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <SplitBar
                      ariaLabel={`${categoria}: ${formatCurrency(speso)} spesi, ${formatCurrency(
                        impegnato
                      )} già impegnati, ${formatCurrency(Math.max(0, residuo))} ancora disponibili su un tetto di ${formatCurrency(
                        busta.tetto
                      )}.`}
                      segments={[
                        { value: Math.max(0, speso), tone: "neg", label: "Speso" },
                        { value: impegnato, tone: "warn", planned: true, label: "Impegnato" },
                        { value: Math.max(0, residuo - impegnato), tone: "accent", label: "Resta" },
                      ]}
                    >
                      <Eyebrow>Resta in busta</Eyebrow>
                      <p
                        className="tnum mt-1 text-[32px] font-extrabold leading-none lg:text-[38px]"
                        style={{ color: residuo >= 0 ? "var(--accent)" : "var(--neg)" }}
                      >
                        {formatCurrency(residuo)}
                      </p>
                    </SplitBar>

                    <div className="mt-2 flex items-center justify-center gap-2">
                      <Pill tone={STATO_TONE[busta.stato]} icon={StatoIcon}>
                        {STATO_LABEL[busta.stato]}
                      </Pill>
                      <Pill>
                        <span className="tnum">
                          {formatCurrency(speso)} di {formatCurrency(busta.tetto)}
                        </span>
                      </Pill>
                    </div>

                    <ProgressTrack
                      percent={busta.percentuale}
                      markAt={elapsed}
                      tone={STATO_TONE[busta.stato]}
                      className="mt-5"
                      height={12}
                      ariaLabel={`${Math.round(busta.percentuale)} per cento del tetto`}
                    />

                    <Note icon={CalendarDays}>
                      {residuo < 0 ? (
                        <>hai superato il tetto di {formatCurrency(-residuo)}</>
                      ) : daysLeft > 0 ? (
                        <>
                          circa <strong className="tnum font-bold text-muted">{formatCurrency(alGiorno)}</strong> al
                          giorno · restano {daysLeft} giorni
                        </>
                      ) : (
                        <>periodo chiuso</>
                      )}
                    </Note>
                  </>
                )}
              </Card>

              {/* ---------- I movimenti ---------- */}
              <Card>
                <div className="p-4 pb-2 lg:p-5 lg:pb-2">
                  <CardHeader
                    className="mb-1"
                    title="Dove sono finiti"
                    hint={`${movimenti.length} ${movimenti.length === 1 ? "movimento" : "movimenti"} in ${label}`}
                  />
                </div>
                {inCorso ? (
                  <div className="space-y-3 p-4 pt-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : movimenti.length === 0 ? (
                  <EmptyState
                    icon={Wallet}
                    title="Nessuna spesa in questa categoria"
                    body="In questo periodo non ci hai ancora speso niente."
                    className="py-8"
                  />
                ) : (
                  <div className="flex flex-col">
                    {giorni.map((g) => (
                      <div key={g.date}>
                        <div className="flex items-center justify-between border-y border-line bg-surface-2 px-4 py-1.5 lg:px-5">
                          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
                            {g.label}
                          </span>
                          <span className="tnum text-[11px] font-semibold text-faint">
                            {formatCurrency(Math.abs(g.total))}
                          </span>
                        </div>
                        <ul className="divide-y divide-line">
                          {g.items.map((t) => (
                            <li key={t.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5 lg:px-5">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">{t.negozio || categoria}</p>
                                {t.note_spese && (
                                  <p className="truncate text-xs text-faint">{t.note_spese}</p>
                                )}
                              </div>
                              {!t.confermata && <Pill tone="warn">da confermare</Pill>}
                              <span className="tnum shrink-0 text-sm font-bold">
                                {formatCurrency(Number(t.importo))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                <Link
                  href={`/spese?categoria=${encodeURIComponent(categoria)}`}
                  className="flex min-h-12 items-center justify-center gap-1 border-t border-line text-xs font-semibold text-accent"
                >
                  Apri in Movimenti
                </Link>
              </Card>
            </>
          }
          side={
            <>
              {/* ---------- Ritmo della categoria ---------- */}
              <Card className="p-4 lg:p-5">
                <CardHeader title="Ritmo settimanale" hint="Solo questa categoria." />
                {inCorso ? (
                  <Skeleton className="h-[150px] w-full" />
                ) : (
                  <Bars
                    items={settimane}
                    tone={busta ? STATO_TONE[busta.stato] : "accent"}
                    ariaLabel={`Spese di ${categoria} per settimana; le settimane future sono previsioni.`}
                  />
                )}
              </Card>

              {/* ---------- I conti ---------- */}
              {busta && (
                <Card className="p-4 lg:p-5">
                  <CardHeader title="I conti della busta" />
                  <div className="space-y-3 text-sm">
                    <Riga label="Tetto del periodo" value={busta.tetto} />
                    <Riga label="Già speso" value={-speso} />
                    {impegnato > 0 && <Riga label="Impegnato, non ancora uscito" value={-impegnato} />}
                    <div className="flex items-center justify-between border-t-2 border-line-strong pt-3 text-base font-bold">
                      <span>Resta</span>
                      <span className="tnum" style={{ color: residuo >= 0 ? "var(--accent)" : "var(--neg)" }}>
                        {formatCurrency(residuo)}
                      </span>
                    </div>
                  </div>
                </Card>
              )}
            </>
          }
        />
      )}

      {/* ---------- Modale: modifica del tetto ---------- */}
      <Modal
        open={editing !== null}
        onClose={() => { setEditing(null); setFormError(null); }}
        title={busta ? `Tetto di ${categoria}` : `Dai un tetto a ${categoria}`}
        description="Vale da questo periodo in avanti. I periodi già chiusi restano com'erano."
        footer={
          <>
            {busta && (
              <Button variant="ghost" icon={Trash2} onClick={togli}>
                Togli il tetto
              </Button>
            )}
            <Button variant="secondary" onClick={() => { setEditing(null); setFormError(null); }}>
              Annulla
            </Button>
            <Button variant="primary" icon={Check} loading={saving} onClick={salva}>
              Salva
            </Button>
          </>
        }
      >
        <Field
          label="Tetto per periodo"
          required
          htmlFor="d-tetto"
          error={formError}
          help={`In questo periodo ci hai già speso ${formatCurrency(speso)}.`}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint" aria-hidden>
              €
            </span>
            <input
              id="d-tetto"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={editing ?? ""}
              onChange={(e) => setEditing(e.target.value)}
              placeholder="0,00"
              className={`${inputClass} tnum pl-8`}
            />
          </div>
        </Field>
      </Modal>
    </ProtectedRoute>
  );
}

function Riga({ label, value }: { label: string; value: number }) {
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

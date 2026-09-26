"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Plus, Target, Trash2, TriangleAlert, Wallet } from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import PeriodBar from "@/components/layout/PeriodBar";
import ScopeSwitch from "@/components/ui/ScopeSwitch";
import MigrationNotice from "@/components/ui/MigrationNotice";
import {
  Button,
  Card,
  CardHeader,
  CatRow,
  EmptyState,
  Eyebrow,
  Field,
  Modal,
  Note,
  Pill,
  Skeleton,
  inputClass,
} from "@/components/ui/kit";
import { Bars, ProgressTrack, MiniBar } from "@/components/ui/charts";
import { usePeriod } from "@/context/PeriodContext";
import { useScope } from "@/context/ScopeContext";
import { usePeriodExpenses } from "@/hooks/usePeriodExpenses";
import {
  budgetService,
  budgetTotals,
  STATO_LABEL,
  STATO_TONE,
  type BudgetStatus,
} from "@/services/budgetService";
import { MIGRATION } from "@/lib/moduleState";
import { formatCurrency } from "@/lib/formatUtils";
import { periodProgress } from "@/lib/finance";

const STATO_ICON = {
  ok: Check,
  attenzione: TriangleAlert,
  superato: AlertTriangle,
} as const;

/** Accetta "500" e "500,50": con type=number la virgola non arriva. */
function parseAmount(raw: string): number | null {
  const clean = raw.replace(/\s/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export default function BudgetPage() {
  const router = useRouter();
  const { range, label } = usePeriod();
  const { scope, isInitialized } = useScope();
  const { overview, loading: txLoading } = usePeriodExpenses();

  const [buste, setBuste] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<{ categoria: string; tetto: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* Il caricamento vive dentro l'effetto e aggiorna lo stato solo nella
     callback della promise: così non c'è nessun setState sincrono nel
     corpo dell'effetto (e nessun render a cascata). `nonce` è la leva
     per rileggere dopo una modifica. */
  const [nonce, setNonce] = useState(0);
  const ricarica = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!isInitialized) return;
    let alive = true;
    budgetService.getStatus(range, scope).then((res) => {
      if (!alive) return;
      setBuste(res.data);
      setNeedsMigration(res.needsMigration);
      setError(res.error);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [range, scope, isInitialized, nonce]);

  const totali = useMemo(() => budgetTotals(buste), [buste]);
  const elapsed = useMemo(() => periodProgress(range), [range]);

  /** Categorie su cui stai spendendo senza esserti dato un tetto. */
  const senzaTetto = useMemo(() => {
    const conTetto = new Set(buste.map((b) => b.categoria.toLowerCase()));
    return overview.categorie.filter((c) => !conTetto.has(c.name.toLowerCase())).slice(0, 8);
  }, [buste, overview.categorie]);

  const fuoriBudget = useMemo(() => buste.filter((b) => b.stato !== "ok"), [buste]);

  const salva = async () => {
    if (!editing) return;
    const tetto = parseAmount(editing.tetto);
    if (!editing.categoria.trim()) {
      setFormError("Scegli o scrivi una categoria.");
      return;
    }
    if (tetto === null) {
      setFormError("Inserisci un tetto maggiore di zero.");
      return;
    }

    setSaving(true);
    const res = await budgetService.upsert(editing.categoria, tetto, scope, range.start);
    setSaving(false);

    if (res.needsMigration) {
      toast.error("Modulo non ancora attivo", { description: `Applica ${MIGRATION.budgets}.` });
      return;
    }
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Tetto salvato", {
      description: `${editing.categoria.trim()} · ${formatCurrency(tetto)} al mese, da ${label}`,
    });
    setEditing(null);
    setFormError(null);
    ricarica();
  };

  const togli = async (categoria: string) => {
    const res = await budgetService.remove(categoria, scope, range.start);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Tetto rimosso", { description: `${categoria} non ha più un budget.` });
    setEditing(null);
    ricarica();
  };

  const apri = (categoria: string) => router.push(`/budget/${encodeURIComponent(categoria)}`);

  const inCorso = loading || txLoading;

  return (
    <ProtectedRoute>
      <PageHeader
        title="Budget"
        subtitle={`${label} · ${buste.length} ${buste.length === 1 ? "busta" : "buste"}`}
        actions={
          !needsMigration ? (
            <Button size="sm" icon={Plus} onClick={() => { setEditing({ categoria: "", tetto: "" }); setFormError(null); }}>
              Busta
            </Button>
          ) : undefined
        }
      >
        <ScopeSwitch />
        <PeriodBar />
      </PageHeader>

      {needsMigration ? (
        <PageBody
          main={
            <MigrationNotice
              titolo="I budget non sono ancora attivi"
              cosa="Il budget a buste dà un tetto a ogni categoria e ti dice, giorno per giorno, se stai andando più veloce di quanto potresti."
              file={MIGRATION.budgets}
            />
          }
        />
      ) : (
        <PageBody
          main={
            <>
              {/* ---------- 1. Quanto hai messo da parte per le spese ---------- */}
              <Card className="p-5 lg:p-6">
                {inCorso ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <Skeleton className="h-[120px] w-[120px] rounded-full" />
                    <Skeleton className="h-4 w-52" />
                  </div>
                ) : buste.length === 0 ? (
                  <EmptyState
                    icon={Target}
                    title="Nessun tetto impostato"
                    body="Dai un tetto alle categorie su cui vuoi tenere il passo: qui vedrai quanto ne resta e se stai andando troppo in fretta."
                    action={
                      <Button
                        variant="primary"
                        icon={Plus}
                        onClick={() => { setEditing({ categoria: "", tetto: "" }); setFormError(null); }}
                      >
                        Crea la prima busta
                      </Button>
                    }
                  />
                ) : (
                  <>
                    {/* Un numero e una barra sola: la barrina sopra al numero
                        ripeteva la stessa percentuale della barra sotto. */}
                    <div className="text-center">
                      <Eyebrow>{totali.residuo >= 0 ? "Restano nelle buste" : "Oltre i tetti"}</Eyebrow>
                      <p
                        className="tnum mt-1 text-[30px] font-extrabold leading-none"
                        style={{ color: totali.residuo >= 0 ? "var(--accent)" : "var(--neg)" }}
                      >
                        {formatCurrency(Math.abs(totali.residuo))}
                      </p>
                      <p className="tnum mt-1.5 text-xs text-faint">
                        spesi {formatCurrency(totali.spesoReale)} di {formatCurrency(totali.tetto)} ·{" "}
                        <strong className="font-bold text-muted">{Math.round(totali.percentuale)}%</strong>
                      </p>
                    </div>

                    <ProgressTrack
                      percent={totali.percentuale}
                      markAt={elapsed}
                      tone={STATO_TONE[totali.percentuale > 100 ? "superato" : totali.percentuale >= 85 ? "attenzione" : "ok"]}
                      className="mt-5"
                      height={12}
                      ariaLabel="Speso rispetto al totale dei tetti"
                    />
                    <Note icon={Target}>
                      la tacca è dove dovresti essere a {Math.round(elapsed)}% del periodo
                    </Note>
                  </>
                )}
              </Card>

              {/* ---------- 2. Le buste ---------- */}
              {buste.length > 0 && (
                <Card className="p-4 lg:p-5">
                  <CardHeader
                    title="Le buste"
                    hint="Tocca una busta per vedere dove sono finiti i soldi."
                    action={
                      fuoriBudget.length > 0 ? (
                        <Pill tone={fuoriBudget.some((b) => b.stato === "superato") ? "neg" : "warn"}>
                          {fuoriBudget.length} da tenere d&apos;occhio
                        </Pill>
                      ) : (
                        <Pill tone="pos" icon={Check}>tutte in linea</Pill>
                      )
                    }
                  />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {buste.map((b) => {
                      const Icon = STATO_ICON[b.stato];
                      return (
                        <button
                          key={b.categoria}
                          type="button"
                          onClick={() => apri(b.categoria)}
                          className="flex flex-col items-center gap-1.5 rounded-card border border-line bg-surface p-3 text-center transition-colors hover:bg-surface-2"
                        >
                          <MiniBar
                            percent={b.percentuale}
                            tone={STATO_TONE[b.stato]}
                            width={56}
                            thickness={6}
                            ariaLabel={`${b.categoria}: ${STATO_LABEL[b.stato]}, ${Math.round(
                              b.percentuale
                            )} per cento del tetto.`}
                          >
                            {Math.round(b.percentuale)}%
                          </MiniBar>
                          <span className="w-full truncate text-[12px] font-semibold">{b.categoria}</span>
                          <span
                            className="tnum w-full truncate text-[11px]"
                            style={{ color: b.residuo >= 0 ? "var(--muted)" : "var(--neg)" }}
                          >
                            {b.residuo >= 0
                              ? `restano ${formatCurrency(b.residuo)}`
                              : `oltre di ${formatCurrency(-b.residuo)}`}
                          </span>
                          {/* Stato sempre icona + parola, mai solo colore (DIREZIONE-A §7.1). */}
                          <span
                            className="inline-flex items-center gap-1 text-[10.5px] font-semibold"
                            style={{ color: `var(--${STATO_TONE[b.stato]})` }}
                          >
                            <Icon className="h-3 w-3" aria-hidden />
                            {STATO_LABEL[b.stato]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* ---------- 3. Dettaglio in riga · solo Avanzata ---------- */}
              {buste.length > 0 && (
                <Card className="adv-only p-4 lg:p-5">
                  <CardHeader title="Quanto resta, busta per busta" />
                  <div className="flex flex-col">
                    {buste.map((b) => (
                      <CatRow
                        key={b.categoria}
                        icon={STATO_ICON[b.stato]}
                        name={b.categoria}
                        sub={
                          <>
                            {STATO_LABEL[b.stato]} · {formatCurrency(b.spesoReale)} di {formatCurrency(b.tetto)}
                            {b.spesoPrevisto > b.spesoReale && (
                              <> · previsti {formatCurrency(b.spesoPrevisto)}</>
                            )}
                          </>
                        }
                        percent={b.percentuale}
                        tone={
                          b.stato === "superato"
                            ? "var(--neg)"
                            : b.stato === "attenzione"
                              ? "var(--warn)"
                              : "var(--pos)"
                        }
                        value={
                          <span style={{ color: b.residuo < 0 ? "var(--neg)" : undefined }}>
                            {b.residuo >= 0 ? formatCurrency(b.residuo) : `−${formatCurrency(-b.residuo)}`}
                          </span>
                        }
                        onClick={() => apri(b.categoria)}
                      />
                    ))}
                  </div>
                </Card>
              )}

              {error && (
                <div role="alert" className="rounded-md bg-neg-soft px-4 py-3 text-xs text-neg">
                  {error}
                </div>
              )}
            </>
          }
          side={
            <>
              {/* ---------- Ritmo ---------- */}
              {/* Solo Avanzata: riguarda tutte le uscite, non le buste, e in
                  Semplice la schermata risponde solo a «sto nei tetti?». */}
              {buste.length > 0 && (
                <Card className="adv-only p-4 lg:p-5">
                  <CardHeader title="Ritmo di spesa" hint="Il ritmo di tutte le uscite del periodo." />
                  {inCorso ? (
                    <Skeleton className="h-[150px] w-full" />
                  ) : (
                    <Bars
                      items={overview.settimane}
                      tone="accent"
                      ariaLabel="Uscite per settimana del periodo; le settimane future sono previsioni."
                    />
                  )}
                </Card>
              )}

              {/* ---------- Categorie senza tetto · solo Avanzata ---------- */}
              <Card className="adv-only p-4 lg:p-5">
                <CardHeader
                  title="Senza tetto"
                  hint="Categorie su cui stai spendendo senza esserti dato un limite."
                />
                {inCorso ? (
                  <Skeleton className="h-24 w-full" />
                ) : senzaTetto.length === 0 ? (
                  <p className="py-4 text-center text-xs text-faint">
                    {overview.categorie.length === 0
                      ? "Nessuna uscita in questo periodo."
                      : "Ogni categoria che usi ha già il suo tetto."}
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {senzaTetto.map((c) => (
                      <CatRow
                        key={c.name}
                        icon={Wallet}
                        name={c.name}
                        sub="nessun tetto"
                        value={formatCurrency(c.real)}
                        onClick={() => {
                          setEditing({ categoria: c.name, tetto: "" });
                          setFormError(null);
                        }}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </>
          }
        />
      )}

      {/* ---------- Modale: tetto di una busta ---------- */}
      <Modal
        open={!!editing}
        onClose={() => { setEditing(null); setFormError(null); }}
        title={
          editing && buste.some((b) => b.categoria === editing.categoria)
            ? `Tetto di ${editing.categoria}`
            : "Nuova busta"
        }
        description={`Il tetto vale per ${label} e per i mesi successivi. I mesi già chiusi restano com'erano.`}
        footer={
          <>
            {editing && buste.some((b) => b.categoria === editing.categoria) && (
              <Button variant="ghost" icon={Trash2} onClick={() => togli(editing.categoria)}>
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
        {editing && (
          <div className="flex flex-col gap-4">
            <Field label="Categoria" required htmlFor="b-categoria" error={formError && !editing.categoria.trim() ? formError : null}>
              <input
                id="b-categoria"
                list="lista-categorie-budget"
                value={editing.categoria}
                onChange={(e) => setEditing({ ...editing, categoria: e.target.value })}
                placeholder="Es. Spesa, Casa, Trasporti…"
                className={inputClass}
              />
              <datalist id="lista-categorie-budget">
                {overview.categorie.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
            </Field>

            <Field
              label={`Tetto per ${label}`}
              required
              htmlFor="b-tetto"
              error={formError && editing.categoria.trim() ? formError : null}
              help="Quanto vuoi poter spendere al massimo in questa categoria, ogni mese."
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint" aria-hidden>
                  €
                </span>
                <input
                  id="b-tetto"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={editing.tetto}
                  onChange={(e) => setEditing({ ...editing, tetto: e.target.value })}
                  placeholder="0,00"
                  className={`${inputClass} tnum pl-8`}
                />
              </div>
            </Field>
          </div>
        )}
      </Modal>
    </ProtectedRoute>
  );
}

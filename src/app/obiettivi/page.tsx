"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Calendar,
  Car,
  Check,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Info,
  Minus,
  Pencil,
  PiggyBank,
  Plane,
  Plus,
  Repeat,
  Shield,
  Sparkles,
} from "lucide-react";
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
  Toggle,
  inputClass,
} from "@/components/ui/kit";
import { Bars, MiniBar } from "@/components/ui/charts";
import { usePeriod } from "@/context/PeriodContext";
import { useScope } from "@/context/ScopeContext";
import { usePeriodExpenses } from "@/hooks/usePeriodExpenses";
import { goalService, goalTotals, type Goal, type GoalInput } from "@/services/goalService";
import { AUTO_CONTRIBUTIONS_SCHEDULED, MIGRATION } from "@/lib/moduleState";
import { formatCurrency, formatDate } from "@/lib/formatUtils";

/* Le icone disponibili per un obiettivo: un insieme chiuso, così il
   nome salvato a database corrisponde sempre a qualcosa di disegnabile. */
const ICONE = {
  "piggy-bank": PiggyBank,
  plane: Plane,
  shield: Shield,
  car: Car,
  home: Home,
  gift: Gift,
  "graduation-cap": GraduationCap,
  heart: Heart,
} as const;

type IconaKey = keyof typeof ICONE;

const ICONA_LABEL: Record<IconaKey, string> = {
  "piggy-bank": "Salvadanaio",
  plane: "Viaggio",
  shield: "Fondo di emergenza",
  car: "Auto",
  home: "Casa",
  gift: "Regalo",
  "graduation-cap": "Studio",
  heart: "Salute",
};

const iconaDi = (nome: string) => ICONE[(nome as IconaKey)] ?? PiggyBank;

function parseAmount(raw: string): number | null {
  const clean = raw.replace(/\s/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

interface FormState {
  id: number | null;
  nome: string;
  icona: IconaKey;
  target: string;
  dataObiettivo: string;
  auto: boolean;
  autoImporto: string;
  autoGiorno: string;
}

const FORM_VUOTO: FormState = {
  id: null,
  nome: "",
  icona: "piggy-bank",
  target: "",
  dataObiettivo: "",
  auto: false,
  autoImporto: "",
  autoGiorno: "1",
};

/**
 * Quanto versare al mese per arrivare al traguardo entro la data, contando
 * anche il mese in corso. Null se la data è passata: lì il numero non
 * aiuterebbe a decidere niente.
 */
function alMese(mancante: number, data: string): number | null {
  if (mancante <= 0) return null;
  const oggi = new Date();
  const fine = new Date(data + "T00:00:00");
  if (fine < oggi) return null;
  const mesi = (fine.getFullYear() - oggi.getFullYear()) * 12 + (fine.getMonth() - oggi.getMonth()) + 1;
  return Math.ceil((mancante / Math.max(1, mesi)) * 100) / 100;
}

export default function ObiettiviPage() {
  const { label } = usePeriod();
  const { scope, isInitialized } = useScope();
  const { overview } = usePeriodExpenses();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [crescita, setCrescita] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [versamento, setVersamento] = useState<{ goal: Goal; importo: string; nota: string; prelievo: boolean } | null>(null);

  /* Lo stato si aggiorna solo nella callback della promise: nessun
     setState sincrono nel corpo dell'effetto. `nonce` rilegge dopo un
     versamento o una modifica. */
  const [nonce, setNonce] = useState(0);
  const ricarica = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!isInitialized) return;
    let alive = true;
    Promise.all([goalService.list(scope), goalService.monthlyGrowth(scope)]).then(([res, g]) => {
      if (!alive) return;
      setGoals(res.data);
      setNeedsMigration(res.needsMigration);
      setCrescita(g);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [scope, isInitialized, nonce]);

  const totali = useMemo(() => goalTotals(goals), [goals]);
  const conAuto = useMemo(() => goals.filter((g) => g.autoImporto), [goals]);

  /* ---------- salvataggio obiettivo ---------- */
  const salva = async () => {
    if (!form) return;
    const target = parseAmount(form.target);
    if (!form.nome.trim()) {
      setFormError("Dai un nome all'obiettivo.");
      return;
    }
    if (target === null) {
      setFormError("Inserisci un traguardo maggiore di zero.");
      return;
    }
    const autoImporto = form.auto ? parseAmount(form.autoImporto) : null;
    if (form.auto && autoImporto === null) {
      setFormError("Inserisci quanto mettere da parte ogni mese.");
      return;
    }

    const input: GoalInput = {
      nome: form.nome,
      icona: form.icona,
      target,
      dataObiettivo: form.dataObiettivo || null,
      autoImporto,
      autoGiorno: autoImporto ? Math.min(28, Math.max(1, Number(form.autoGiorno) || 1)) : null,
    };

    setSaving(true);
    const res = form.id ? await goalService.update(form.id, input) : await goalService.create(input, scope);
    setSaving(false);

    if (res.needsMigration) {
      toast.error("Modulo non ancora attivo", { description: `Applica ${MIGRATION.goals}.` });
      return;
    }
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(form.id ? "Obiettivo aggiornato" : "Obiettivo creato", {
      description: `${form.nome.trim()} · traguardo ${formatCurrency(target)}`,
    });
    setForm(null);
    setFormError(null);
    ricarica();
  };

  /* ---------- versamento ---------- */
  const versa = async () => {
    if (!versamento) return;
    const importo = parseAmount(versamento.importo);
    if (importo === null) {
      setFormError("Inserisci un importo maggiore di zero.");
      return;
    }
    setSaving(true);
    const res = await goalService.contribute(
      versamento.goal.id,
      versamento.prelievo ? -importo : importo,
      versamento.nota
    );
    setSaving(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(versamento.prelievo ? "Prelievo registrato" : "Versamento registrato", {
      description: `${versamento.goal.nome} · ${formatCurrency(importo)}`,
    });
    setVersamento(null);
    setFormError(null);
    ricarica();
  };

  const archivia = async (g: Goal) => {
    const res = await goalService.archive(g.id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Obiettivo archiviato", { description: "Lo storico dei versamenti resta." });
    setForm(null);
    ricarica();
  };

  return (
    <ProtectedRoute>
      <PageHeader
        title="Obiettivi"
        subtitle={`${label} · ${goals.length} ${goals.length === 1 ? "obiettivo" : "obiettivi"}`}
        actions={
          !needsMigration ? (
            <Button size="sm" icon={Plus} onClick={() => { setForm(FORM_VUOTO); setFormError(null); }}>
              Obiettivo
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
              titolo="Gli obiettivi non sono ancora attivi"
              cosa="Gli obiettivi di risparmio mettono i soldi da parte prima che tu li spenda: quello che accantoni esce da «Puoi spendere»."
              file={MIGRATION.goals}
            />
          }
        />
      ) : (
        <PageBody
          main={
            <>
              {/* ---------- 1. Quanto hai messo da parte ---------- */}
              <Card className="p-5 lg:p-6">
                {loading ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <Skeleton className="h-[132px] w-[132px] rounded-full" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ) : goals.length === 0 ? (
                  <EmptyState
                    icon={PiggyBank}
                    title="Nessun obiettivo"
                    body="Un obiettivo mette i soldi al riparo prima che finiscano in qualcos'altro: quello che accantoni esce da «Puoi spendere»."
                    action={
                      <Button variant="primary" icon={Plus} onClick={() => { setForm(FORM_VUOTO); setFormError(null); }}>
                        Crea il primo obiettivo
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-3">
                      <MiniBar
                        percent={totali.percentuale}
                        tone="pos"
                        width={132}
                        thickness={9}
                        ariaLabel={`Hai messo da parte ${formatCurrency(totali.accantonato)} sui ${formatCurrency(
                          totali.target
                        )} dei tuoi obiettivi.`}
                      >
                        {Math.round(totali.percentuale)}%
                      </MiniBar>
                      <div className="text-center">
                        <Eyebrow>Messo da parte</Eyebrow>
                        <p className="tnum mt-1 text-[30px] font-extrabold leading-none" style={{ color: "var(--pos)" }}>
                          {formatCurrency(totali.accantonato)}
                        </p>
                        <p className="tnum mt-1 text-xs text-faint">
                          mancano {formatCurrency(totali.mancante)} su {formatCurrency(totali.target)}
                        </p>
                      </div>
                    </div>

                    {overview.accantonato > 0 && (
                      <Note icon={Info}>
                        in {label} hai accantonato{" "}
                        <strong className="tnum font-bold text-muted">
                          {formatCurrency(overview.accantonato)}
                        </strong>
                        : sono già fuori da «Puoi spendere»
                      </Note>
                    )}
                  </>
                )}
              </Card>

              {/* ---------- 2. Gli obiettivi ---------- */}
              {goals.length > 0 && (
                <Card className="p-4 lg:p-5">
                  <CardHeader
                    title="I tuoi obiettivi"
                    hint="Tocca per versare o prelevare."
                    action={
                      totali.autoPerMese > 0 ? (
                        <Pill icon={Repeat}>{formatCurrency(totali.autoPerMese)}/mese</Pill>
                      ) : undefined
                    }
                  />
                  <div className="flex flex-col">
                    {goals.map((g) => {
                      const Icon = iconaDi(g.icona);
                      const raggiunto = g.percentuale >= 100;
                      return (
                        <div key={g.id} className="flex items-center gap-2 border-line py-1 [&+&]:border-t">
                          <CatRow
                            className="min-w-0 flex-1"
                            icon={Icon}
                            name={g.nome}
                            sub={
                              raggiunto ? (
                                <span style={{ color: "var(--pos)" }}>traguardo raggiunto</span>
                              ) : (
                                <>
                                  mancano {formatCurrency(g.mancante)}
                                  {g.dataObiettivo && <> · entro {formatDate(g.dataObiettivo)}</>}
                                  {g.dataObiettivo && g.mesiStimati === null && alMese(g.mancante, g.dataObiettivo) && (
                                    <> · circa {formatCurrency(alMese(g.mancante, g.dataObiettivo)!)} al mese</>
                                  )}
                                  {g.mesiStimati !== null && !raggiunto && (
                                    <> · circa {g.mesiStimati} {g.mesiStimati === 1 ? "mese" : "mesi"}</>
                                  )}
                                </>
                              )
                            }
                            value={
                              <span className="flex items-center gap-2">
                                <span className="tnum">{formatCurrency(g.accantonato)}</span>
                                <MiniBar
                                  percent={g.percentuale}
                                  tone={raggiunto ? "pos" : "accent"}
                                  width={34}
                                  thickness={5}
                                  ariaLabel={`${g.nome}: ${Math.round(g.percentuale)} per cento`}
                                >
                                  {Math.round(g.percentuale)}%
                                </MiniBar>
                              </span>
                            }
                            onClick={() => {
                              setVersamento({ goal: g, importo: "", nota: "", prelievo: false });
                              setFormError(null);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Pencil}
                            aria-label={`Modifica `}
                            onClick={() => {
                              setForm({
                                id: g.id,
                                nome: g.nome,
                                icona: (g.icona as IconaKey) in ICONE ? (g.icona as IconaKey) : "piggy-bank",
                                target: String(g.target).replace(".", ","),
                                dataObiettivo: g.dataObiettivo ?? "",
                                auto: g.autoImporto !== null,
                                autoImporto: g.autoImporto ? String(g.autoImporto).replace(".", ",") : "",
                                autoGiorno: String(g.autoGiorno ?? 1),
                              });
                              setFormError(null);
                            }}
                          >
                            {/* da telefono solo la matita: col testo la riga usciva dal bordo */}
                            <span className="hidden sm:inline">Modifica</span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          }
          side={
            <>
              {/* ---------- Accantonamento automatico ---------- */}
              <Card className="p-4 lg:p-5">
                <CardHeader
                  title="Accantonamento automatico"
                  hint="Ogni mese, senza doverci pensare."
                  action={
                    totali.autoPerMese > 0 ? (
                      <Pill tone="pos">{formatCurrency(totali.autoPerMese)}</Pill>
                    ) : undefined
                  }
                />
                {loading ? (
                  <Skeleton className="h-20 w-full" />
                ) : conAuto.length === 0 ? (
                  <p className="py-4 text-center text-xs leading-relaxed text-faint">
                    Nessun obiettivo mette da parte in automatico. Lo attivi dalla modifica di un
                    obiettivo.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {conAuto.map((g) => {
                      const Icon = iconaDi(g.icona);
                      return (
                        <li key={g.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-pos-soft text-pos">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{g.nome}</p>
                            <p className="text-xs text-faint">il {g.autoGiorno} di ogni mese</p>
                          </div>
                          <span className="tnum shrink-0 text-sm font-bold">
                            {formatCurrency(g.autoImporto ?? 0)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Note icon={Sparkles}>
                  {AUTO_CONTRIBUTIONS_SCHEDULED
                    ? "il versamento parte da solo il giorno scelto"
                    : "non ancora in funzione: per ora si versa a mano, toccando l'obiettivo"}
                </Note>
              </Card>

              {/* ---------- Crescita del risparmio · solo Avanzata ---------- */}
              {crescita.some((c) => c.value > 0) && (
                <Card className="adv-only p-4 lg:p-5">
                  <CardHeader title="Come cresce" hint="Quanto è entrato nel salvadanaio, mese per mese." />
                  <Bars
                    items={crescita}
                    tone="pos"
                    ariaLabel={`Versamenti per mese: ${crescita
                      .map((c) => `${c.label} ${formatCurrency(c.value)}`)
                      .join(", ")}.`}
                  />
                </Card>
              )}
            </>
          }
        />
      )}

      {/* ---------- Modale: obiettivo ---------- */}
      <Modal
        open={!!form}
        onClose={() => { setForm(null); setFormError(null); }}
        title={form?.id ? "Modifica obiettivo" : "Nuovo obiettivo"}
        size="md"
        footer={
          <>
            {form?.id && (
              <Button
                variant="ghost"
                icon={Archive}
                onClick={() => {
                  const g = goals.find((x) => x.id === form.id);
                  if (g) archivia(g);
                }}
              >
                Archivia
              </Button>
            )}
            <Button variant="secondary" onClick={() => { setForm(null); setFormError(null); }}>
              Annulla
            </Button>
            <Button variant="primary" icon={Check} loading={saving} onClick={salva}>
              Salva
            </Button>
          </>
        }
      >
        {form && (
          <div className="flex flex-col gap-4">
            <Field label="Per cosa" required htmlFor="g-nome" error={formError && !form.nome.trim() ? formError : null}>
              <input
                id="g-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Es. Vacanza, Fondo di emergenza…"
                className={inputClass}
              />
            </Field>

            <Field label="Icona">
              <div className="no-bar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
                {(Object.keys(ICONE) as IconaKey[]).map((k) => {
                  const Icon = ICONE[k];
                  const on = form.icona === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      aria-label={ICONA_LABEL[k]}
                      title={ICONA_LABEL[k]}
                      onClick={() => setForm({ ...form, icona: k })}
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-md transition-colors ${
                        on ? "bg-accent text-accent-ink" : "bg-surface-3 text-muted hover:text-ink"
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Traguardo"
                required
                htmlFor="g-target"
                error={formError && form.nome.trim() && !form.auto ? formError : null}
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint" aria-hidden>
                    €
                  </span>
                  <input
                    id="g-target"
                    type="text"
                    inputMode="decimal"
                    value={form.target}
                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                    placeholder="0,00"
                    className={`${inputClass} tnum pl-8`}
                  />
                </div>
              </Field>

              <Field label="Entro quando" htmlFor="g-data" help="Facoltativa.">
                <div className="relative">
                  <input
                    id="g-data"
                    type="date"
                    value={form.dataObiettivo}
                    onChange={(e) => setForm({ ...form, dataObiettivo: e.target.value })}
                    className={inputClass}
                  />
                  <Calendar className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
                </div>
              </Field>
            </div>

            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-3 text-muted">
                    <Repeat className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Mettine da parte ogni mese</p>
                    <p className="text-xs text-faint">
                      {AUTO_CONTRIBUTIONS_SCHEDULED
                        ? "Esce da «Puoi spendere» il giorno che scegli."
                        : "Non ancora in funzione: puoi impostarlo, ma per ora i versamenti si fanno a mano."}
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={form.auto}
                  onChange={(v) => setForm({ ...form, auto: v })}
                  label="Accantonamento automatico"
                />
              </div>

              {form.auto && (
                <div className="anim-up mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                  <Field label="Quanto" required htmlFor="g-auto" error={formError && form.auto ? formError : null}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint" aria-hidden>
                        €
                      </span>
                      <input
                        id="g-auto"
                        type="text"
                        inputMode="decimal"
                        value={form.autoImporto}
                        onChange={(e) => setForm({ ...form, autoImporto: e.target.value })}
                        placeholder="0,00"
                        className={`${inputClass} tnum pl-8`}
                      />
                    </div>
                  </Field>
                  <Field label="Che giorno" htmlFor="g-giorno" help="Dal 1 al 28, così c'è in ogni mese.">
                    <input
                      id="g-giorno"
                      type="number"
                      min={1}
                      max={28}
                      value={form.autoGiorno}
                      onChange={(e) => setForm({ ...form, autoGiorno: e.target.value })}
                      className={`${inputClass} tnum`}
                    />
                  </Field>
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>

      {/* ---------- Modale: versamento ---------- */}
      <Modal
        open={!!versamento}
        onClose={() => { setVersamento(null); setFormError(null); }}
        title={versamento ? versamento.goal.nome : ""}
        description={
          versamento
            ? `${formatCurrency(versamento.goal.accantonato)} su ${formatCurrency(
                versamento.goal.target
              )} · mancano ${formatCurrency(versamento.goal.mancante)}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => { setVersamento(null); setFormError(null); }}>
              Annulla
            </Button>
            <Button
              variant={versamento?.prelievo ? "danger" : "primary"}
              icon={versamento?.prelievo ? Minus : Plus}
              loading={saving}
              onClick={versa}
            >
              {versamento?.prelievo ? "Preleva" : "Metti da parte"}
            </Button>
          </>
        }
      >
        {versamento && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={versamento.prelievo ? "secondary" : "pos"}
                icon={Plus}
                className="flex-1"
                onClick={() => setVersamento({ ...versamento, prelievo: false })}
              >
                Verso
              </Button>
              <Button
                size="sm"
                variant={versamento.prelievo ? "danger" : "secondary"}
                icon={Minus}
                className="flex-1"
                onClick={() => setVersamento({ ...versamento, prelievo: true })}
              >
                Prelevo
              </Button>
            </div>

            <Field label="Quanto" required htmlFor="v-importo" error={formError}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint" aria-hidden>
                  €
                </span>
                <input
                  id="v-importo"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={versamento.importo}
                  onChange={(e) => setVersamento({ ...versamento, importo: e.target.value })}
                  placeholder="0,00"
                  className={`${inputClass} tnum pl-8`}
                />
              </div>
            </Field>

            <Field label="Nota" htmlFor="v-nota" help="Facoltativa.">
              <input
                id="v-nota"
                value={versamento.nota}
                onChange={(e) => setVersamento({ ...versamento, nota: e.target.value })}
                placeholder="Es. tredicesima"
                className={inputClass}
              />
            </Field>
          </div>
        )}
      </Modal>
    </ProtectedRoute>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Archive,
  Check,
  History,
  Info,
  Repeat,
  RotateCcw,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import PeriodBar from "@/components/layout/PeriodBar";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  Avatar,
  AvatarStack,
  Button,
  Card,
  CardHeader,
  CatRow,
  EmptyState,
  Eyebrow,
  Note,
  Pill,
  Skeleton,
} from "@/components/ui/kit";
import { Bars, ProgressTrack } from "@/components/ui/charts";
import { usePeriod } from "@/context/PeriodContext";
import { useScope } from "@/context/ScopeContext";
import { useAuth } from "@/context/AuthContext";
import {
  familyService,
  type ClosedSettlement,
  type Settlement,
} from "@/services/familyService";
import { recurringService, type RecurringSummary } from "@/services/recurringService";
import { formatCurrency, formatDate } from "@/lib/formatUtils";

/**
 * Chi ha pagato cosa e chi deve a chi.
 * Tutto calcolato da spese.user_id + users_group: nessuna tabella nuova.
 */
export default function FamigliaPage() {
  const { range, label } = usePeriod();
  const { scope, setScope } = useScope();
  const { user, profile } = useAuth();

  const [data, setData] = useState<Settlement | null>(null);
  const [fisse, setFisse] = useState<RecurringSummary | null>(null);
  const [chiusi, setChiusi] = useState<ClosedSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [askClose, setAskClose] = useState(false);
  const [askReopen, setAskReopen] = useState<ClosedSettlement | null>(null);

  const groupId = profile?.group_id ?? undefined;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r, c] = await Promise.all([
        familyService.getSettlement(range, groupId),
        recurringService.getSummary("C"),
        familyService.getClosedSettlements(groupId),
      ]);
      setData(s);
      setFisse(r);
      setChiusi(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const membri = useMemo(() => data?.contributions ?? [], [data]);
  const maxPagato = Math.max(...membri.map((m) => m.paid), 1);

  const fisseCondivise = useMemo(
    () => (fisse?.items ?? []).filter((i) => !i.isIncome && !i.ended).slice(0, 6),
    [fisse]
  );

  const nomeDi = useCallback(
    (userId: string) => membri.find((m) => m.userId === userId)?.name ?? "Membro",
    [membri]
  );

  const isAdmin = useMemo(
    () => membri.some((m) => m.userId === user?.id && m.isAdmin),
    [membri, user?.id]
  );

  /** Segna il conguaglio come saldato: quelle spese non tornano più. */
  const chiudi = async () => {
    if (!data) return;
    const esito = await familyService.closeSettlement(range, data.transfers, groupId);
    if (esito.needsMigration) {
      toast.error("Non ancora attivo", {
        description:
          "Chiudere un conguaglio richiede la migrazione 20260101000300_splits_settlements.sql.",
      });
      return;
    }
    if (!esito.ok) {
      toast.error(esito.error ?? "Non siamo riusciti a chiudere il conguaglio.");
      return;
    }
    toast.success("Conguaglio saldato", {
      description: "Le spese di questo periodo non rientrano più nel calcolo.",
    });
    load();
  };

  const riapri = async (s: ClosedSettlement) => {
    const esito = await familyService.reopenSettlement(s.id);
    if (!esito.ok) {
      toast.error(esito.error ?? "Non siamo riusciti a riaprire il conguaglio.");
      return;
    }
    toast.success("Conguaglio riaperto");
    load();
  };

  if (!profile?.group_id) {
    return (
      <ProtectedRoute>
        <PageHeader title="Famiglia" subtitle="Portafoglio condiviso" />
        <PageBody
          main={
            <Card>
              <EmptyState
                icon={Users}
                title="Non fai parte di nessun gruppo"
                body="Crea un gruppo o fatti invitare per dividere le spese e tenere il conto di chi ha pagato cosa."
                action={
                  <Link href="/inviti">
                    <Button variant="primary" icon={UserPlus}>Vai agli inviti</Button>
                  </Link>
                }
              />
            </Card>
          }
        />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageHeader
        title="Famiglia"
        subtitle={`${profile.group_name || "Gruppo"} · ${membri.length} ${membri.length === 1 ? "membro" : "membri"}`}
        actions={
          <Link href="/inviti">
            <Button size="sm" icon={UserPlus}>Invita</Button>
          </Link>
        }
      >
        <PeriodBar />
        {data?.needsMigration && (
          <div className="rounded-md bg-warn-soft px-4 py-3 text-xs leading-relaxed text-warn">
            La colonna <code>paid_by</code> non è ancora sul database: tutte le spese risultano pagate dal fondo
            comune. Applica <code>supabase/migrations/20260101000250_paid_by.sql</code>.
          </div>
        )}
        {scope !== "C" && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-accent-soft px-4 py-3 text-xs text-accent">
            <span>Stai guardando il portafoglio personale: qui vedi comunque i conti del gruppo.</span>
            <Button size="sm" onClick={() => setScope("C")}>Passa al gruppo</Button>
          </div>
        )}
      </PageHeader>

      <PageBody
        main={
          <>
            {/* ---------- Quanto avete speso insieme ---------- */}
            <Card className="p-4 lg:p-5">
              {loading ? (
                <>
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="mt-4 h-[150px] w-full" />
                </>
              ) : (
                <>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <Eyebrow>Speso insieme · {label}</Eyebrow>
                      <p className="tnum mt-1 text-[28px] font-extrabold leading-none">
                        {formatCurrency(data?.total ?? 0)}
                      </p>
                    </div>
                    <AvatarStack people={membri.map((m) => ({ id: m.userId, name: m.name }))} />
                  </div>

                  {membri.length > 0 && (data?.anticipato ?? 0) > 0 ? (
                    <Bars
                      items={membri.map((m) => ({ label: m.name.split(" ")[0], value: m.paid }))}
                      ariaLabel={`Quanto ha anticipato ciascuno: ${membri
                        .map((m) => `${m.name} ${formatCurrency(m.paid)}`)
                        .join(", ")}.`}
                    />
                  ) : (
                    <p className="py-6 text-center text-sm text-faint">
                      {(data?.total ?? 0) > 0
                        ? "Tutte le spese del periodo sono state pagate dal fondo comune: non c'è niente da conguagliare."
                        : "Nessuna spesa condivisa confermata in questo periodo."}
                    </p>
                  )}

                  <Note icon={Wallet}>
                    {formatCurrency(data?.fondoComune ?? 0)} dal fondo comune ·{" "}
                    {formatCurrency(data?.anticipato ?? 0)} anticipati dai membri
                  </Note>
                </>
              )}
            </Card>

            {/* ---------- Chi ha anticipato · solo Avanzata ----------
                In Semplice ripeteva le barre del riquadro sopra (stessi 130 / 120),
                e il «chi deve a chi» lo dice già il conguaglio. */}
            <Card className="adv-only p-4 lg:p-5">
              <CardHeader
                title="Chi ha anticipato"
                hint={
                  data?.chiuso
                    ? "Solo le spese di tasca propria. Il conguaglio del periodo è saldato."
                    : "Solo le spese di tasca propria. La tacca è la quota che spetta a ciascuno."
                }
              />
              {loading ? (
                <div className="space-y-4">
                  {[0, 1].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {membri.map((m) => {
                    const sopra = m.balance >= 0;
                    return (
                      <div key={m.userId} className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <Avatar id={m.userId} name={m.name} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {m.name}
                              {m.userId === user?.id && <span className="ml-1.5 font-normal text-faint">(tu)</span>}
                            </p>
                            <p className="text-xs" style={{ color: sopra ? "var(--pos)" : "var(--warn)" }}>
                              {/* Il saldo, non l'anticipo: l'anticipo è la cifra a destra.
                                  Prima qui c'era «ha anticipato 30 €» accanto a 100 €. */}
                              {data?.chiuso
                                ? "saldato"
                                : Math.abs(m.balance) < 0.01
                                  ? "in pari"
                                  : sopra
                                    ? `deve ricevere ${formatCurrency(m.balance)}`
                                    : `deve ${formatCurrency(-m.balance)}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="tnum text-sm font-bold">{formatCurrency(m.paid)}</p>
                            <p className="tnum text-[11px] text-faint">
                              {data?.anticipato ? Math.round((m.paid / data.anticipato) * 100) : 0}% degli anticipi
                            </p>
                          </div>
                        </div>
                        <ProgressTrack
                          percent={(m.paid / maxPagato) * 100}
                          /* la quota vera di ciascuno: con quote non uguali la
                             media a testa metterebbe la tacca nel punto sbagliato */
                          markAt={data?.chiuso ? undefined : (m.share / maxPagato) * 100}
                          tone={sopra ? "pos" : "warn"}
                          ariaLabel={`${m.name} ha anticipato ${formatCurrency(m.paid)} su una quota di ${formatCurrency(m.share)}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        }
        side={
          <>
            {/* ---------- Conguaglio ---------- */}
            <Card className="border-accent p-4 lg:p-5">
              <CardHeader
                title="Conguaglio"
                hint={
                  data?.chiuso
                    ? label
                    : `${label} · su ${formatCurrency(data?.anticipato ?? 0)} anticipati`
                }
                action={
                  data?.chiuso ? (
                    <Pill tone="pos" icon={Check}>saldato</Pill>
                  ) : (
                    <Pill tone="accent">{data?.viaDatabase ? "quote e parti uguali" : "parti uguali"}</Pill>
                  )
                }
              />
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : data?.chiuso ? (
                <>
                  <div className="flex items-start gap-3 rounded-md bg-pos-soft p-3 text-sm text-pos">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                    <span>
                      Conguaglio chiuso il {formatDate(data.chiuso.closedAt)}: queste spese non
                      rientrano più nel calcolo.
                    </span>
                  </div>
                  {data.chiuso.transfers.length > 0 && (
                    <p className="mt-3 text-xs leading-relaxed text-faint">
                      {data.chiuso.transfers
                        .map((t) => `${nomeDi(t.from)} ha dato ${formatCurrency(t.amount)} a ${nomeDi(t.to)}`)
                        .join(". ")}
                      .
                    </p>
                  )}
                  {data.dopoChiusura > 0 && (
                    <p role="status" className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
                      {data.dopoChiusura === 1
                        ? "Un anticipo è stato inserito dopo la chiusura e non è nel conguaglio."
                        : `${data.dopoChiusura} anticipi sono stati inseriti dopo la chiusura e non sono nel conguaglio.`}{" "}
                      {isAdmin
                        ? "Riapri il conguaglio per includerlo."
                        : "Per includerlo va riaperto il conguaglio."}
                    </p>
                  )}
                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={RotateCcw}
                      className="mt-3 w-full"
                      onClick={() => setAskReopen(data.chiuso)}
                    >
                      Riapri il conguaglio
                    </Button>
                  ) : (
                    <p className="mt-3 text-xs leading-relaxed text-faint">
                      Può riaprirlo solo {membri.find((m) => m.isAdmin)?.name ?? "l'amministratore del gruppo"}.
                    </p>
                  )}
                </>
              ) : !data || data.transfers.length === 0 ? (
                <div className="flex items-center gap-3 rounded-md bg-pos-soft p-3 text-sm text-pos">
                  <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden />
                  <span>Siete in pari: nessuno deve niente a nessuno.</span>
                </div>
              ) : (
                <>
                  <ul className="flex flex-col">
                    {data.transfers.map((t, i) => (
                      <li key={i} className="flex items-center gap-2.5 border-b border-line py-3 last:border-0">
                        <Avatar id={t.from.userId} name={t.from.name} size={30} />
                        <ArrowRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
                        <span className="tnum flex-1 text-center text-[15px] font-bold">
                          {formatCurrency(t.amount)}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
                        <Avatar id={t.to.userId} name={t.to.name} size={30} />
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs leading-relaxed text-faint">
                    {data.transfers
                      .map((t) => `${t.from.name} deve ${formatCurrency(t.amount)} a ${t.to.name}`)
                      .join(". ")}
                    .
                  </p>
                  <Button
                    variant="primary"
                    icon={Check}
                    className="mt-4 w-full"
                    onClick={() => setAskClose(true)}
                  >
                    Segna come saldato
                  </Button>
                </>
              )}
              <Note icon={Info}>
                {data?.chiuso
                  ? "un conguaglio chiuso resta uno storico: si può riaprire, non modificare"
                  : "il conguaglio si ricalcola sul periodo scelto in alto"}
              </Note>
            </Card>

            {/* ---------- Conguagli chiusi ---------- */}
            {chiusi.length > 0 && (
              <Card className="p-4 lg:p-5">
                <CardHeader
                  title="Conguagli chiusi"
                  hint="Periodi già saldati: le loro spese restano fuori dai conti."
                  action={<Pill icon={History}>{chiusi.length}</Pill>}
                />
                <ul className="flex flex-col">
                  {chiusi.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-3 text-muted">
                        <Archive className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                        </p>
                        <p className="truncate text-xs text-faint">
                          {s.transfers.length === 0
                            ? "nessun trasferimento"
                            : s.transfers
                                .map((t) => `${nomeDi(t.from)} → ${nomeDi(t.to)}`)
                                .join(" · ")}
                        </p>
                      </div>
                      <span className="tnum shrink-0 text-sm font-bold">{formatCurrency(s.totale)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* ---------- Membri · solo Avanzata ---------- */}
            <Card className="adv-only p-4 lg:p-5">
              <CardHeader
                title="Membri"
                action={
                  <Link href="/inviti" className="flex items-center gap-1 p-1.5 text-xs font-semibold text-accent">
                    Invita
                  </Link>
                }
              />
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <ul className="flex flex-col">
                  {membri.map((m) => (
                    <li key={m.userId} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                      <Avatar id={m.userId} name={m.name} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{m.name}</p>
                        <p className="text-xs text-faint">{m.isAdmin ? "Amministratore" : "Membro"}</p>
                      </div>
                      <span className="tnum text-xs text-faint">
                        {m.count} {m.count === 1 ? "anticipo" : "anticipi"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* ---------- Fisse condivise · solo Avanzata ---------- */}
            <Card className="adv-only p-4 lg:p-5">
              <CardHeader
                title="Fisse condivise"
                action={
                  fisse ? <Pill icon={Repeat}>{formatCurrency(fisse.outPerMonth)}/mese</Pill> : undefined
                }
              />
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : fisseCondivise.length === 0 ? (
                <p className="py-4 text-center text-xs text-faint">Nessuna spesa ricorrente sul gruppo.</p>
              ) : (
                <div className="flex flex-col">
                  {fisseCondivise.map((i) => (
                    <CatRow
                      key={i.expense.id}
                      icon={Repeat}
                      name={i.name}
                      sub={i.cadenceLabel}
                      value={formatCurrency(i.amount)}
                    />
                  ))}
                </div>
              )}
              <Link
                href="/ricorrenti"
                className="mt-3 flex min-h-11 items-center justify-center gap-1 rounded-md border border-line text-xs font-semibold text-accent"
              >
                Apri fisse e abbonamenti
              </Link>
            </Card>
          </>
        }
      />

      <ConfirmModal
        isOpen={askClose}
        onClose={() => setAskClose(false)}
        onConfirm={chiudi}
        title="Segnare il conguaglio come saldato?"
        message={
          data && data.transfers.length > 0
            ? `${data.transfers
                .map((t) => `${t.from.name} dà ${formatCurrency(t.amount)} a ${t.to.name}`)
                .join(", ")}. Le spese di questo periodo usciranno dal calcolo dei prossimi conguagli.`
            : "Le spese di questo periodo usciranno dal calcolo dei prossimi conguagli."
        }
        confirmText="Sì, è saldato"
      />

      <ConfirmModal
        isOpen={!!askReopen}
        onClose={() => setAskReopen(null)}
        onConfirm={async () => {
          if (askReopen) await riapri(askReopen);
        }}
        title="Riaprire il conguaglio?"
        message="Le spese di quel periodo torneranno nel calcolo e i conti si rifaranno da capo."
        confirmText="Riapri"
        isDestructive
      />
    </ProtectedRoute>
  );
}

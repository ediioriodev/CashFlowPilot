"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDownLeft, CalendarClock, Check, ChevronRight, Info, Pencil, Repeat, Sparkles } from "lucide-react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import ScopeSwitch from "@/components/ui/ScopeSwitch";
import {
  Card,
  CardHeader,
  CatRow,
  EmptyState,
  Eyebrow,
  Note,
  Pill,
  SegTabs,
  Skeleton,
  Button,
  Modal,
} from "@/components/ui/kit";
import { MiniBar, StackBar } from "@/components/ui/charts";
import { useScope } from "@/context/ScopeContext";
import { usePeriodExpenses } from "@/hooks/usePeriodExpenses";
import {
  recurringService,
  type RecurringSummary,
  type RecurringItem,
  type RecurringLife,
} from "@/services/recurringService";
import EditExpenseModal from "@/components/expenses/EditExpenseModal";
import { formatCurrency } from "@/lib/formatUtils";
import { formatDateLabel } from "@/lib/dateUtils";

type Vista = "tutte" | "uscite" | "entrate" | "concluse";

/**
 * Fisse e abbonamenti: una lettura diversa di spese.is_recurring_parent.
 * Il numero che conta è quello ANNUALE — 1.079 € all'anno fa un effetto
 * che 89,97 € al mese non fa.
 */
export default function RicorrentiPage() {
  const { scope, isInitialized } = useScope();
  const { overview: o } = usePeriodExpenses();
  const planOut = o.planOut;
  const [data, setData] = useState<RecurringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<Vista>("tutte");
  /* La voce aperta nel dettaglio e quella in modifica: la pagina che
     raduna le spese che si ripetono è il punto in cui ci si accorge che
     una va corretta, quindi si corregge da qui. */
  const [aperta, setAperta] = useState<RecurringItem | null>(null);
  const [vita, setVita] = useState<RecurringLife | null | undefined>(undefined);
  const [inModifica, setInModifica] = useState<RecurringItem | null>(null);

  useEffect(() => {
    if (!aperta?.expense.id) return;
    let vivo = true;
    setVita(undefined);
    recurringService.getLife(aperta.expense.id, scope).then((v) => vivo && setVita(v));
    return () => {
      vivo = false;
    };
  }, [aperta, scope]);

  const load = useCallback(async () => {
    if (!isInitialized) return;
    setLoading(true);
    try {
      setData(await recurringService.getSummary(scope, planOut));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [scope, isInitialized, planOut]);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    if (vista === "uscite") return all.filter((i) => !i.isIncome && !i.ended);
    if (vista === "entrate") return all.filter((i) => i.isIncome && !i.ended);
    if (vista === "concluse") return all.filter((i) => i.ended);
    return all.filter((i) => !i.ended);
  }, [data, vista]);

  const attive = (data?.items ?? []).filter((i) => !i.ended && !i.isIncome);
  const concluse = (data?.items ?? []).filter((i) => i.ended).length;

  return (
    <ProtectedRoute>
      <PageHeader
        title="Fisse e abbonamenti"
        subtitle="Le spese che si ripetono da sole"
        actions={
          <Link href="/spese/nuova">
            <Button size="sm" icon={Repeat}>Nuova</Button>
          </Link>
        }
      >
        <ScopeSwitch />
        <SegTabs
          ariaLabel="Quali ricorrenze mostrare"
          value={vista}
          onChange={setVista}
          options={[
            { value: "tutte", label: "Attive" },
            { value: "uscite", label: "Uscite", tone: "neg" },
            { value: "entrate", label: "Entrate", tone: "pos" },
            { value: "concluse", label: `Concluse${concluse ? ` (${concluse})` : ""}` },
          ]}
        />
      </PageHeader>

      <PageBody
        main={
          <>
            {/* ---------- Il costo annuale ---------- */}
            <Card className="p-5 lg:p-6">
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <>
                  <div className="flex items-center gap-5">
                    <MiniBar
                      percent={data?.shareOfSpending ?? 0}
                      tone="warn"
                      width={84}
                      thickness={5}
                      ariaLabel={`Le spese fisse sono il ${Math.round(data?.shareOfSpending ?? 0)}% delle uscite del periodo`}
                    >
                      {Math.round(data?.shareOfSpending ?? 0)}%
                    </MiniBar>
                    <div className="min-w-0">
                      <Eyebrow>Ti costano all&apos;anno</Eyebrow>
                      <p className="tnum mt-1 text-[30px] font-extrabold leading-none lg:text-[36px]">
                        {formatCurrency(data?.outPerYear ?? 0)}
                      </p>
                      <p className="mt-1.5 text-[13px] text-muted">
                        cioè <strong className="tnum font-bold text-ink">{formatCurrency(data?.outPerMonth ?? 0)}</strong> al
                        mese, su {attive.length} {attive.length === 1 ? "voce" : "voci"}
                      </p>
                    </div>
                  </div>

                  <Note icon={Info}>
                    {data && data.shareOfSpending > 0
                      ? `sono il ${Math.round(data.shareOfSpending)}% di quello che spendi nel periodo`
                      : "quota sulle uscite non calcolabile: nessuna uscita nel periodo"}
                  </Note>

                  {/* La composizione ha senso solo con più voci: con una sola la barra
                      è sempre piena, e sotto la nota del 5% si leggeva come «5%». */}
                  {attive.length > 1 && (
                    <div className="mt-5">
                      <p className="mb-2 text-xs font-semibold text-muted">Come si divide il totale</p>
                      <StackBar
                        height={16}
                        ariaLabel="Peso di ciascuna spesa fissa sul totale mensile"
                        items={attive.slice(0, 8).map((i, idx) => ({
                          label: i.name,
                          value: i.perMonth,
                          color: `color-mix(in srgb, var(--accent) ${Math.max(20, 100 - idx * 12)}%, var(--surface-3))`,
                        }))}
                      />
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* ---------- Elenco ---------- */}
            <Card className="p-4 lg:p-5">
              <CardHeader
                title={vista === "concluse" ? "Ricorrenze concluse" : "Le tue ricorrenze"}
                hint={loading ? undefined : `${items.length} ${items.length === 1 ? "voce" : "voci"}`}
              />
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon={Repeat}
                  title={vista === "concluse" ? "Nessuna ricorrenza conclusa" : "Nessuna spesa ricorrente"}
                  body="Quando crei un movimento attiva «Si ripete»: l'app lo metterà in previsione da solo."
                  action={
                    <Link href="/spese/nuova">
                      <Button variant="primary">Crea una ricorrenza</Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="flex flex-col">
                  {items.map((i) => (
                    <RicorrenzaRow key={i.expense.id} item={i} onApri={() => setAperta(i)} />
                  ))}
                </ul>
              )}
            </Card>
          </>
        }
        side={
          <>
            {/* Solo Avanzata: in Semplice ripete l'elenco a sinistra, ordinato diverso. */}
            <Card className="adv-only p-4 lg:p-5">
              <CardHeader title="Le più care" hint="Costo annuale" />
              {loading ? (
                <Skeleton className="h-28 w-full" />
              ) : attive.length === 0 ? (
                <p className="py-4 text-center text-xs text-faint">Ancora niente da mostrare.</p>
              ) : (
                <div className="flex flex-col">
                  {attive.slice(0, 5).map((i) => (
                    <CatRow
                      key={i.expense.id}
                      icon={Repeat}
                      name={i.name}
                      sub={i.cadenceLabel}
                      percent={(i.perYear / (attive[0]?.perYear || 1)) * 100}
                      value={formatCurrency(i.perYear)}
                    />
                  ))}
                </div>
              )}
            </Card>

            {data && data.inPerMonth > 0 && (
              <Card className="p-4 lg:p-5">
                <CardHeader title="Entrate ricorrenti" />
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-card bg-pos-soft text-pos">
                    <ArrowDownLeft className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="tnum text-xl font-bold" style={{ color: "var(--pos)" }}>
                      {formatCurrency(data.inPerMonth)}
                    </p>
                    <p className="text-xs text-faint">al mese, in media</p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="bg-accent-soft p-4 lg:p-5">
              <div className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-accent-ink">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">Perché guardare l&apos;anno</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Un abbonamento da 11,99 € al mese sembra poco. Sono{" "}
                    <strong className="font-semibold text-ink">143,88 € all&apos;anno</strong>: è lì che si decide se
                    vale la pena tenerlo.
                  </p>
                </div>
              </div>
            </Card>
          </>
        }
      />

      {/* ---------- Dettaglio della voce: la sua vita ---------- */}
      <Modal
        open={!!aperta}
        onClose={() => setAperta(null)}
        title={aperta?.name ?? ""}
        description={
          aperta ? `${aperta.category} · ${aperta.cadenceLabel} · ${formatCurrency(aperta.amount)}` : undefined
        }
        size="md"
      >
        {aperta && (
          <DettaglioVita
            item={aperta}
            vita={vita}
            onModifica={() => {
              setInModifica(aperta);
              setAperta(null);
            }}
          />
        )}
      </Modal>

      {/* ---------- Modifica: la stessa modale delle spese ---------- */}
      {inModifica && (
        <EditExpenseModal
          isOpen
          aggiornaFuture
          expense={inModifica.expense}
          scope={scope}
          onClose={() => setInModifica(null)}
          onSuccess={() => {
            setInModifica(null);
            load();
          }}
        />
      )}
    </ProtectedRoute>
  );
}

function RicorrenzaRow({ item, onApri }: { item: RecurringItem; onApri: () => void }) {
  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={onApri}
        className="flex min-h-16 w-full items-center gap-3 py-3 text-left"
      >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
        style={{
          background: item.ended ? "var(--surface-3)" : item.isIncome ? "var(--pos-soft)" : "var(--accent-soft)",
          color: item.ended ? "var(--faint)" : item.isIncome ? "var(--pos)" : "var(--accent)",
        }}
      >
        <Repeat className="h-4 w-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-faint">
          {/* senza negozio il nome È la categoria: non la si ripete */}
          {item.category && item.category !== item.name && (
            <>
              <span>{item.category}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <span>{item.cadenceLabel}</span>
          {item.autoConfirm ? (
            <Pill tone="pos" icon={Check}>automatica</Pill>
          ) : (
            <Pill icon={CalendarClock}>da confermare</Pill>
          )}
          {item.ended && (
            <Pill tone="warn" icon={AlertTriangle}>conclusa il {formatDateLabel(item.endDate!)}</Pill>
          )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="tnum text-[15px] font-bold" style={{ opacity: item.ended ? 0.55 : 1 }}>
          {item.isIncome ? "+" : "−"}
          {formatCurrency(item.amount)}
        </p>
        <p className="tnum text-[11px] text-faint">{formatCurrency(item.perYear)}/anno</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
      </button>
    </li>
  );
}

/* ------------------------------------------------------------
   Il dettaglio di una voce: quanto è costata finora, quanto
   costerà entro fine anno, e quanto è costata da sempre.
   L'orizzonte si ferma al 31 dicembre: le occorrenze a database
   arrivano fino a dieci anni, e un totale su quell'arco non
   direbbe niente a nessuno.
   ------------------------------------------------------------ */
function DettaglioVita({
  item,
  vita,
  onModifica,
}: {
  item: RecurringItem;
  vita: RecurringLife | null | undefined;
  onModifica: () => void;
}) {
  const segno = item.isIncome ? "+" : "−";

  if (vita === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (vita === null) {
    return (
      <Note icon={Info}>
        Non siamo riusciti a leggere i movimenti di questa voce. Riprova fra poco.
      </Note>
    );
  }

  const righe: { label: string; valore: string; sub: string }[] = [
    {
      // «Già pagato» contava anche le rate passate ma non confermate: il
      // numero è quello delle scadenze trascorse, e le non confermate si dicono.
      label: `Già scaduto nel ${vita.anno}`,
      valore: `${segno}${formatCurrency(vita.totaleStorico)}`,
      sub: (() => {
        const n = vita.storico.length;
        const aperte = vita.storico.filter((o) => !o.confermata).length;
        return `${n} ${n === 1 ? "volta" : "volte"}${aperte ? ` · ${aperte} da confermare` : ""}`;
      })(),
    },
    {
      label: `Ancora previsto nel ${vita.anno}`,
      valore: `${segno}${formatCurrency(vita.totalePrevisto)}`,
      sub: vita.previsto.length
        ? `${vita.previsto.length} ${vita.previsto.length === 1 ? "volta" : "volte"}, fino al 31 dicembre`
        : item.ended
          ? "la voce è conclusa"
          : "niente entro fine anno",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {righe.map((r) => (
          <div key={r.label} className="rounded-md bg-surface-2 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">{r.label}</p>
            <p className="tnum mt-1 text-lg font-bold">{r.valore}</p>
            <p className="mt-0.5 text-[11px] text-faint">{r.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-baseline justify-between rounded-md border border-line px-3 py-2.5">
        <span className="text-sm font-semibold">Nel {vita.anno}</span>
        <span className="tnum text-base font-bold">
          {segno}
          {formatCurrency(vita.totaleAnno)}
        </span>
      </div>

      <div className="flex items-baseline justify-between px-3 text-xs text-muted">
        <span>
          {/* le future esistono già a database fino a data_fine o per dieci anni:
              «da sempre» faceva sembrare pagato un totale che arriva al 2036 */}
          In tutto, fino al {vita.ultimaData ? new Date(vita.ultimaData + "T00:00:00").toLocaleDateString("it-IT") : "—"} · {vita.nVita}{" "}
          {vita.nVita === 1 ? "movimento" : "movimenti"}
        </span>
        <span className="tnum font-semibold">
          {segno}
          {formatCurrency(vita.totaleVita)}
        </span>
      </div>

      {vita.importiDiversi && (
        <Note icon={Info}>l&apos;importo è cambiato nel tempo: lo vedi nell&apos;elenco qui sotto</Note>
      )}

      <div>
        <Eyebrow>Movimenti</Eyebrow>
        {vita.storico.length === 0 && vita.previsto.length === 0 ? (
          <p className="py-3 text-xs text-faint">Nessun movimento registrato per questa voce.</p>
        ) : (
          <ul className="mt-1 max-h-56 overflow-y-auto">
            {[...vita.storico].reverse().map((occ) => (
              <li key={occ.id} className="flex items-center gap-2 border-b border-line py-2 text-sm last:border-0">
                <span className="flex-1 text-muted">{formatDateLabel(occ.data)}</span>
                {!occ.confermata && <Pill icon={CalendarClock}>da confermare</Pill>}
                <span className="tnum font-semibold">{formatCurrency(occ.importo)}</span>
              </li>
            ))}
            {vita.previsto.map((occ) => (
              <li
                key={occ.id}
                className="flex items-center gap-2 border-b border-line py-2 text-sm text-faint last:border-0"
              >
                <span className="flex-1">{formatDateLabel(occ.data)}</span>
                <Pill icon={CalendarClock}>prevista</Pill>
                <span className="tnum font-semibold">{formatCurrency(occ.importo)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button variant="secondary" icon={Pencil} onClick={onModifica} className="w-full">
        Modifica questa voce
      </Button>
    </div>
  );
}

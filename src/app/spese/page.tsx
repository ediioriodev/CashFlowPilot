"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Paperclip,
  Pencil,
  Repeat,
  Search,
  SlidersHorizontal,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import PeriodBar from "@/components/layout/PeriodBar";
import ScopeSwitch from "@/components/ui/ScopeSwitch";
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  Eyebrow,
  IconButton,
  Modal,
  Pill,
  Skeleton,
} from "@/components/ui/kit";
import { Bars } from "@/components/ui/charts";
import EditExpenseModal from "@/components/expenses/EditExpenseModal";
import { ReceiptViewer } from "@/components/expenses/ReceiptPicker";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { usePeriod } from "@/context/PeriodContext";
import { useScope } from "@/context/ScopeContext";
import { useAuth } from "@/context/AuthContext";
import { usePeriodExpenses } from "@/hooks/usePeriodExpenses";
import { expenseService } from "@/services/expenseService";
import { familyService, type Member } from "@/services/familyService";
import { formatCurrency } from "@/lib/formatUtils";
import { groupByDay, todayISO } from "@/lib/finance";
import type { Spesa } from "@/types/expenses";

type Filtro = "tutti" | "uscite" | "entrate" | "da-confermare" | "ricorrenti";

const FILTRI: { value: Filtro; label: string }[] = [
  { value: "tutti", label: "Tutti" },
  { value: "uscite", label: "Uscite" },
  { value: "entrate", label: "Entrate" },
  { value: "da-confermare", label: "Da confermare" },
  { value: "ricorrenti", label: "Ricorrenti" },
];

export default function MovimentiPage() {
  const { label: periodLabel } = usePeriod();
  const { scope } = useScope();
  const { user, profile } = useAuth();
  const { transactions, overview: o, loading, patch, remove, reload } = usePeriodExpenses();

  const [filtro, setFiltro] = useState<Filtro>("tutti");

  // Letto dalla query string senza useSearchParams: quest'ultimo obbliga a un
  // confine <Suspense> in fase di build e qui non porta nessun vantaggio.
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("filtro");
    if (f && FILTRI.some((x) => x.value === f)) setFiltro(f as Filtro);
  }, []);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [catFilter, setCatFilter] = useState<string[]>([]);
  const [payerFilter, setPayerFilter] = useState<string[]>([]);

  const [members, setMembers] = useState<Member[]>([]);
  const [editing, setEditing] = useState<Spesa | null>(null);
  const [toDelete, setToDelete] = useState<Spesa | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [scontrino, setScontrino] = useState<string | null>(null);

  useEffect(() => {
    if (scope !== "C") {
      setMembers([]);
      return;
    }
    let alive = true;
    familyService.getMembers().then((m) => alive && setMembers(m));
    return () => {
      alive = false;
    };
  }, [scope]);

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.userId, m])),
    [members]
  );

  const categorie = useMemo(
    () => [...new Set(transactions.map((t) => (t.ambito || "").trim()).filter(Boolean))].sort(),
    [transactions]
  );

  const visibili = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filtro === "uscite" && t.tipo_transazione !== "spesa") return false;
      if (filtro === "entrate" && t.tipo_transazione !== "entrata") return false;
      if (filtro === "da-confermare" && t.confermata) return false;
      if (filtro === "ricorrenti" && !t.ricorrente) return false;
      if (catFilter.length && !catFilter.includes((t.ambito || "").trim())) return false;
      if (payerFilter.length && !payerFilter.includes(t.paid_by ?? "__fondo__")) return false;
      if (q) {
        const hay = `${t.negozio ?? ""} ${t.ambito ?? ""} ${t.note_spese ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, filtro, query, catFilter, payerFilter]);

  const giorni = useMemo(() => groupByDay(visibili), [visibili]);
  const activeFilters = catFilter.length + payerFilter.length;
  const filtriAttivi = filtro !== "tutti" || query.trim() !== "" || activeFilters > 0;

  const confirm = async (t: Spesa) => {
    if (!t.id) return;
    setBusy(t.id);
    try {
      await expenseService.confirmExpense(t.id, scope);
      patch(t.id, { confermata: true });
      toast.success("Movimento confermato");
    } catch (e) {
      console.error(e);
      toast.error("Non è stato possibile confermare");
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    const t = toDelete;
    if (!t?.id) return;
    setBusy(t.id);
    try {
      await expenseService.deleteExpense(t.id, scope);
      remove(t.id);
      setToDelete(null);
      toast.success(`"${t.negozio || t.ambito}" eliminato`, {
        action: { label: "Annulla", onClick: () => restore(t) },
      });
    } catch (e) {
      console.error(e);
      toast.error("Eliminazione non riuscita");
    } finally {
      setBusy(null);
    }
  };

  // "Annulla" ripristina la stessa riga: quote, scontrino e chi ha pagato restano com'erano.
  const restore = async (t: Spesa) => {
    if (!t.id) return;
    try {
      await expenseService.restoreExpense(t.id, scope);
      await reload();
      toast.success("Movimento ripristinato");
    } catch (e) {
      console.error(e);
      toast.error("Ripristino non riuscito");
    }
  };

  return (
    <ProtectedRoute>
      <PageHeader
        title="Movimenti"
        subtitle={`${periodLabel} · ${visibili.length} ${visibili.length === 1 ? "voce" : "voci"}`}
        actions={
          <IconButton
            label={showFilters ? "Nascondi filtri" : "Mostra filtri"}
            icon={SlidersHorizontal}
            onClick={() => setShowFilters((v) => !v)}
            className={activeFilters ? "text-accent" : undefined}
          />
        }
      >
        <ScopeSwitch />

        <div className="flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5">
          <Search className="h-4 w-4 shrink-0 text-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca negozio, categoria, nota…"
            aria-label="Cerca fra i movimenti"
            className="min-h-11 w-full bg-transparent text-sm outline-none placeholder:text-faint"
          />
          {query && <IconButton label="Cancella ricerca" icon={X} onClick={() => setQuery("")} className="h-8 w-8" />}
        </div>

        {/* I filtri attivi restano visibili: prima c'era solo un badge numerico. */}
        <div className="no-bar -mx-4 flex gap-2 overflow-x-auto px-4 lg:-mx-8 lg:px-8">
          {FILTRI.map((f) => (
            <Chip key={f.value} active={filtro === f.value} onClick={() => setFiltro(f.value)}>
              {f.label}
              {f.value === "da-confermare" && o.daConfermare.length > 0 && (
                <span className="ml-0.5 rounded-pill bg-warn-soft px-1.5 text-[10px] text-warn">
                  {o.daConfermare.length}
                </span>
              )}
            </Chip>
          ))}
          {catFilter.map((c) => (
            <Chip key={c} active icon={X} onClick={() => setCatFilter((p) => p.filter((x) => x !== c))}>
              {c}
            </Chip>
          ))}
          {payerFilter.map((p) => (
            <Chip key={p} active icon={X} onClick={() => setPayerFilter((prev) => prev.filter((x) => x !== p))}>
              {p === "__fondo__" ? profile?.group_name || "Fondo comune" : memberById.get(p)?.name ?? "Membro"}
            </Chip>
          ))}
        </div>

        <PeriodBar />

        {showFilters && (
          <div className="anim-up grid gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted">Categoria</label>
              <MultiSelect options={categorie} selected={catFilter} onChange={setCatFilter} placeholder="Tutte" />
            </div>
            {scope === "C" && members.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Chi ha pagato</label>
                <MultiSelect
                  options={["__fondo__", ...members.map((m) => m.userId)]}
                  selected={payerFilter}
                  onChange={setPayerFilter}
                  placeholder="Tutti"
                  renderLabel={(id) =>
                    id === "__fondo__"
                      ? profile?.group_name || "Fondo comune"
                      : memberById.get(id)?.name ?? "Membro"
                  }
                />
              </div>
            )}
          </div>
        )}
      </PageHeader>

      <PageBody
        main={
          <>
            {loading ? (
              <Card className="p-4">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="mt-4 h-[140px] w-full" />
              </Card>
            ) : (
              <Card className="p-4 lg:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <Eyebrow>Speso nel periodo</Eyebrow>
                    <p className="tnum mt-1 text-[28px] font-extrabold leading-none" style={{ color: "var(--neg)" }}>
                      {formatCurrency(o.realOut)}
                    </p>
                    <p className="mt-1.5 text-[13px] text-muted">
                      e incassato{" "}
                      <strong className="tnum font-bold" style={{ color: "var(--pos)" }}>
                        {formatCurrency(o.realIn)}
                      </strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <Eyebrow>Saldo stimato a fine periodo</Eyebrow>
                    <p
                      className="tnum mt-1 text-base font-bold"
                      style={{ color: o.saldoPrevisto < 0 ? "var(--neg)" : "var(--muted)" }}
                    >{formatCurrency(o.saldoPrevisto)}</p>
                  </div>
                </div>
                <Bars items={o.settimane} ariaLabel="Uscite per settimana; le settimane future sono previsioni." />
              </Card>
            )}

            {loading ? (
              <Card className="divide-y divide-line">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </Card>
            ) : giorni.length === 0 ? (
              <Card>
                {/* «Nessun risultato» solo se c'è davvero un filtro da togliere:
                    le ricorrenze madri stanno in transactions ma non si vedono
                    mai, e da sole facevano proporre «Azzera i filtri» a vuoto. */}
                <EmptyState
                  icon={Wallet}
                  title={filtriAttivi ? "Nessun risultato" : "Nessun movimento nel periodo"}
                  body={
                    filtriAttivi
                      ? "Prova a togliere qualche filtro o a cambiare periodo."
                      : "Aggiungi la prima spesa: da lì l'app inizia a dirti quanto puoi spendere."
                  }
                  action={
                    !filtriAttivi ? (
                      <Link href="/spese/nuova">
                        <Button variant="primary">Aggiungi spesa</Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={() => {
                          setFiltro("tutti");
                          setQuery("");
                          setCatFilter([]);
                          setPayerFilter([]);
                        }}
                      >
                        Azzera i filtri
                      </Button>
                    )
                  }
                />
              </Card>
            ) : (
              giorni.map((g) => (
                <Card key={g.date} className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2.5">
                    <span className="text-[11.5px] font-bold uppercase tracking-wide text-faint">{g.label}</span>
                    <span
                      className="adv-only tnum text-xs font-bold"
                      style={{ color: g.total < 0 ? "var(--neg)" : "var(--pos)" }}
                    >
                      {g.total > 0 ? "+" : ""}
                      {formatCurrency(g.total)}
                    </span>
                  </div>
                  <ul>
                    {g.items.map((t) => (
                      <MovimentoRow
                        key={t.id}
                        t={t}
                        member={t.paid_by ? memberById.get(t.paid_by) : undefined}
                        isMine={t.paid_by === user?.id}
                        fondo={
                          scope === "C" && t.paid_by === null
                            ? profile?.group_name || "Fondo comune"
                            : undefined
                        }
                        busy={busy === t.id}
                        onConfirm={() => confirm(t)}
                        onEdit={() => setEditing(t)}
                        onDelete={() => setToDelete(t)}
                        onReceipt={t.receipt_path ? () => setScontrino(t.receipt_path ?? null) : undefined}
                      />
                    ))}
                  </ul>
                </Card>
              ))
            )}
          </>
        }
        side={
          // Solo Avanzata: sei cifre di contabilità; in Semplice la domanda è
          // «dove sono finiti i soldi» e la risponde la lista.
          <Card className="adv-only p-4 lg:p-5">
            <CardHeader title="Riepilogo" hint={periodLabel} />
            <dl className="flex flex-col gap-3 text-sm">
              <SumRow label="Entrate incassate" value={o.realIn} tone="pos" />
              <SumRow label="Uscite sostenute" value={o.realOut} tone="neg" />
              <div className="border-t border-line pt-3">
                <SumRow label="In cassa oggi" value={o.saldoReale} strong />
              </div>
              <SumRow label="Ancora impegnato" value={-o.impegnato} />
              <SumRow label="Ancora da incassare" value={o.atteso} />
              <div className="border-t border-line pt-3">
                <SumRow label="Stima a fine periodo" value={o.saldoPrevisto} strong />
              </div>
            </dl>
          </Card>
        }
      />

      <ReceiptViewer path={scontrino} onClose={() => setScontrino(null)} scope={scope} />

      {editing && (
        <EditExpenseModal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          onSuccess={reload}
          expense={editing}
          scope={scope}
        />
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminare questo movimento?"
        description={
          toDelete
            ? `"${toDelete.negozio || toDelete.ambito}" da ${formatCurrency(Number(toDelete.importo))}. Dopo l'eliminazione avrai qualche secondo per annullare.`
            : undefined
        }
        footer={
          <>
            <Button onClick={() => setToDelete(null)}>Annulla</Button>
            <Button variant="danger" icon={Trash2} loading={busy === toDelete?.id} onClick={doDelete}>
              Elimina
            </Button>
          </>
        }
      />
    </ProtectedRoute>
  );
}

/* ---------------- riga movimento ---------------- */

function MovimentoRow({
  t,
  member,
  isMine,
  fondo,
  busy,
  onConfirm,
  onEdit,
  onDelete,
  onReceipt,
}: {
  t: Spesa;
  member?: Member;
  isMine: boolean;
  /** nome del fondo comune quando nessun membro ha anticipato */
  fondo?: string;
  busy: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** presente solo se la spesa ha uno scontrino allegato */
  onReceipt?: () => void;
}) {
  const entrata = t.tipo_transazione === "entrata";
  const daConfermare = !t.confermata;
  const futura = t.data_spesa > todayISO();

  return (
    <li className="flex min-h-[68px] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
        style={{
          background: daConfermare ? "var(--warn-soft)" : entrata ? "var(--pos-soft)" : "var(--surface-3)",
          color: daConfermare ? "var(--warn)" : entrata ? "var(--pos)" : "var(--muted)",
        }}
      >
        {entrata ? <ArrowDownLeft className="h-4 w-4" aria-hidden /> : <ArrowUpRight className="h-4 w-4" aria-hidden />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{t.negozio || t.ambito || "Senza nome"}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-faint">
          {/* senza negozio il titolo è già la categoria: non la si ripete sotto */}
          {t.negozio && <span className="truncate">{t.ambito || "Senza categoria"}</span>}
          {t.ricorrente && (
            <Pill icon={Repeat}>ricorrente</Pill>
          )}
          {daConfermare && (
            <Pill tone="warn" icon={AlertTriangle}>
              {futura ? "previsto" : "da confermare"}
            </Pill>
          )}
        </p>
      </div>

      {member ? (
        <Avatar id={member.userId} name={isMine ? `${member.name} (tu)` : member.name} size={26} />
      ) : (
        fondo && (
          <span
            title={`Pagata dal fondo comune (${fondo})`}
            className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-surface-3 text-faint"
          >
            <Wallet className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Pagata dal fondo comune</span>
          </span>
        )
      )}

      <span
        className="tnum shrink-0 text-right text-[15px] font-bold"
        style={{ color: entrata ? "var(--pos)" : "var(--text)", opacity: daConfermare ? 0.65 : 1 }}
      >
        {entrata ? "+" : "−"}
        {formatCurrency(Number(t.importo))}
      </span>

      <div className="flex shrink-0 items-center">
        {onReceipt && (
          <IconButton label="Guarda lo scontrino" icon={Paperclip} onClick={onReceipt} className="h-10 w-10" />
        )}
        {daConfermare && (
          <IconButton label="Conferma il movimento" icon={Check} onClick={onConfirm} disabled={busy} className="text-pos" />
        )}
        <IconButton label="Modifica il movimento" icon={Pencil} onClick={onEdit} className="h-10 w-10" />
        <IconButton label="Elimina il movimento" icon={Trash2} onClick={onDelete} className="h-10 w-10 hover:text-neg" />
      </div>
    </li>
  );
}

function SumRow({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: number;
  tone?: "pos" | "neg";
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={strong ? "font-semibold" : "text-muted"}>{label}</dt>
      <dd
        className={`tnum ${strong ? "text-base font-bold" : "font-semibold"}`}
        style={tone ? { color: tone === "pos" ? "var(--pos)" : "var(--neg)" } : undefined}
      >
        {formatCurrency(value)}
      </dd>
    </div>
  );
}

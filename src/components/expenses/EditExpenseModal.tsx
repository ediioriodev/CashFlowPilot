"use client";

import { useEffect, useState } from "react";
import { Calendar, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { expenseService } from "@/services/expenseService";
import { familyService, type Member, type Split } from "@/services/familyService";
import { receiptService } from "@/services/receiptService";
import { useAuth } from "@/context/AuthContext";
import PayerPicker from "./PayerPicker";
import SplitEditor from "./SplitEditor";
import ReceiptPicker from "./ReceiptPicker";
import type { Ambito, Spesa } from "@/types/expenses";
import { Button, Field, Modal, SegTabs, Toggle, inputClass } from "@/components/ui/kit";
import { formatCurrency } from "@/lib/formatUtils";

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expense: Spesa;
  scope: "C" | "P";
  /** Stato iniziale di «Aggiorna le occorrenze future». Da Fisse e abbonamenti
      si modifica la VOCE, non una rata: lì parte acceso. */
  aggiornaFuture?: boolean;
}

/** Accetta "12,50" e "12.50". */
function parseAmount(raw: string): number | null {
  const clean = raw.replace(/\s/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export default function EditExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  expense,
  scope,
  aggiornaFuture = false,
}: EditExpenseModalProps) {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [ambiti, setAmbiti] = useState<Ambito[]>([]);
  const [negozi, setNegozi] = useState<string[]>([]);

  const [tipo, setTipo] = useState<"spesa" | "entrata">("spesa");
  const [importo, setImporto] = useState("");
  const [ambito, setAmbito] = useState("");
  const [negozio, setNegozio] = useState("");
  const [nota, setNota] = useState("");
  const [data, setData] = useState("");
  const [updateFuture, setUpdateFuture] = useState(aggiornaFuture);
  const [payer, setPayer] = useState<string | null>(null);
  // Se la RPC di lettura non restituisce paid_by il valore arriva undefined:
  // in quel caso non dobbiamo scriverlo, o sovrascriveremmo un anticipo
  // reale con "fondo comune" senza che l'utente abbia toccato niente.
  const [payerNoto, setPayerNoto] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [splitsToccati, setSplitsToccati] = useState(false);
  /** Quote già salvate sulla spesa. undefined = ancora in lettura. */
  const [splitsSalvati, setSplitsSalvati] = useState<Split[] | undefined>(undefined);
  const [quoteValide, setQuoteValide] = useState(true);
  // L'avviso «non fanno 100» sparisce da solo appena le quote tornano giuste.
  useEffect(() => {
    if (quoteValide) toast.dismiss("quote-100");
  }, [quoteValide]);
  const [scontrino, setScontrino] = useState<File | null>(null);
  const [scontrinoPath, setScontrinoPath] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ importo?: string; ambito?: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    Promise.all([expenseService.getAmbiti(scope), expenseService.getNegozi(scope)])
      .then(([a, n]) => {
        if (!alive) return;
        setAmbiti(a);
        setNegozi(n);
      })
      .catch(console.error);

    setTipo(expense.tipo_transazione);
    setImporto(String(expense.importo).replace(".", ","));
    setAmbito(expense.ambito ?? "");
    setNegozio(expense.negozio ?? "");
    setNota(expense.note_spese ?? "");
    setData((expense.data_spesa ?? "").split("T")[0]);
    setPayer(expense.paid_by ?? null);
    setPayerNoto(expense.paid_by !== undefined);
    setScontrino(null);
    setScontrinoPath(expense.receipt_path ?? null);
    setSplits([]);
    setSplitsToccati(false);
    setQuoteValide(true);
    /* Le quote vanno LETTE, non date per scontate: senza questo il riquadro
       ripartiva da «parti uguali» anche su una spesa divisa 70/30, e al
       salvataggio la divisione spariva senza che nessuno l'avesse toccata. */
    setSplitsSalvati(undefined);
    if (scope === "C" && expense.id) {
      familyService.getSplits(expense.id).then((q) => alive && setSplitsSalvati(q));
    } else {
      setSplitsSalvati([]);
    }
    setUpdateFuture(aggiornaFuture);
    if (scope === "C") familyService.getMembers().then((m) => alive && setMembers(m));
    setErrors({});
    return () => {
      alive = false;
    };
  }, [isOpen, expense, scope, aggiornaFuture]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (parseAmount(importo) === null) found.importo = "Inserisci un importo maggiore di zero.";
    if (!ambito.trim()) found.ambito = "La categoria è obbligatoria.";
    setErrors(found);
    if (Object.keys(found).length) return;
    /* Quote che non fanno 100: prima venivano normalizzate di nascosto e
       finiva a database una cifra che nessuno aveva scritto. */
    if (!quoteValide) {
      toast.error("Le quote non fanno 100%", {
        id: "quote-100",
        description: "Correggi le percentuali prima di salvare.",
      });
      return;
    }

    setSaving(true);
    try {
      if (!expense.id) throw new Error("ID mancante");
      await expenseService.updateExpense(
        expense.id,
        {
          importo: parseAmount(importo)!,
          ambito: ambito.trim(),
          negozio: negozio.trim(),
          note_spese: nota.trim(),
          data_spesa: data,
          tipo_transazione: tipo,
          paid_by: scope === "C" && payerNoto ? payer : undefined,
          confermata: expense.confermata,
          recurring_parent_id: expense.recurring_parent_id,
          is_recurring_parent: expense.is_recurring_parent,
        },
        scope,
        updateFuture
      );

      // Quote e scontrino sono accessori: il movimento è già salvo, un
      // loro errore si racconta ma non fa fallire la modifica.
      if (scope === "C" && splitsToccati) {
        // splitsToccati è vero solo dopo un cambiamento reale dell'utente.
        const esito = await familyService.setSplits(expense.id, splits);
        if (!esito.ok && !esito.needsMigration) {
          toast.warning("Quote non salvate", {
            description: esito.error ?? "La spesa si divide in parti uguali.",
          });
        }
      }

      if (scontrino) {
        const esito = await receiptService.uploadAndAttach(scontrino, scope, expense.id);
        if (!esito.ok) {
          toast.warning("Scontrino non allegato", {
            description: esito.needsMigration
              ? "Gli scontrini non sono ancora attivi sul database."
              : (esito.error ?? "Riprova più tardi."),
          });
        }
      } else if (scontrinoPath === null && expense.receipt_path) {
        // l'utente l'ha tolto: prima si scollega, poi si cancella il file
        const staccato = await receiptService.attach(expense.id, scope, null);
        if (staccato.ok) await receiptService.remove(expense.receipt_path);
      }

      toast.success("Movimento aggiornato", {
        description: `${tipo === "spesa" ? "−" : "+"}${formatCurrency(parseAmount(importo)!)} · ${ambito.trim()}`,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Aggiornamento non riuscito", { description: "Controlla la connessione e riprova." });
    } finally {
      setSaving(false);
    }
  };

  const ricorrente = !!(expense.recurring_parent_id || expense.is_recurring_parent);

  return (
    <Modal open={isOpen} onClose={saving ? () => {} : onClose} title="Modifica movimento" size="md">
      <form onSubmit={submit} noValidate className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-0.5">
        <SegTabs
          ariaLabel="Tipo di movimento"
          value={tipo}
          onChange={setTipo}
          options={[
            { value: "spesa", label: "Uscita", tone: "neg" },
            { value: "entrata", label: "Entrata", tone: "pos" },
          ]}
        />

        <Field label="Importo" required htmlFor="edit-importo" error={errors.importo}>
          <input
            id="edit-importo"
            type="text"
            inputMode="decimal"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            aria-invalid={!!errors.importo}
            className={`${inputClass} tnum text-2xl font-bold`}
            style={{ color: tipo === "spesa" ? "var(--neg)" : "var(--pos)" }}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data" htmlFor="edit-data">
            <div className="relative">
              <input id="edit-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass} />
              <Calendar className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
            </div>
          </Field>

          <Field label="Categoria" required htmlFor="edit-ambito" error={errors.ambito}>
            <input
              id="edit-ambito"
              list="edit-ambiti"
              value={ambito}
              onChange={(e) => setAmbito(e.target.value)}
              aria-invalid={!!errors.ambito}
              className={inputClass}
            />
            <datalist id="edit-ambiti">
              {ambiti.map((a) => (
                <option key={a.code} value={a.name} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field label="Dove" htmlFor="edit-negozio">
          <div className="relative">
            <input
              id="edit-negozio"
              list="edit-negozi"
              value={negozio}
              onChange={(e) => setNegozio(e.target.value)}
              className={`${inputClass} pl-10`}
            />
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
          </div>
          <datalist id="edit-negozi">
            {negozi.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>

        {scope === "C" && profile?.group_id && (
          <PayerPicker
            value={payer}
            onChange={(v) => {
              setPayer(v);
              setPayerNoto(true);
            }}
            members={members}
            groupName={profile.group_name}
            date={data}
            groupId={profile.group_id}
            currentUserId={user?.id}
          />
        )}

        {/* Le quote valgono solo sugli anticipi: una spesa del fondo
            comune è già di tutti e non entra nel conguaglio. */}
        {scope === "C" && profile?.group_id && payer !== null && (
          <SplitEditor
            members={members}
            importo={parseAmount(importo) ?? 0}
            iniziali={splitsSalvati}
            onValiditaChange={setQuoteValide}
            onChange={(s) => {
              setSplits(s);
              setSplitsToccati(true);
            }}
          />
        )}

        <ReceiptPicker
          value={scontrino}
          onChange={setScontrino}
          path={scontrinoPath}
          onRemovePath={() => setScontrinoPath(null)}
          scope={scope}
        />

        <Field label="Nota" htmlFor="edit-nota">
          <textarea
            id="edit-nota"
            rows={2}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className={`${inputClass} min-h-20 py-3`}
          />
        </Field>

        {ricorrente && (
          <div className="flex items-start justify-between gap-3 rounded-md border border-warn bg-warn-soft p-3.5">
            <div>
              <p className="text-sm font-semibold text-ink">Aggiorna anche le occorrenze future</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Applica le modifiche a tutte le ripetizioni successive a questa data.
              </p>
            </div>
            <Toggle checked={updateFuture} onChange={setUpdateFuture} label="Aggiorna le occorrenze future" />
          </div>
        )}

        <div className="sticky bottom-0 flex gap-2 border-t border-line bg-surface pt-4">
          <Button type="button" onClick={onClose} disabled={saving} className="flex-1">
            Annulla
          </Button>
          <Button type="submit" variant="primary" icon={Save} loading={saving} className="flex-1">
            Salva
          </Button>
        </div>
      </form>
    </Modal>
  );
}

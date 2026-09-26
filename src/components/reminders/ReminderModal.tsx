"use client";

import { useEffect, useState } from "react";
import { Bell, Calendar, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Reminder, ReminderFormData, AlertOffset } from "@/types/reminders";
import { ALERT_OFFSETS, ALERT_OFFSET_LABELS } from "@/types/reminders";
import { Button, Chip, Field, Modal, SegTabs, inputClass } from "@/components/ui/kit";
import { formatDateForAPI } from "@/lib/formatUtils";

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSave: (data: ReminderFormData) => Promise<void>;
  reminder?: Reminder | null; // se presente, si modifica
  groupId: number | null;
}

/**
 * Data e ora di partenza: fra un'ora, arrotondata al quarto d'ora.
 * «Adesso» faceva scattare l'avviso nell'istante stesso del salvataggio;
 * e la data si prende in ora LOCALE — toISOString() è UTC, e fra mezzanotte
 * e le due proponeva il giorno prima.
 */
const defaultForm = (): ReminderFormData => {
  const t = new Date(Date.now() + 60 * 60 * 1000);
  t.setMinutes(Math.ceil(t.getMinutes() / 15) * 15, 0, 0);
  return {
    title: "",
    note: "",
    amount: "",
    reminder_date: formatDateForAPI(t),
    reminder_time: `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`,
    alerts: [0],
    is_personal: true,
    group_id: null,
  };
};

/**
 * Stesso guscio di tutte le altre modali (kit.Modal): fuoco trattenuto nel
 * pannello, Esc per chiudere, ruolo di dialogo. Prima era un div a sé, con i
 * pulsanti attivi in text-white su accento — illeggibile in tema scuro, lo
 * stesso difetto di RIL-012.
 */
export default function ReminderModal({ isOpen, onClose, onSuccess, onSave, reminder, groupId }: ReminderModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ReminderFormData>(defaultForm());
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrore(null);
    if (reminder) {
      setForm({
        title: reminder.title,
        note: reminder.note || "",
        amount: reminder.amount != null ? String(reminder.amount).replace(".", ",") : "",
        reminder_date: reminder.reminder_date,
        reminder_time: reminder.reminder_time.slice(0, 5), // "HH:MM"
        alerts: reminder.alerts,
        is_personal: reminder.is_personal,
        group_id: reminder.group_id,
      });
    } else {
      setForm(defaultForm());
    }
  }, [isOpen, reminder]);

  const toggleAlert = (offset: AlertOffset) => {
    setForm((prev) => ({
      ...prev,
      alerts: prev.alerts.includes(offset) ? prev.alerts.filter((a) => a !== offset) : [...prev.alerts, offset],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrore("Scrivi di cosa ti vuoi ricordare.");
      return;
    }
    if (!form.reminder_date || !form.reminder_time) return;

    // "12,50" e "12.50" valgono uguale: con type=number la virgola non arrivava
    const amount = form.amount.trim() ? form.amount.replace(/\s/g, "").replace(",", ".") : "";
    if (amount && !(Number(amount) >= 0)) {
      setErrore("L'importo non è un numero valido.");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        amount,
        alerts: form.alerts.length ? form.alerts : [0],
        group_id: form.is_personal ? null : groupId,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      // prima finiva solo in console: la modale restava aperta senza dire perché
      toast.error("Non è stato possibile salvare il promemoria", { description: "Riprova fra un momento." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={reminder ? "Modifica promemoria" : "Nuovo promemoria"}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" form="reminder-form" variant="primary" icon={Check} loading={loading}>
            Salva
          </Button>
        </>
      }
    >
      <form id="reminder-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Di cosa ricordarti" required htmlFor="rem-titolo" error={errore && !form.title.trim() ? errore : null}>
          <input
            id="rem-titolo"
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Es. Pagamento affitto"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Giorno" required htmlFor="rem-data">
            <div className="relative">
              <input
                id="rem-data"
                type="date"
                value={form.reminder_date}
                onChange={(e) => setForm((p) => ({ ...p, reminder_date: e.target.value }))}
                className={inputClass}
              />
              <Calendar className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
            </div>
          </Field>
          <Field label="Ora" required htmlFor="rem-ora">
            <div className="relative">
              <input
                id="rem-ora"
                type="time"
                value={form.reminder_time}
                onChange={(e) => setForm((p) => ({ ...p, reminder_time: e.target.value }))}
                className={inputClass}
              />
              <Clock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
            </div>
          </Field>
        </div>

        <Field
          label="Importo"
          htmlFor="rem-importo"
          help="Facoltativo."
          error={errore && form.title.trim() ? errore : null}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint" aria-hidden>
              €
            </span>
            <input
              id="rem-importo"
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder="0,00"
              className={`${inputClass} tnum pl-8`}
            />
          </div>
        </Field>

        <Field label="Nota" htmlFor="rem-nota" help="Facoltativa. Compare nella notifica.">
          <textarea
            id="rem-nota"
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            rows={2}
            placeholder="Aggiungi un dettaglio…"
            className={`${inputClass} min-h-20 resize-none py-3`}
          />
        </Field>

        <Field
          label="Quando avvisarti"
          help={form.alerts.length === 0 ? "Nessuno scelto: ti avvisiamo all'orario." : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {ALERT_OFFSETS.map((offset) => (
              <Chip
                key={offset}
                active={form.alerts.includes(offset)}
                icon={offset === 0 ? Bell : undefined}
                onClick={() => toggleAlert(offset as AlertOffset)}
              >
                {ALERT_OFFSET_LABELS[offset as AlertOffset]}
              </Chip>
            ))}
          </div>
        </Field>

        {groupId !== null && (
          <Field label="Chi lo vede">
            <SegTabs
              ariaLabel="Chi vede il promemoria"
              value={form.is_personal ? "personale" : "gruppo"}
              onChange={(v) => setForm((p) => ({ ...p, is_personal: v === "personale" }))}
              options={[
                { value: "personale", label: "Solo io" },
                { value: "gruppo", label: "Tutto il gruppo" },
              ]}
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}

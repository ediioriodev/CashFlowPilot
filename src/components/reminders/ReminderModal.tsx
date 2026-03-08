"use client";

import { useEffect, useState } from "react";
import { X, Calendar, Clock, Euro, Bell, Save, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { Reminder, ReminderFormData, AlertOffset } from "@/types/reminders";
import { ALERT_OFFSETS, ALERT_OFFSET_LABELS } from "@/types/reminders";

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSave: (data: ReminderFormData) => Promise<void>;
  reminder?: Reminder | null;  // if provided, editing mode
  groupId: number | null;
}

const defaultForm = (): ReminderFormData => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return {
    title: '',
    note: '',
    amount: '',
    reminder_date: dateStr,
    reminder_time: timeStr,
    alerts: [0],
    is_personal: true,
    group_id: null,
  };
};

export default function ReminderModal({ isOpen, onClose, onSuccess, onSave, reminder, groupId }: ReminderModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ReminderFormData>(defaultForm());

  useEffect(() => {
    if (!isOpen) return;

    if (reminder) {
      // Editing existing reminder
      setForm({
        title: reminder.title,
        note: reminder.note || '',
        amount: reminder.amount != null ? String(reminder.amount) : '',
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
      alerts: prev.alerts.includes(offset)
        ? prev.alerts.filter((a) => a !== offset)
        : [...prev.alerts, offset],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.reminder_date || !form.reminder_time) return;
    if (form.alerts.length === 0) {
      setForm((prev) => ({ ...prev, alerts: [0] }));
    }

    setLoading(true);
    try {
      await onSave({ ...form, group_id: form.is_personal ? null : groupId });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {reminder ? 'Modifica Promemoria' : 'Nuovo Promemoria'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Titolo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titolo *</label>
            <input
              type="text"
              required
              autoFocus
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Es. Pagamento affitto"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
            />
          </div>

          {/* Data e Ora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={form.reminder_date}
                  onChange={(e) => setForm((p) => ({ ...p, reminder_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
                <Calendar className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ora *</label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={form.reminder_time}
                  onChange={(e) => setForm((p) => ({ ...p, reminder_time: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
                <Clock className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Importo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Importo (€) — Opzionale</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-4 py-3 pl-10 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
              />
              <Euro className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note — Opzionale</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              rows={2}
              placeholder="Dettagli visualizzabili alla notifica..."
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Avvisi (alert offsets) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
              <Bell className="w-4 h-4" /> Avvisa
            </label>
            <div className="flex flex-wrap gap-2">
              {ALERT_OFFSETS.map((offset) => {
                const active = form.alerts.includes(offset);
                return (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => toggleAlert(offset as AlertOffset)}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      active
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400'
                    )}
                  >
                    {ALERT_OFFSET_LABELS[offset as AlertOffset]}
                  </button>
                );
              })}
            </div>
            {form.alerts.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Seleziona almeno un avviso.</p>
            )}
          </div>

          {/* Ambito: Personale / Di gruppo */}
          {groupId !== null && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ambito</label>
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, is_personal: true }))}
                  className={clsx(
                    'flex-1 py-2 text-sm font-medium rounded-md transition-all',
                    form.is_personal
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  Personale
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, is_personal: false }))}
                  className={clsx(
                    'flex-1 py-2 text-sm font-medium rounded-md transition-all',
                    !form.is_personal
                      ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  Di Gruppo
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || form.alerts.length === 0}
              className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Salva</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

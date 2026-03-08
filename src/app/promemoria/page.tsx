"use client";

import { useEffect, useState } from "react";
import { Bell, Plus, Check, Pencil, Trash2, Euro, ChevronDown, ChevronUp, Users, User } from "lucide-react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ReminderModal from "@/components/reminders/ReminderModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { reminderService } from "@/services/reminderService";
import { useAuth } from "@/context/AuthContext";
import type { Reminder, ReminderFormData } from "@/types/reminders";
import { ALERT_OFFSET_LABELS } from "@/types/reminders";
import { formatDateLabel } from "@/lib/dateUtils";

function formatTime(t: string) {
  return t.slice(0, 5); // "HH:MM"
}

function isUpcoming(r: Reminder) {
  const dt = new Date(`${r.reminder_date}T${r.reminder_time}`);
  return dt >= new Date() && !r.completed;
}

export default function PromemoriaPage() {
  const { profile, settings } = useAuth();
  const groupId = profile?.group_id ?? null;

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await reminderService.getReminders();
      setReminders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (data: ReminderFormData) => {
    if (editingReminder) {
      await reminderService.updateReminder(editingReminder.id, data);
      toast.success("Promemoria aggiornato");
    } else {
      await reminderService.createReminder(data);
      toast.success("Promemoria creato");
    }
    await load();
  };

  const handleComplete = async (r: Reminder) => {
    try {
      if (r.completed) {
        await reminderService.uncompleteReminder(r.id);
        toast.success("Promemoria riaperto");
      } else {
        await reminderService.completeReminder(r.id);
        toast.success("Promemoria completato");
      }
      await load();
    } catch {
      toast.error("Errore aggiornamento");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await reminderService.deleteReminder(deleteTarget.id);
      toast.success("Promemoria eliminato");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Errore eliminazione");
    }
  };

  const upcoming = reminders.filter(isUpcoming);
  const completed = reminders.filter((r) => !isUpcoming(r));

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
        <main className="max-w-lg mx-auto mt-4 px-4 space-y-4">

          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Promemoria</h1>
            <button
              onClick={() => { setEditingReminder(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nuovo
            </button>
          </div>

          {/* Upcoming */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Prossimi ({upcoming.length})
            </h2>

            {loading ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-600">Caricamento...</div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 dark:text-gray-600 text-sm">Nessun promemoria in arrivo</p>
                <button
                  onClick={() => { setEditingReminder(null); setModalOpen(true); }}
                  className="mt-4 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
                >
                  Crea il primo promemoria
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((r) => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    onComplete={() => handleComplete(r)}
                    onEdit={() => { setEditingReminder(r); setModalOpen(true); }}
                    onDelete={() => setDeleteTarget(r)}
                    delConfirm={settings?.del_confirm ?? true}
                    onDeleteDirect={settings?.del_confirm ? undefined : async () => {
                      await reminderService.deleteReminder(r.id);
                      toast.success("Promemoria eliminato");
                      await load();
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Completed (collapsible) */}
          {!loading && completed.length > 0 && (
            <section>
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 w-full text-left py-1"
              >
                {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Completati / Scaduti ({completed.length})
              </button>

              {showCompleted && (
                <ul className="space-y-3">
                  {completed.map((r) => (
                    <ReminderCard
                      key={r.id}
                      reminder={r}
                      onComplete={() => handleComplete(r)}
                      onEdit={() => { setEditingReminder(r); setModalOpen(true); }}
                      onDelete={() => setDeleteTarget(r)}
                      delConfirm={settings?.del_confirm ?? true}
                      onDeleteDirect={settings?.del_confirm ? undefined : async () => {
                        await reminderService.deleteReminder(r.id);
                        toast.success("Promemoria eliminato");
                        await load();
                      }}
                      dimmed
                    />
                  ))}
                </ul>
              )}
            </section>
          )}

        </main>
      </div>

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { }}
        onSave={handleSave}
        reminder={editingReminder}
        groupId={groupId}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Elimina promemoria"
        message={`Eliminare "${deleteTarget?.title}"? L'operazione non è reversibile.`}
        confirmText="Elimina"
        cancelText="Annulla"
        isDestructive
      />
    </ProtectedRoute>
  );
}

interface ReminderCardProps {
  reminder: Reminder;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  delConfirm: boolean;
  onDeleteDirect?: () => Promise<void>;
  dimmed?: boolean;
}

function ReminderCard({ reminder: r, onComplete, onEdit, onDelete, delConfirm, onDeleteDirect, dimmed }: ReminderCardProps) {
  const alertLabels = r.alerts
    .map((a) => ALERT_OFFSET_LABELS[a as keyof typeof ALERT_OFFSET_LABELS] ?? `${a} min prima`)
    .join(', ');

  return (
    <li className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 transition-opacity ${dimmed ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">

        {/* Complete toggle */}
        <button
          onClick={onComplete}
          title={r.completed ? 'Riapri' : 'Segna come completato'}
          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            r.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
          }`}
        >
          {r.completed && <Check className="w-3.5 h-3.5" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-gray-800 dark:text-gray-100 ${r.completed ? 'line-through text-gray-400 dark:text-gray-600' : ''}`}>
              {r.title}
            </span>
            {/* Scope badge */}
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              r.is_personal
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
            }`}>
              {r.is_personal ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
              {r.is_personal ? 'Personale' : 'Gruppo'}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
            <span>{formatDateLabel(r.reminder_date)} · {formatTime(r.reminder_time)}</span>
            {r.amount != null && (
              <span className="flex items-center gap-0.5 font-medium text-gray-700 dark:text-gray-300">
                <Euro className="w-3.5 h-3.5" />
                {r.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {r.note && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 line-clamp-2">{r.note}</p>
          )}

          <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <Bell className="w-3.5 h-3.5" />
            {alertLabels}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            title="Modifica"
            className="p-2 rounded-lg text-gray-400 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={delConfirm ? onDelete : onDeleteDirect}
            title="Elimina"
            className="p-2 rounded-lg text-gray-400 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

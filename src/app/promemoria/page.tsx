"use client";

import { useEffect, useState } from "react";
import { Bell, Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, User, Users } from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import ReminderModal from "@/components/reminders/ReminderModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Button, Card, EmptyState, IconButton, Pill, Skeleton } from "@/components/ui/kit";
import { reminderService } from "@/services/reminderService";
import { formatCurrency } from "@/lib/formatUtils";
import { useAuth } from "@/context/AuthContext";
import type { Reminder, ReminderFormData } from "@/types/reminders";
import { ALERT_OFFSET_LABELS } from "@/types/reminders";
import { formatDateLabel } from "@/lib/dateUtils";

const formatTime = (t: string) => t.slice(0, 5);

function isUpcoming(r: Reminder) {
  return new Date(`${r.reminder_date}T${r.reminder_time}`) >= new Date() && !r.completed;
}

export default function PromemoriaPage() {
  const { profile, settings } = useAuth();
  const groupId = profile?.group_id ?? null;

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setReminders(await reminderService.getReminders());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (data: ReminderFormData) => {
    if (editing) {
      await reminderService.updateReminder(editing.id, data);
      toast.success("Promemoria aggiornato");
    } else {
      await reminderService.createReminder(data);
      toast.success("Promemoria creato");
    }
    await load();
  };

  const toggleComplete = async (r: Reminder) => {
    try {
      if (r.completed) {
        await reminderService.uncompleteReminder(r.id);
        toast.success("Promemoria riaperto");
      } else {
        await reminderService.completeReminder(r.id);
        toast.success("Promemoria completato", {
          action: { label: "Annulla", onClick: () => toggleComplete({ ...r, completed: true }) },
        });
      }
      await load();
    } catch {
      toast.error("Aggiornamento non riuscito");
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
      toast.error("Eliminazione non riuscita");
    }
  };

  const deleteNow = async (r: Reminder) => {
    await reminderService.deleteReminder(r.id);
    toast.success("Promemoria eliminato");
    await load();
  };

  const upcoming = reminders.filter(isUpcoming);
  const past = reminders.filter((r) => !isUpcoming(r));

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  return (
    <ProtectedRoute>
      <PageHeader
        title="Promemoria"
        subtitle={loading ? undefined : `${upcoming.length} in arrivo`}
        actions={
          <Button size="sm" variant="primary" icon={Plus} onClick={openNew}>
            Nuovo
          </Button>
        }
      />

      <PageBody
        main={
          <>
            <section aria-labelledby="prossimi">
              <h2 id="prossimi" className="mb-2 text-xs font-bold uppercase tracking-[0.07em] text-faint">
                In arrivo
              </h2>

              {loading ? (
                <div className="flex flex-col gap-3">
                  {[0, 1].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-card" />
                  ))}
                </div>
              ) : upcoming.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={Bell}
                    title="Nessun promemoria in arrivo"
                    body="Usali per bollette, scadenze e rinnovi: ti avvisiamo prima che sia tardi."
                    action={
                      <Button variant="primary" icon={Plus} onClick={openNew}>
                        Crea il primo
                      </Button>
                    }
                  />
                </Card>
              ) : (
                <ul className="flex flex-col gap-3">
                  {upcoming.map((r) => (
                    <ReminderCard
                      key={r.id}
                      reminder={r}
                      onComplete={() => toggleComplete(r)}
                      onEdit={() => {
                        setEditing(r);
                        setModalOpen(true);
                      }}
                      onDelete={() => (settings?.del_confirm ?? true ? setDeleteTarget(r) : deleteNow(r))}
                    />
                  ))}
                </ul>
              )}
            </section>

            {!loading && past.length > 0 && (
              <section aria-labelledby="passati">
                <button
                  type="button"
                  onClick={() => setShowCompleted((v) => !v)}
                  aria-expanded={showCompleted}
                  className="mb-2 flex min-h-11 w-full items-center gap-2 text-xs font-bold uppercase tracking-[0.07em] text-faint"
                >
                  {showCompleted ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                  <span id="passati">Completati e scaduti ({past.length})</span>
                </button>

                {showCompleted && (
                  <ul className="anim-up flex flex-col gap-3">
                    {past.map((r) => (
                      <ReminderCard
                        key={r.id}
                        reminder={r}
                        dimmed
                        onComplete={() => toggleComplete(r)}
                        onEdit={() => {
                          setEditing(r);
                          setModalOpen(true);
                        }}
                        onDelete={() => (settings?.del_confirm ?? true ? setDeleteTarget(r) : deleteNow(r))}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        }
      />

      <ReminderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {}}
        onSave={handleSave}
        reminder={editing}
        groupId={groupId}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminare il promemoria?"
        message={deleteTarget ? `"${deleteTarget.title}" verrà rimosso. L'operazione non è reversibile.` : ""}
        confirmText="Elimina"
        isDestructive
      />
    </ProtectedRoute>
  );
}

function ReminderCard({
  reminder: r,
  onComplete,
  onEdit,
  onDelete,
  dimmed,
}: {
  reminder: Reminder;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  dimmed?: boolean;
}) {
  const alerts = r.alerts
    .map((a) => ALERT_OFFSET_LABELS[a as keyof typeof ALERT_OFFSET_LABELS] ?? `${a} min prima`)
    .join(", ");

  return (
    <li>
      <Card as="article" className={`p-4 ${dimmed ? "opacity-70" : ""}`}>
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onComplete}
            aria-pressed={r.completed}
            aria-label={r.completed ? `Riapri ${r.title}` : `Segna ${r.title} come completato`}
            className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors ${
              r.completed ? "border-pos bg-pos text-white" : "border-line-strong hover:border-pos"
            }`}
          >
            {r.completed && <Check className="h-4 w-4" aria-hidden />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-sm font-semibold ${r.completed ? "text-faint line-through" : ""}`}>{r.title}</h3>
              <Pill tone={r.is_personal ? "neutral" : "accent"} icon={r.is_personal ? User : Users}>
                {r.is_personal ? "Personale" : "Gruppo"}
              </Pill>
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-muted">
              <span className="tnum">
                {formatDateLabel(r.reminder_date)} · {formatTime(r.reminder_time)}
              </span>
              {r.amount != null && (
                <span className="tnum font-semibold text-ink">{formatCurrency(Number(r.amount))}</span>
              )}
            </p>

            {r.note && <p className="mt-1 line-clamp-2 text-xs text-faint">{r.note}</p>}

            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-faint">
              <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {alerts}
            </p>
          </div>

          <div className="flex shrink-0">
            <IconButton label={`Modifica ${r.title}`} icon={Pencil} onClick={onEdit} className="h-10 w-10" />
            <IconButton label={`Elimina ${r.title}`} icon={Trash2} onClick={onDelete} className="h-10 w-10 hover:text-neg" />
          </div>
        </div>
      </Card>
    </li>
  );
}

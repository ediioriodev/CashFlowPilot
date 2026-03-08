import { supabase } from "@/lib/supabaseClient";
import type { Reminder, ReminderFormData } from "@/types/reminders";

export const reminderService = {
  async getReminders(): Promise<Reminder[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetch personal reminders + group reminders via RLS
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .is('deleted_at', null)
      .order('reminder_date', { ascending: true })
      .order('reminder_time', { ascending: true });

    if (error) {
      console.error('Error fetching reminders:', error);
      return [];
    }

    return data as Reminder[];
  },

  async createReminder(formData: ReminderFormData): Promise<Reminder> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    const payload = {
      user_id: user.id,
      group_id: formData.is_personal ? null : formData.group_id,
      is_personal: formData.is_personal,
      title: formData.title.trim(),
      note: formData.note.trim() || null,
      amount: formData.amount ? parseFloat(formData.amount.replace(',', '.')) : null,
      reminder_date: formData.reminder_date,
      reminder_time: formData.reminder_time,
      alerts: formData.alerts.length > 0 ? formData.alerts : [0],
    };

    const { data, error } = await supabase
      .from('reminders')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as Reminder;
  },

  async updateReminder(id: number, formData: Partial<ReminderFormData>): Promise<Reminder> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (formData.title !== undefined) payload.title = formData.title.trim();
    if (formData.note !== undefined) payload.note = formData.note.trim() || null;
    if (formData.amount !== undefined) {
      payload.amount = formData.amount ? parseFloat(formData.amount.replace(',', '.')) : null;
    }
    if (formData.reminder_date !== undefined) payload.reminder_date = formData.reminder_date;
    if (formData.reminder_time !== undefined) payload.reminder_time = formData.reminder_time;
    if (formData.alerts !== undefined) payload.alerts = formData.alerts.length > 0 ? formData.alerts : [0];
    if (formData.is_personal !== undefined) {
      payload.is_personal = formData.is_personal;
      payload.group_id = formData.is_personal ? null : formData.group_id ?? null;
    }

    const { data, error } = await supabase
      .from('reminders')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Reminder;
  },

  async deleteReminder(id: number): Promise<void> {
    const { error } = await supabase
      .from('reminders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async completeReminder(id: number): Promise<void> {
    const { error } = await supabase
      .from('reminders')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async uncompleteReminder(id: number): Promise<void> {
    const { error } = await supabase
      .from('reminders')
      .update({ completed: false, completed_at: null })
      .eq('id', id);

    if (error) throw error;
  },
};

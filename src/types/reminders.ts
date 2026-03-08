export type AlertOffset = 0 | 15 | 60 | 1440;

export const ALERT_OFFSET_LABELS: Record<AlertOffset, string> = {
  0: "All'orario",
  15: '15 min prima',
  60: '1 ora prima',
  1440: '1 giorno prima',
};

export const ALERT_OFFSETS: AlertOffset[] = [0, 15, 60, 1440];

export interface Reminder {
  id: number;
  user_id: string;
  group_id: number | null;
  is_personal: boolean;
  title: string;
  note: string | null;
  amount: number | null;
  reminder_date: string;   // ISO date: "YYYY-MM-DD"
  reminder_time: string;   // "HH:MM" or "HH:MM:SS"
  alerts: number[];        // array of minute offsets
  completed: boolean;
  completed_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderFormData {
  title: string;
  note: string;
  amount: string;
  reminder_date: string;
  reminder_time: string;
  alerts: number[];
  is_personal: boolean;
  group_id: number | null;
}

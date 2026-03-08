-- ============================================================
-- Migration: Promemoria (Reminders) + Push Notification support
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create reminders table
CREATE TABLE public.reminders (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  group_id bigint,
  is_personal boolean NOT NULL DEFAULT true,
  title text NOT NULL,
  note text,
  amount numeric,
  reminder_date date NOT NULL,
  reminder_time time without time zone NOT NULL,
  -- Array of minute offsets for alerts:
  -- 0 = at reminder time, 15 = 15 min before, 60 = 1h before, 1440 = 1 day before
  alerts jsonb NOT NULL DEFAULT '[0]'::jsonb,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reminders_pkey PRIMARY KEY (id),
  CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT reminders_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups_account(id)
);

-- 2. Enable RLS on reminders
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies: users see their own reminders + group reminders
CREATE POLICY "Users can view own and group reminders"
  ON public.reminders FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      group_id IS NOT NULL
      AND is_personal = false
      AND group_id IN (
        SELECT ug.group_id FROM public.users_group ug WHERE ug.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert own reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON public.reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON public.reminders FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Add reminder_id column to notification_logs for deduplication
ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS reminder_id bigint,
  ADD COLUMN IF NOT EXISTS alert_offset integer;

ALTER TABLE public.notification_logs
  ADD CONSTRAINT notification_logs_reminder_id_fkey
  FOREIGN KEY (reminder_id) REFERENCES public.reminders(id);

-- 5. Unique constraint to prevent double sends per (reminder, offset)
CREATE UNIQUE INDEX IF NOT EXISTS notification_logs_reminder_dedup
  ON public.notification_logs (reminder_id, alert_offset)
  WHERE reminder_id IS NOT NULL AND status = 'sent';

-- 6. Index on reminder date for efficient cron queries
CREATE INDEX IF NOT EXISTS reminders_date_idx ON public.reminders (reminder_date)
  WHERE deleted_at IS NULL AND completed = false;

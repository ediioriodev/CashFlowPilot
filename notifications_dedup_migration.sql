-- ============================================================
-- Migration: Fix notification deduplication for reminders
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add scheduled_for column to track the exact trigger timestamp.
--    This is the key that enables:
--      • Re-sending when a reminder is edited to a new time (new scheduled_for)
--      • Blocking double-send when the cron fires twice in the same window (same scheduled_for)
ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- 2. Drop the old global unique index (reminder_id, alert_offset) which blocked
--    all re-sends for a given reminder regardless of time changes.
DROP INDEX IF EXISTS notification_logs_reminder_dedup;

-- 3. Create new dedup index scoped to (reminder_id, alert_offset, scheduled_for, user_id).
--    Rows without scheduled_for (legacy data) are excluded from the index and
--    do NOT block new inserts — no need to delete old logs for correctness.
CREATE UNIQUE INDEX notification_logs_reminder_dedup
  ON public.notification_logs (reminder_id, alert_offset, scheduled_for, user_id)
  WHERE reminder_id IS NOT NULL
    AND scheduled_for IS NOT NULL
    AND status = 'sent';

-- 4. (Optional cleanup) Remove legacy reminder log entries that have no
--    scheduled_for. They no longer participate in dedup logic due to step 3,
--    but deleting them keeps the table clean. Comment out if you want to
--    preserve history.
-- DELETE FROM public.notification_logs
--   WHERE reminder_id IS NOT NULL AND scheduled_for IS NULL;

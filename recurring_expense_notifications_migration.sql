-- Migration: Add recurring expense notification settings to users_group
-- Run this on Supabase Dashboard → SQL Editor

ALTER TABLE public.users_group
  ADD COLUMN IF NOT EXISTS recurring_notifications_enabled BOOLEAN DEFAULT FALSE;

-- The notification_time column already exists from the previous migration.
-- This migration only adds the toggle column.

-- Optional: verify
-- SELECT user_id, notification_time, recurring_notifications_enabled FROM public.users_group;

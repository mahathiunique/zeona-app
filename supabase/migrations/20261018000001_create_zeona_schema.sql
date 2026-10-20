-- ==============================================================================
-- Zeona Sanctuary — Corrected Production Database Schema & Security Migration
-- Target: Supabase (Project: hjfzbdyowrjxxdytdsnl | Environment: PRODUCTION main)
-- Migration: 20261018000001_create_zeona_schema.sql
--
-- Guarantees:
-- 1. All records belong to authenticated users (auth.users).
-- 2. Row Level Security (RLS) enabled on all 10 tables.
-- 3. Least-privilege policies for SELECT, INSERT, UPDATE, DELETE.
-- 4. Never trusts client user_id: validated strictly via auth.uid().
-- 5. Child table habit_completions validates parent habit ownership (auth.uid()).
-- 6. Storage buckets ('memories', 'voice-diaries') private with folder-level RLS.
-- 7. UNIQUE(habit_id, completed_date) prevents duplicate habit completions.
-- 8. Consistent timezone (TIMESTAMPTZ for timestamps, DATE for calendar days).
-- 9. Security-invoker view for habit_logs (executes with caller's RLS policies).
-- 10. Non-destructive alignment: safe column additions, zero table drops, zero data loss.
-- ==============================================================================

BEGIN;

-- ── 0. Required Extensions & Helper Functions ─────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- ── 1. Table: profiles ───────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Reconcile & remove legacy/permissive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Idempotent least-privilege policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- Trigger: updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: auto-create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, bio)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'Sanctuary Keeper'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'bio'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. Table: journal_entries ────────────────────────────────────────────────
-- Safe non-destructive column additions
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'voice', 'photo')),
  ADD COLUMN IF NOT EXISTS mood text CHECK (mood IS NULL OR mood IN ('happy', 'calm', 'neutral', 'anxious', 'sad', 'angry', 'grateful', 'excited')),
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_duration integer,
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- Safe ownership check: Enforce NOT NULL on user_id ONLY after verifying no unassigned rows exist
DO $$
DECLARE
  unassigned_count integer;
BEGIN
  SELECT count(*) INTO unassigned_count
  FROM public.journal_entries
  WHERE user_id IS NULL;

  IF unassigned_count > 0 THEN
    RAISE EXCEPTION 'Safety check failed: % journal_entries have no user_id. Quarantining or manual resolution required before enforcing NOT NULL.', unassigned_count;
  ELSE
    ALTER TABLE public.journal_entries ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_created
  ON public.journal_entries (user_id, created_at DESC);

-- Reconcile & remove legacy/permissive policies
DROP POLICY IF EXISTS "Users own journal" ON public.journal_entries;

-- Idempotent least-privilege policies
DROP POLICY IF EXISTS "journal_select_own" ON public.journal_entries;
CREATE POLICY "journal_select_own" ON public.journal_entries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_insert_own" ON public.journal_entries;
CREATE POLICY "journal_insert_own" ON public.journal_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_update_own" ON public.journal_entries;
CREATE POLICY "journal_update_own" ON public.journal_entries
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_delete_own" ON public.journal_entries;
CREATE POLICY "journal_delete_own" ON public.journal_entries
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: updated_at
DROP TRIGGER IF EXISTS set_journal_entries_updated_at ON public.journal_entries;
CREATE TRIGGER set_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 3. Table: mood_entries ───────────────────────────────────────────────────
ALTER TABLE public.mood_entries
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS logged_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date
  ON public.mood_entries (user_id, logged_date DESC);

-- Reconcile & remove legacy/permissive policies
DROP POLICY IF EXISTS "Users own mood" ON public.mood_entries;

-- Idempotent least-privilege policies
DROP POLICY IF EXISTS "mood_select_own" ON public.mood_entries;
CREATE POLICY "mood_select_own" ON public.mood_entries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mood_insert_own" ON public.mood_entries;
CREATE POLICY "mood_insert_own" ON public.mood_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mood_update_own" ON public.mood_entries;
CREATE POLICY "mood_update_own" ON public.mood_entries
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mood_delete_own" ON public.mood_entries;
CREATE POLICY "mood_delete_own" ON public.mood_entries
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: updated_at
DROP TRIGGER IF EXISTS set_mood_entries_updated_at ON public.mood_entries;
CREATE TRIGGER set_mood_entries_updated_at
  BEFORE UPDATE ON public.mood_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 4. Table: tasks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  description text,
  due_date date,
  due_time text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category text NOT NULL DEFAULT 'personal' CHECK (category IN ('personal', 'wellness', 'work', 'home', 'growth')),
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tasks_user_due
  ON public.tasks (user_id, due_date, is_completed);

-- Idempotent least-privilege policies
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: updated_at
DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 5. Table: habits ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  description text,
  category text DEFAULT 'wellness',
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekdays', 'weekends', 'custom')),
  custom_days integer[] DEFAULT '{}'::integer[],
  target_count integer DEFAULT 1 NOT NULL CHECK (target_count >= 1),
  color text DEFAULT '#8b5cf6',
  icon text DEFAULT 'sparkles-outline',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_habits_user_archived
  ON public.habits (user_id, is_archived);

-- Idempotent least-privilege policies
DROP POLICY IF EXISTS "habits_select_own" ON public.habits;
CREATE POLICY "habits_select_own" ON public.habits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "habits_insert_own" ON public.habits;
CREATE POLICY "habits_insert_own" ON public.habits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "habits_update_own" ON public.habits;
CREATE POLICY "habits_update_own" ON public.habits
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "habits_delete_own" ON public.habits;
CREATE POLICY "habits_delete_own" ON public.habits
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: updated_at
DROP TRIGGER IF EXISTS set_habits_updated_at ON public.habits;
CREATE TRIGGER set_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 6. Table: habit_completions (Double-Ownership Validation) ──────────────────
CREATE TABLE IF NOT EXISTS public.habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_habit_completion_per_day UNIQUE (habit_id, completed_date)
);

ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date
  ON public.habit_completions (user_id, completed_date DESC);

-- Strict RLS: Validates both completion ownership AND parent habit ownership
DROP POLICY IF EXISTS "completions_select_own" ON public.habit_completions;
CREATE POLICY "completions_select_own" ON public.habit_completions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_completions.habit_id
        AND h.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "completions_insert_own" ON public.habit_completions;
CREATE POLICY "completions_insert_own" ON public.habit_completions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_completions.habit_id
        AND h.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "completions_update_own" ON public.habit_completions;
CREATE POLICY "completions_update_own" ON public.habit_completions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_completions.habit_id
        AND h.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_completions.habit_id
        AND h.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "completions_delete_own" ON public.habit_completions;
CREATE POLICY "completions_delete_own" ON public.habit_completions
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_completions.habit_id
        AND h.user_id = auth.uid()
    )
  );

-- ── 7. View: habit_logs (Security-Invoker View) ──────────────────────────────
-- Executes with the permissions and RLS policies of the caller
CREATE OR REPLACE VIEW public.habit_logs
WITH (security_invoker = true) AS
  SELECT
    id,
    habit_id,
    user_id,
    completed_date AS logged_date,
    created_at
  FROM public.habit_completions;

-- INSTEAD OF triggers so habit_logs view supports insert and delete transparently
CREATE OR REPLACE FUNCTION public.habit_logs_insert_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.habit_completions (id, habit_id, user_id, completed_date, created_at)
  VALUES (
    COALESCE(NEW.id, pg_catalog.gen_random_uuid()),
    NEW.habit_id,
    COALESCE(NEW.user_id, auth.uid()),
    COALESCE(NEW.logged_date, CURRENT_DATE),
    COALESCE(NEW.created_at, pg_catalog.now())
  )
  ON CONFLICT (habit_id, completed_date) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS habit_logs_insert_trig ON public.habit_logs;
CREATE TRIGGER habit_logs_insert_trig
  INSTEAD OF INSERT ON public.habit_logs
  FOR EACH ROW EXECUTE FUNCTION public.habit_logs_insert_fn();

CREATE OR REPLACE FUNCTION public.habit_logs_delete_fn()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.habit_completions
  WHERE id = OLD.id AND user_id = auth.uid();
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS habit_logs_delete_trig ON public.habit_logs;
CREATE TRIGGER habit_logs_delete_trig
  INSTEAD OF DELETE ON public.habit_logs
  FOR EACH ROW EXECUTE FUNCTION public.habit_logs_delete_fn();

-- ── 8. Table: memories ───────────────────────────────────────────────────────
ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_memories_user_date
  ON public.memories (user_id, memory_date DESC);

-- Reconcile & remove legacy/permissive policies
DROP POLICY IF EXISTS "Users own memories" ON public.memories;

-- Idempotent least-privilege policies
DROP POLICY IF EXISTS "memories_select_own" ON public.memories;
CREATE POLICY "memories_select_own" ON public.memories
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "memories_insert_own" ON public.memories;
CREATE POLICY "memories_insert_own" ON public.memories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "memories_update_own" ON public.memories;
CREATE POLICY "memories_update_own" ON public.memories
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "memories_delete_own" ON public.memories;
CREATE POLICY "memories_delete_own" ON public.memories
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: updated_at
DROP TRIGGER IF EXISTS set_memories_updated_at ON public.memories;
CREATE TRIGGER set_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 9. Table: calendar_events ────────────────────────────────────────────────
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS event_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS event_time text,
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'event' CHECK (event_type IN ('event', 'reminder', 'birthday', 'anniversary', 'milestone', 'exam', 'appointment', 'other')),
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS has_reminder boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS reminder_time text,
  ADD COLUMN IF NOT EXISTS reminder_set boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS reminder_time_before integer,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date
  ON public.calendar_events (user_id, event_date);

-- Reconcile & remove legacy/permissive policies
DROP POLICY IF EXISTS "Users own calendar" ON public.calendar_events;

-- Idempotent least-privilege policies
DROP POLICY IF EXISTS "events_select_own" ON public.calendar_events;
CREATE POLICY "events_select_own" ON public.calendar_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "events_insert_own" ON public.calendar_events;
CREATE POLICY "events_insert_own" ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "events_update_own" ON public.calendar_events;
CREATE POLICY "events_update_own" ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "events_delete_own" ON public.calendar_events;
CREATE POLICY "events_delete_own" ON public.calendar_events
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: updated_at
DROP TRIGGER IF EXISTS set_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER set_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 10. Table: reminders ────────────────────────────────────────────────────
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS reminder_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS reminder_time text NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS related_type text NOT NULL DEFAULT 'none' CHECK (related_type IN ('none', 'task', 'event', 'habit')),
  ADD COLUMN IF NOT EXISTS related_id text,
  ADD COLUMN IF NOT EXISTS related_title text,
  ADD COLUMN IF NOT EXISTS notification_id text,
  ADD COLUMN IF NOT EXISTS is_scheduled_on_device boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reminders_user_date
  ON public.reminders (user_id, reminder_date, is_completed);

-- Reconcile & remove legacy/permissive policies
DROP POLICY IF EXISTS "Users own reminders" ON public.reminders;

-- Idempotent least-privilege policies
DROP POLICY IF EXISTS "reminders_select_own" ON public.reminders;
CREATE POLICY "reminders_select_own" ON public.reminders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminders_insert_own" ON public.reminders;
CREATE POLICY "reminders_insert_own" ON public.reminders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminders_update_own" ON public.reminders;
CREATE POLICY "reminders_update_own" ON public.reminders
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminders_delete_own" ON public.reminders;
CREATE POLICY "reminders_delete_own" ON public.reminders
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: updated_at
DROP TRIGGER IF EXISTS set_reminders_updated_at ON public.reminders;
CREATE TRIGGER set_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 11. Table: voice_recordings ──────────────────────────────────────────────
ALTER TABLE public.voice_recordings
  ADD COLUMN IF NOT EXISTS storage_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS mime_type text DEFAULT 'audio/m4a',
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_voice_recordings_user
  ON public.voice_recordings (user_id, created_at DESC);

-- Reconcile & remove legacy/permissive policies
DROP POLICY IF EXISTS "Users own voice" ON public.voice_recordings;

-- Idempotent least-privilege policies
DROP POLICY IF EXISTS "voice_select_own" ON public.voice_recordings;
CREATE POLICY "voice_select_own" ON public.voice_recordings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_insert_own" ON public.voice_recordings;
CREATE POLICY "voice_insert_own" ON public.voice_recordings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_update_own" ON public.voice_recordings;
CREATE POLICY "voice_update_own" ON public.voice_recordings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_delete_own" ON public.voice_recordings;
CREATE POLICY "voice_delete_own" ON public.voice_recordings
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: updated_at
DROP TRIGGER IF EXISTS set_voice_recordings_updated_at ON public.voice_recordings;
CREATE TRIGGER set_voice_recordings_updated_at
  BEFORE UPDATE ON public.voice_recordings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 12. Storage Buckets & Policies ───────────────────────────────────────────
-- Safely upsert buckets, strictly enforcing privacy while preserving administrative customizations
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('memories', 'memories', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('voice-diaries', 'voice-diaries', false, 52428800, ARRAY['audio/m4a', 'audio/webm', 'audio/mp4', 'audio/mpeg'])
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = COALESCE(storage.buckets.file_size_limit, EXCLUDED.file_size_limit),
  allowed_mime_types = COALESCE(storage.buckets.allowed_mime_types, EXCLUDED.allowed_mime_types);

-- Object-level policies: strictly isolated by folder (<auth.uid()>/...)
DROP POLICY IF EXISTS "memories_storage_select" ON storage.objects;
CREATE POLICY "memories_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "memories_storage_insert" ON storage.objects;
CREATE POLICY "memories_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "memories_storage_update" ON storage.objects;
CREATE POLICY "memories_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "memories_storage_delete" ON storage.objects;
CREATE POLICY "memories_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "voice_storage_select" ON storage.objects;
CREATE POLICY "voice_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'voice-diaries' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "voice_storage_insert" ON storage.objects;
CREATE POLICY "voice_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-diaries' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "voice_storage_update" ON storage.objects;
CREATE POLICY "voice_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'voice-diaries' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'voice-diaries' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "voice_storage_delete" ON storage.objects;
CREATE POLICY "voice_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'voice-diaries' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT;

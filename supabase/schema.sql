-- ==============================================================================
-- EARNED - COMPLETE CONSOLIDATED SUPABASE POSTGRESQL DATABASE SCHEMA
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (Economy & Streaks)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  dollar_balance NUMERIC(12, 2) DEFAULT 0.00,
  hours_balance_minutes INTEGER DEFAULT 0,
  debt NUMERIC(12, 2) DEFAULT 0.00,
  streak INTEGER DEFAULT 1,
  last_check_in_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Focus Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  goal_id TEXT,
  collection_id TEXT,
  parent_id TEXT, -- subtask link (one level only); not a FK, see 20260725000004
  estimated_minutes INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  is_icebox BOOLEAN DEFAULT FALSE,
  date_created TIMESTAMPTZ DEFAULT NOW(),
  sort_order DOUBLE PRECISION, -- manual drag-reorder key; see 20260725000003
  description TEXT, -- free-text notes; see 20260726000001
  metric_progress DOUBLE PRECISION -- quantity toward a linked Goal's unit; see 20260726000002
);

-- 4. Indulgence Rewards Store Table
CREATE TABLE IF NOT EXISTS public.rewards (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cost NUMERIC(12, 2) NOT NULL,
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Goals (long-term goal targets) Table
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  horizon TEXT DEFAULT 'monthly' CHECK (horizon IN ('monthly', 'yearly')),
  target_minutes INTEGER NOT NULL,
  completed_minutes INTEGER DEFAULT 0,
  goal_type TEXT DEFAULT 'productive' CHECK (goal_type IN ('productive', 'entertainment')),
  metric_type TEXT DEFAULT 'minutes',
  target_metric INTEGER,
  completed_metric INTEGER DEFAULT 0,
  unlocked_milestones JSONB DEFAULT '[]'::jsonb,
  parent_id TEXT,
  pays_currency BOOLEAN DEFAULT TRUE,
  category TEXT,
  unit_label TEXT -- free-text label for metric_type='units'; see 20260726000002
);

-- 6. Collections (Journeys & Backlogs) Table
CREATE TABLE IF NOT EXISTS public.collections (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  goal_id TEXT REFERENCES public.goals(id) ON DELETE SET NULL,
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Waypoints (Journey sub-goal timeframe buckets) Table
CREATE TABLE IF NOT EXISTS public.waypoints (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_metric INTEGER,
  year INTEGER,
  month INTEGER,
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Collection Items Table
CREATE TABLE IF NOT EXISTS public.collection_items (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  waypoint_id TEXT REFERENCES public.waypoints(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  estimated_minutes INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  is_added_later BOOLEAN DEFAULT FALSE,
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- AUTOMATED USER CREATION TRIGGER
-- Automatically creates a profile row in public.profiles when a new user registers
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, dollar_balance, debt, streak)
  VALUES (new.id, new.email, 0.00, 0.00, 1)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tasks Policies
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Rewards Policies
DROP POLICY IF EXISTS "Users can view own rewards" ON public.rewards;
CREATE POLICY "Users can view own rewards" ON public.rewards FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rewards" ON public.rewards;
CREATE POLICY "Users can insert own rewards" ON public.rewards FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rewards" ON public.rewards;
CREATE POLICY "Users can update own rewards" ON public.rewards FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own rewards" ON public.rewards;
CREATE POLICY "Users can delete own rewards" ON public.rewards FOR DELETE USING (auth.uid() = user_id);

-- Goals Policies
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
CREATE POLICY "Users can insert own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- Collections Policies
DROP POLICY IF EXISTS "Users can view their own collections." ON public.collections;
CREATE POLICY "Users can view their own collections." ON public.collections FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own collections." ON public.collections;
CREATE POLICY "Users can insert their own collections." ON public.collections FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own collections." ON public.collections;
CREATE POLICY "Users can update their own collections." ON public.collections FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own collections." ON public.collections;
CREATE POLICY "Users can delete their own collections." ON public.collections FOR DELETE USING (auth.uid() = user_id);

-- Waypoints Policies
DROP POLICY IF EXISTS "Users can view their own waypoints." ON public.waypoints;
CREATE POLICY "Users can view their own waypoints." ON public.waypoints FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own waypoints." ON public.waypoints;
CREATE POLICY "Users can insert their own waypoints." ON public.waypoints FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own waypoints." ON public.waypoints;
CREATE POLICY "Users can update their own waypoints." ON public.waypoints FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own waypoints." ON public.waypoints;
CREATE POLICY "Users can delete their own waypoints." ON public.waypoints FOR DELETE USING (auth.uid() = user_id);

-- Collection Items Policies
DROP POLICY IF EXISTS "Users can view items of their collections." ON public.collection_items;
CREATE POLICY "Users can view items of their collections." ON public.collection_items FOR SELECT USING (collection_id IN (SELECT id FROM public.collections WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert items into their collections." ON public.collection_items;
CREATE POLICY "Users can insert items into their collections." ON public.collection_items FOR INSERT WITH CHECK (collection_id IN (SELECT id FROM public.collections WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update items in their collections." ON public.collection_items;
CREATE POLICY "Users can update items in their collections." ON public.collection_items FOR UPDATE USING (collection_id IN (SELECT id FROM public.collections WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete items in their collections." ON public.collection_items;
CREATE POLICY "Users can delete items in their collections." ON public.collection_items FOR DELETE USING (collection_id IN (SELECT id FROM public.collections WHERE user_id = auth.uid()));

-- Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'collections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'collection_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collection_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'waypoints'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.waypoints;
  END IF;
END $$;
-- ==============================================================================
-- 20260722000004_taxonomy.sql
-- Create Pillars and Tags (Categories) tables with RLS
-- ==============================================================================

-- 1. Pillars Table
CREATE TABLE IF NOT EXISTS public.pillars (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tags Table (Categories)
CREATE TABLE IF NOT EXISTS public.tags (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pillar_id TEXT NOT NULL REFERENCES public.pillars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earner', 'burner')),
  is_archived BOOLEAN DEFAULT FALSE,
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Pillars Policies
CREATE POLICY "Users can insert their own pillars."
  ON public.pillars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own pillars."
  ON public.pillars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pillars."
  ON public.pillars FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pillars."
  ON public.pillars FOR DELETE
  USING (auth.uid() = user_id);

-- Tags Policies
CREATE POLICY "Users can insert their own tags."
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tags."
  ON public.tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags."
  ON public.tags FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags."
  ON public.tags FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- EARNED - SUPABASE POSTGRESQL DATABASE SCHEMA & SECURITY POLICIES
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (Economy & Streaks)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  dollar_balance NUMERIC(12, 2) DEFAULT 0.00,
  debt NUMERIC(12, 2) DEFAULT 0.00,
  streak INTEGER DEFAULT 1,
  creation_dollars_earned_today NUMERIC(12, 2) DEFAULT 0.00,
  last_check_in_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Focus Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  macro_goal_id TEXT,
  estimated_minutes INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  is_icebox BOOLEAN DEFAULT FALSE,
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indulgence Rewards Store Table
CREATE TABLE IF NOT EXISTS public.rewards (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cost NUMERIC(12, 2) NOT NULL,
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Macro Goals Pyramid Targets Table
CREATE TABLE IF NOT EXISTS public.macro_goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_minutes INTEGER NOT NULL,
  completed_minutes INTEGER DEFAULT 0,
  unlocked_milestones JSONB DEFAULT '[]'::jsonb
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

-- Trigger execution link
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enforces data isolation so each user can ONLY access their own rows
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_goals ENABLE ROW LEVEL SECURITY;

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

-- Macro Goals Policies
DROP POLICY IF EXISTS "Users can view own macro goals" ON public.macro_goals;
CREATE POLICY "Users can view own macro goals" ON public.macro_goals FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own macro goals" ON public.macro_goals;
CREATE POLICY "Users can insert own macro goals" ON public.macro_goals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own macro goals" ON public.macro_goals;
CREATE POLICY "Users can update own macro goals" ON public.macro_goals FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own macro goals" ON public.macro_goals;
CREATE POLICY "Users can delete own macro goals" ON public.macro_goals FOR DELETE USING (auth.uid() = user_id);

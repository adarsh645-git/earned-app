-- ==============================================================================
-- EARNED - SUPABASE PATCH: DUAL-CURRENCY ECONOMY & ENTERTAINMENT GOALS
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
-- This script safely updates existing tables without deleting existing user data.
-- ==============================================================================

-- 1. Add Hours Balance (in minutes) to Profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hours_balance_minutes INTEGER DEFAULT 0;

-- 2. Drop deprecated planning bounties tracking column from Profiles table
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS creation_dollars_earned_today;

-- 3. Add Goal Type ('productive' vs 'entertainment') to Macro Goals table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'productive';

-- Add check constraint for goal_type on macro_goals table
ALTER TABLE public.macro_goals
  ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'productive' CHECK (goal_type IN ('productive', 'entertainment'));

-- 4. Add missing INSERT policy for profiles table (Required for upserts)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

COMMENT ON COLUMN public.profiles.hours_balance_minutes IS 'Tracks accumulated entertainment leisure time in minutes.';
COMMENT ON COLUMN public.macro_goals.goal_type IS 'Distinguishes productive pyramid targets from leisure entertainment projects.';

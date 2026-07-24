-- ==============================================================================
-- EARNED - SUPABASE PATCH: LINK TASKS TO JOURNEYS
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
-- This script safely updates existing tables without deleting existing user data.
-- ==============================================================================

-- Lets a task reference the Journey (Collection) it belongs to, independent of
-- (but usually paired with) its macro_goal_id link. No FK: app-level unlink
-- already handles Collection deletion (see deleteMacroGoal's cross-store unlink).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS collection_id TEXT;

COMMENT ON COLUMN public.tasks.collection_id IS 'Journey (Collection) this task belongs to. Selecting a Journey with a linked macro goal also sets macro_goal_id.';

-- ==============================================================================
-- EARNED - SUPABASE PATCH: RENAME SUMMIT -> GOAL
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
--
-- Guarded / idempotent, matching the 20260725000002 rename's pattern: safe to
-- run once, safe to re-run if it errors partway through. Assumes the prior
-- rename (macro_goals -> summits, journey_sub_goals -> waypoints) has already
-- been applied — confirmed live before this migration was written.
-- ==============================================================================

-- ─── "Summit" -> "Goal" ───────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'summits')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    ALTER TABLE public.summits RENAME TO goals;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'summit_type')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'goal_type') THEN
    ALTER TABLE public.goals RENAME COLUMN summit_type TO goal_type;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'summit_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'goal_id') THEN
    ALTER TABLE public.tasks RENAME COLUMN summit_id TO goal_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collections' AND column_name = 'summit_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collections' AND column_name = 'goal_id') THEN
    ALTER TABLE public.collections RENAME COLUMN summit_id TO goal_id;
  END IF;
END $$;

-- Policy renames (ALTER POLICY has no IF EXISTS form, so guard manually).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can view own summits') THEN
    ALTER POLICY "Users can view own summits" ON public.goals RENAME TO "Users can view own goals";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can insert own summits') THEN
    ALTER POLICY "Users can insert own summits" ON public.goals RENAME TO "Users can insert own goals";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can update own summits') THEN
    ALTER POLICY "Users can update own summits" ON public.goals RENAME TO "Users can update own goals";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can delete own summits') THEN
    ALTER POLICY "Users can delete own summits" ON public.goals RENAME TO "Users can delete own goals";
  END IF;
END $$;

-- goals.id is referenced by collections.goal_id (FK, renamed from summit_id
-- above) and by goals.parent_id (self-referential, unnamed FK) — table
-- RENAME carries both automatically, no separate FK-fix step needed.

-- ==============================================================================
-- EARNED - SUPABASE PATCH: RENAME PYRAMID -> SUMMIT, QUEST -> WAYPOINT
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
--
-- Fully guarded / idempotent: safe to run once, safe to re-run if it errors
-- partway through. Each step only fires if its precondition still holds, so
-- it adapts to whatever state your database is actually in — including the
-- case (confirmed live) where journey_sub_goals / collection_items.sub_goal_id
-- were never created at all, because supabase/schema.sql's consolidated
-- baseline was missing them (a pre-existing gap, fixed in this same pass).
-- ==============================================================================

-- ─── "Pyramid" -> "Summit" ────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'macro_goals')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'summits') THEN
    ALTER TABLE public.macro_goals RENAME TO summits;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'summits' AND column_name = 'goal_type')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'summits' AND column_name = 'summit_type') THEN
    ALTER TABLE public.summits RENAME COLUMN goal_type TO summit_type;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'macro_goal_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'summit_id') THEN
    ALTER TABLE public.tasks RENAME COLUMN macro_goal_id TO summit_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collections' AND column_name = 'macro_goal_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collections' AND column_name = 'summit_id') THEN
    ALTER TABLE public.collections RENAME COLUMN macro_goal_id TO summit_id;
  END IF;
END $$;

-- Policy renames (ALTER POLICY has no IF EXISTS form, so guard manually).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'summits' AND policyname = 'Users can view own macro goals') THEN
    ALTER POLICY "Users can view own macro goals" ON public.summits RENAME TO "Users can view own summits";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'summits' AND policyname = 'Users can insert own macro goals') THEN
    ALTER POLICY "Users can insert own macro goals" ON public.summits RENAME TO "Users can insert own summits";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'summits' AND policyname = 'Users can update own macro goals') THEN
    ALTER POLICY "Users can update own macro goals" ON public.summits RENAME TO "Users can update own summits";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'summits' AND policyname = 'Users can delete own macro goals') THEN
    ALTER POLICY "Users can delete own macro goals" ON public.summits RENAME TO "Users can delete own summits";
  END IF;
END $$;

-- ─── "Quest"/"Sub-Quest" -> "Waypoint" ────────────────────────────────────────

-- Case A: journey_sub_goals exists (was actually created at some point) and
-- waypoints doesn't yet — rename it, carrying its policies along by name.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journey_sub_goals')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waypoints') THEN
    ALTER TABLE public.journey_sub_goals RENAME TO waypoints;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'waypoints' AND policyname = 'Users can view their own journey sub-goals.') THEN
      ALTER POLICY "Users can view their own journey sub-goals." ON public.waypoints RENAME TO "Users can view their own waypoints.";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'waypoints' AND policyname = 'Users can insert their own journey sub-goals.') THEN
      ALTER POLICY "Users can insert their own journey sub-goals." ON public.waypoints RENAME TO "Users can insert their own waypoints.";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'waypoints' AND policyname = 'Users can update their own journey sub-goals.') THEN
      ALTER POLICY "Users can update their own journey sub-goals." ON public.waypoints RENAME TO "Users can update their own waypoints.";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'waypoints' AND policyname = 'Users can delete their own journey sub-goals.') THEN
      ALTER POLICY "Users can delete their own journey sub-goals." ON public.waypoints RENAME TO "Users can delete their own waypoints.";
    END IF;
  END IF;
END $$;

-- Case B: neither journey_sub_goals nor waypoints exists — this table was
-- never actually created against this database. Create it fresh, matching
-- the structure from migration 20260722000003_journey_subgoals.sql.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journey_sub_goals')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waypoints') THEN

    CREATE TABLE public.waypoints (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      target_metric INTEGER,
      year INTEGER,
      month INTEGER,
      date_created TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.waypoints ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own waypoints."
      ON public.waypoints FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own waypoints."
      ON public.waypoints FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own waypoints."
      ON public.waypoints FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own waypoints."
      ON public.waypoints FOR DELETE USING (auth.uid() = user_id);

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'waypoints'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.waypoints;
    END IF;
  END IF;
END $$;

-- collection_items.sub_goal_id -> waypoint_id: rename if the old column
-- exists, otherwise add the new column fresh (it may never have existed,
-- same root cause as the table gap above).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collection_items' AND column_name = 'sub_goal_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collection_items' AND column_name = 'waypoint_id') THEN
    ALTER TABLE public.collection_items RENAME COLUMN sub_goal_id TO waypoint_id;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collection_items' AND column_name = 'sub_goal_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collection_items' AND column_name = 'waypoint_id') THEN
    ALTER TABLE public.collection_items ADD COLUMN waypoint_id TEXT REFERENCES public.waypoints(id) ON DELETE SET NULL;
  END IF;
END $$;

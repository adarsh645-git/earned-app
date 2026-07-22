-- ==============================================================================
-- PATCH: Journey Sub-Goal Buckets & Timeframe Allocation
-- Adds journey_sub_goals table and links collection_items to sub-goals
-- ==============================================================================

-- 1. Create Journey Sub-Goals Table
CREATE TABLE IF NOT EXISTS public.journey_sub_goals (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_metric INTEGER,
  year INTEGER,
  month INTEGER,
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add sub_goal_id column to collection_items
ALTER TABLE public.collection_items ADD COLUMN IF NOT EXISTS sub_goal_id TEXT REFERENCES public.journey_sub_goals(id) ON DELETE SET NULL;

-- 3. Enable RLS
ALTER TABLE public.journey_sub_goals ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Journey Sub-Goals
DROP POLICY IF EXISTS "Users can view their own journey sub-goals." ON public.journey_sub_goals;
CREATE POLICY "Users can view their own journey sub-goals."
  ON public.journey_sub_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own journey sub-goals." ON public.journey_sub_goals;
CREATE POLICY "Users can insert their own journey sub-goals."
  ON public.journey_sub_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own journey sub-goals." ON public.journey_sub_goals;
CREATE POLICY "Users can update their own journey sub-goals."
  ON public.journey_sub_goals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own journey sub-goals." ON public.journey_sub_goals;
CREATE POLICY "Users can delete their own journey sub-goals."
  ON public.journey_sub_goals FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Add to realtime publication if available
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'journey_sub_goals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_sub_goals;
  END IF;
END $$;

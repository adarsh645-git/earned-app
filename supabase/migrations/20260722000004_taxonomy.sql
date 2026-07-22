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

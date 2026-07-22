-- ==============================================================================
-- PATCH: Collections & Journeys Feature
-- Adds collections, collection_items, and updates macro_goals for generic metrics
-- ==============================================================================

-- 1. Update Macro Goals for generic metrics
ALTER TABLE public.macro_goals ADD COLUMN IF NOT EXISTS metric_type TEXT DEFAULT 'minutes';
ALTER TABLE public.macro_goals ADD COLUMN IF NOT EXISTS target_metric INTEGER;
ALTER TABLE public.macro_goals ADD COLUMN IF NOT EXISTS completed_metric INTEGER DEFAULT 0;

-- Migrate existing minute-based goals to the new generic columns
UPDATE public.macro_goals 
SET target_metric = target_minutes, 
    completed_metric = completed_minutes 
WHERE target_metric IS NULL;

-- 2. Create Collections Table
CREATE TABLE IF NOT EXISTS public.collections (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  macro_goal_id TEXT REFERENCES public.macro_goals(id) ON DELETE SET NULL,
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Collection Items Table
CREATE TABLE IF NOT EXISTS public.collection_items (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  estimated_minutes INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  is_added_later BOOLEAN DEFAULT FALSE,
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Collections
DROP POLICY IF EXISTS "Users can view their own collections." ON public.collections;
CREATE POLICY "Users can view their own collections."
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own collections." ON public.collections;
CREATE POLICY "Users can insert their own collections."
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own collections." ON public.collections;
CREATE POLICY "Users can update their own collections."
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own collections." ON public.collections;
CREATE POLICY "Users can delete their own collections."
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RLS Policies for Collection Items
DROP POLICY IF EXISTS "Users can view items of their collections." ON public.collection_items;
CREATE POLICY "Users can view items of their collections."
  ON public.collection_items FOR SELECT
  USING (
    collection_id IN (
      SELECT id FROM public.collections WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert items into their collections." ON public.collection_items;
CREATE POLICY "Users can insert items into their collections."
  ON public.collection_items FOR INSERT
  WITH CHECK (
    collection_id IN (
      SELECT id FROM public.collections WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update items in their collections." ON public.collection_items;
CREATE POLICY "Users can update items in their collections."
  ON public.collection_items FOR UPDATE
  USING (
    collection_id IN (
      SELECT id FROM public.collections WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete items in their collections." ON public.collection_items;
CREATE POLICY "Users can delete items in their collections."
  ON public.collection_items FOR DELETE
  USING (
    collection_id IN (
      SELECT id FROM public.collections WHERE user_id = auth.uid()
    )
  );

-- 7. Add Collections to realtime publication
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
END $$;

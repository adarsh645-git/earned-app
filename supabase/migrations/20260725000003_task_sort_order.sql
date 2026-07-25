-- ==============================================================================
-- EARNED - SUPABASE PATCH: MANUAL TASK ORDERING (sort_order)
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
--
-- Adds a manual ordering key to tasks so drag-to-reorder persists across
-- devices/sync. Existing rows are backfilled from date_created (same epoch-ms
-- scale the client uses via Date.parse/Date.now), so nothing appears
-- reordered until the user actually drags something.
-- ==============================================================================

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order DOUBLE PRECISION;

UPDATE public.tasks
SET sort_order = EXTRACT(EPOCH FROM date_created) * 1000
WHERE sort_order IS NULL;

COMMENT ON COLUMN public.tasks.sort_order IS
  'Manual within-group ordering key (a day''s active tasks, or one parent''s subtasks). Larger sorts lower. Backfilled from date_created in epoch-ms.';

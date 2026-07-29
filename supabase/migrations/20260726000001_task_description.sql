-- ==============================================================================
-- EARNED - SUPABASE PATCH: TASK DESCRIPTION (tasks.description)
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
--
-- Adds a free-text description field, editable from the new Task Detail
-- screen. Purely informational — no economy/reward logic reads this column.
-- ==============================================================================

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.tasks.description IS
  'Free-text task description/notes, set from the Task Detail screen. Optional.';

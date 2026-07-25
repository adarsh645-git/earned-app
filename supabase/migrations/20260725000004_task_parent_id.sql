-- ==============================================================================
-- EARNED - SUPABASE PATCH: SUBTASKS (tasks.parent_id)
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
--
-- Adds the one-level subtask link. Deliberately NOT a self-referencing FK:
--   - pushAllTasksToCloud upserts the whole tasks array in one batch, so a
--     child row could be upserted before its parent in the same statement —
--     a self-FK would reject that ordering.
--   - Referential integrity (cascade-delete children, re-open a parent when
--     a child is un-checked, etc.) is already handled app-side in
--     taskStore.ts (deleteTask/toggleTask), matching how summit_id/
--     collection_id are already plain TEXT columns rather than FKs.
-- ==============================================================================

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_id TEXT;

COMMENT ON COLUMN public.tasks.parent_id IS
  'Id of the parent task if this row is a subtask (one level of nesting only). Not a FK — integrity is managed app-side.';

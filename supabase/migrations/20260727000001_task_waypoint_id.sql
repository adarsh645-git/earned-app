-- ==============================================================================
-- EARNED - SUPABASE PATCH: TASK WAYPOINT LINK
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
--
-- Lets a Task belong to a specific Waypoint within its linked Journey
-- (e.g. a "Fiction" Waypoint under a "Reading List" Journey), not just the
-- Journey as a whole. Soft app-level reference (no FK), matching the
-- existing collection_id/summit_id columns on this table.
-- ==============================================================================

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS waypoint_id TEXT;

COMMENT ON COLUMN public.tasks.waypoint_id IS
  'Optional Waypoint (sub-bucket of collection_id''s Journey) this task belongs to.';

-- ==============================================================================
-- EARNED - SUPABASE PATCH: GOAL PILLAR LINK
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
--
-- Lets a Goal belong to a Pillar (life area), so the Journeys screen can
-- render the Pillar -> Goal -> Journey hierarchy. Nullable: Entertainment
-- goals never set this, and existing productive Goals get a client-side
-- best-effort backfill (see goalStore.ts's backfillGoalPillarIds) rather
-- than a value assigned here. ON DELETE SET NULL matches the existing
-- collections.goal_id convention — deleting a Pillar unlinks Goals, never
-- deletes them.
-- ==============================================================================

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS pillar_id TEXT REFERENCES public.pillars(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.goals.pillar_id IS
  'Optional Pillar (life area) this Goal belongs to. Null for Entertainment-type goals and for productive Goals with no pillar signal yet.';

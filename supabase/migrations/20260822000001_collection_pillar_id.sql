-- ==============================================================================
-- EARNED - SUPABASE PATCH: JOURNEY (COLLECTION) PILLAR LINK
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
--
-- Lets a Journey belong to a Pillar (life area) so Tasks created inside it
-- can be locked to that Pillar's Tags. Nullable: existing Journeys keep
-- working with no Pillar (no lock) until one is explicitly set. Mirrors
-- goals.pillar_id exactly (see 20260727000003) — same nullable/ON DELETE SET
-- NULL convention. See docs/sdd/028-journey-pillar-lock.md.
-- ==============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS pillar_id TEXT REFERENCES public.pillars(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.collections.pillar_id IS
  'Optional Pillar (life area) this Journey belongs to. Null = no lock yet; Tasks inside stay unrestricted until set.';

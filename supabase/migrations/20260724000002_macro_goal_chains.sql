-- ==============================================================================
-- EARNED - SUPABASE PATCH: INTERLINKED GOAL CHAINS
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
-- This script safely updates existing tables without deleting existing user data.
-- ==============================================================================

-- Persist the fields that make a macro-goal "chain" possible. These existed only
-- in client-local state and were dropped on every cloud sync round-trip:
--   parent_id     - nests a goal under another to form a single cascade chain
--   pays_currency - marks the ONE level in a chain that pays out currency
--                   (progress still cascades everywhere; payout fires once)
--   category      - entertainment project category (game/movie/tv/youtube/custom)
ALTER TABLE public.macro_goals
  ADD COLUMN IF NOT EXISTS parent_id TEXT;

ALTER TABLE public.macro_goals
  ADD COLUMN IF NOT EXISTS pays_currency BOOLEAN DEFAULT TRUE;

ALTER TABLE public.macro_goals
  ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN public.macro_goals.parent_id IS 'Parent goal id; nests this goal into a single cascade chain (no FK: app-level cascade handles deletes).';
COMMENT ON COLUMN public.macro_goals.pays_currency IS 'True on the one level of a chain that pays currency; progress cascades to all levels but payout fires once.';
COMMENT ON COLUMN public.macro_goals.category IS 'Entertainment project category (video-game/movie/tv-show/youtube/custom).';

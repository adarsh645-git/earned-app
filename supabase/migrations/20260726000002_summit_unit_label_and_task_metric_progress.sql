-- ==============================================================================
-- EARNED - SUPABASE PATCH: DYNAMIC GOAL UNITS
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
--
-- Adds a free-text unit label for 'units'-mode Summits (e.g. "pages", "reps")
-- and a per-task metric-progress quantity (e.g. 10 pages), so a task's time
-- estimate (which still drives Hours/Dollars payout, unchanged) can be
-- decoupled from how much of a Goal's own unit it actually completed.
-- ==============================================================================

ALTER TABLE public.summits ADD COLUMN IF NOT EXISTS unit_label TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS metric_progress DOUBLE PRECISION;

COMMENT ON COLUMN public.summits.unit_label IS
  'Free-text label for a units-mode Summit''s metric (e.g. "pages", "reps"). Display/homogeneity only, never an economy input.';
COMMENT ON COLUMN public.tasks.metric_progress IS
  'Quantity this task contributes to its linked Summit''s units metric (e.g. 10 for "10 pages"). Optional — falls back to +1 when unset, matching pre-existing units-mode behavior.';

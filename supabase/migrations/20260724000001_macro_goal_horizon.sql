-- ==============================================================================
-- EARNED - SUPABASE PATCH: PERSIST MACRO GOAL HORIZON
-- Execute this script in your Supabase project's SQL Editor (supabase.com)
-- This script safely updates existing tables without deleting existing user data.
-- ==============================================================================

-- Add the missing 'horizon' column to Macro Goals table. Previously this field
-- existed only in the client's local state and was never persisted to
-- Supabase — syncEngine.ts hardcoded it to 'monthly' on every cloud pull,
-- silently reverting any 'yearly' goal after a sync round-trip.
ALTER TABLE public.macro_goals
  ADD COLUMN IF NOT EXISTS horizon TEXT DEFAULT 'monthly' CHECK (horizon IN ('monthly', 'yearly'));

COMMENT ON COLUMN public.macro_goals.horizon IS 'Monthly vs yearly target framing, shown as a label on the goal card.';

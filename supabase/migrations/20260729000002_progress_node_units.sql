-- Unified trickle-up progress engine (docs/sdd/025-unified-trickle-up-progress.md):
-- a Journey and a Waypoint can now each own their own target + unit label,
-- instead of a Waypoint only ever borrowing its linked Goal's unit and a
-- Journey having no progress-node concept at all. Unset on either column =
-- "passive" (pure organization, transparent for roll-up) — no back-fill
-- needed, every existing row keeps its current (organizational-only)
-- behavior exactly.
ALTER TABLE public.waypoints ADD COLUMN IF NOT EXISTS unit_label TEXT;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS unit_label TEXT;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS target_metric NUMERIC;

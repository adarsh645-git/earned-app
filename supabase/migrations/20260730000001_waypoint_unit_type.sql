-- EARNED - SUPABASE PATCH: WAYPOINT UNIT TYPE
-- Gives a Waypoint its own unit (pages/miles/reps/etc), independent of its
-- Journey's linked Goal — needed for Waypoints under a minutes-mode or
-- unlinked Goal, which previously had no way to name their unit at all.

ALTER TABLE public.waypoints ADD COLUMN IF NOT EXISTS unit_type TEXT;
ALTER TABLE public.waypoints ADD COLUMN IF NOT EXISTS unit_label TEXT;

COMMENT ON COLUMN public.waypoints.unit_type IS
  'Preset unit type key for this waypoint (pages/minutes/hours/miles/km/reps/sessions/chapters/dollars/custom). Only authoritative when the parent Journey has no units-mode linked Goal — otherwise the Goal''s unit_label governs.';
COMMENT ON COLUMN public.waypoints.unit_label IS
  'Resolved display label for unit_type (e.g. "Pages"), or the free-text label when unit_type = custom.';

-- EARNED - SUPABASE PATCH: WAYPOINT COMPLETED METRIC
-- Adds a tracked completed progress metric to the waypoints table.

ALTER TABLE public.waypoints ADD COLUMN IF NOT EXISTS completed_metric NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.waypoints.completed_metric IS
  'Tracks explicit progress completed by tasks/items associated with this waypoint.';

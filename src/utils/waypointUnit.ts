import { Waypoint, Collection } from '../store/collectionStore';
import { Goal } from '../store/goalStore';

// Preset unit types selectable on a Waypoint. 'custom' pairs with a
// free-text unitLabel entered by the user.
export const WAYPOINT_UNIT_TYPES: { id: string; label: string }[] = [
  { id: 'pages', label: 'Pages' },
  { id: 'minutes', label: 'Minutes' },
  { id: 'hours', label: 'Hours' },
  { id: 'miles', label: 'Miles' },
  { id: 'kilometers', label: 'Kilometers' },
  { id: 'reps', label: 'Reps' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'chapters', label: 'Chapters' },
  { id: 'dollars', label: 'Dollars' },
  { id: 'custom', label: 'Custom…' },
];

/**
 * Single source of truth for "what unit governs this Waypoint, if any" —
 * mirrors the trickle-up engine's own priority (progress.ts's
 * waypointUnit/collectionUnit): the Waypoint's own unitLabel wins if set
 * (a Waypoint is a fully independent progress node — e.g. a "pages"
 * Waypoint under a "books"-mode Goal, see
 * docs/sdd/025-unified-trickle-up-progress.md scenario 1); otherwise its
 * Journey's own unitLabel; otherwise a units-mode linked Goal's unit is the
 * fallback for a Waypoint that never set its own. Returns undefined when
 * nothing in the chain has one — no enforced unit.
 */
export function resolveWaypointUnit(
  waypoint: Waypoint | undefined,
  collection: Collection | undefined,
  goals: Goal[]
): string | undefined {
  if (waypoint?.unitLabel) return waypoint.unitLabel;
  if (collection?.unitLabel) return collection.unitLabel;
  const goal = collection?.goalId ? goals.find(g => g.id === collection.goalId) : undefined;
  if (goal?.metricType === 'units') return goal.unitLabel || 'units';
  return undefined;
}

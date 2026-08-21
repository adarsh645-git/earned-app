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
 * Single source of truth for "what unit governs this Waypoint, if any."
 * A units-mode linked Goal always wins (a Waypoint can't disagree with the
 * metric its own Journey's Goal is tracking); otherwise the Waypoint's own
 * unitLabel applies. Returns undefined when neither is set — the Waypoint
 * has no enforced unit and behaves exactly like before this feature.
 */
export function resolveWaypointUnit(
  waypoint: Waypoint | undefined,
  collection: Collection | undefined,
  goals: Goal[]
): string | undefined {
  const goal = collection?.goalId ? goals.find(g => g.id === collection.goalId) : undefined;
  if (goal?.metricType === 'units') return goal.unitLabel || 'units';
  return waypoint?.unitLabel;
}

// True when a Waypoint's unit is locked to its Goal (not independently
// editable) — i.e. the Journey has a units-mode linked Goal.
export function isWaypointUnitGoalGoverned(collection: Collection | undefined, goals: Goal[]): boolean {
  const goal = collection?.goalId ? goals.find(g => g.id === collection.goalId) : undefined;
  return goal?.metricType === 'units';
}

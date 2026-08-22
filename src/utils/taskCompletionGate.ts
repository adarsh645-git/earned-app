import { Task } from '../store/taskStore';
import { Waypoint, Collection } from '../store/collectionStore';
import { Goal } from '../store/goalStore';
import { chainMetricContext } from '../store/progress';

/**
 * Returns the unit label a task must report progress in before it can be
 * marked complete, or null if no quantity is required. Checked across the
 * whole Waypoint -> Journey -> Goal chain via chainMetricContext (the
 * Waypoint's own target+unit first, falling back to the Journey's own, then
 * a units-mode linked Goal) — not just the immediate Waypoint, since a task
 * with no Waypoint at all can still be linked to a Journey or Goal that
 * itself carries a target. Only applies to tasks that don't already have a
 * metricProgress value — re-completing after un-completing a previously-
 * logged task never re-asks. See
 * docs/sdd/025-unified-trickle-up-progress.md.
 */
export function getRequiredUnitLabel(
  task: Task,
  waypoints: Waypoint[],
  collections: Collection[],
  goals: Goal[]
): string | null {
  if (task.metricProgress != null) return null;
  const waypoint = task.waypointId ? waypoints.find(w => w.id === task.waypointId) : undefined;
  const collection = task.collectionId ? collections.find(c => c.id === task.collectionId) : undefined;
  const goalId = task.goalId || collection?.goalId;
  const goal = goalId ? goals.find(g => g.id === goalId) : undefined;
  const { show, unitLabel } = chainMetricContext(waypoint, collection, goal);
  return show ? unitLabel : null;
}

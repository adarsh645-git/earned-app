import { Task } from '../store/taskStore';
import { Waypoint, Collection } from '../store/collectionStore';
import { Goal } from '../store/goalStore';
import { chainMetricContext, ProgressSelectors } from '../store/progress';

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

/**
 * How much of the gating node's target is still outstanding, to prefill the
 * quantity prompt above — so finishing a whole Waypoint/Journey/Goal in one
 * task (e.g. "I read the entire book") is a single tap on the prefilled
 * value instead of the user manually computing and typing it. Checks the
 * same chain and priority order as getRequiredUnitLabel (Waypoint's own
 * target first, then Journey's, then a units-mode Goal). Returns undefined
 * when there's nothing to prefill (no target, or already fully covered by
 * other progress) — the prompt's input then simply starts empty.
 */
export function getRemainingUnitAmount(
  task: Task,
  waypoints: Waypoint[],
  collections: Collection[],
  goals: Goal[],
  progress: ProgressSelectors
): number | undefined {
  const waypoint = task.waypointId ? waypoints.find(w => w.id === task.waypointId) : undefined;
  const collection = task.collectionId ? collections.find(c => c.id === task.collectionId) : undefined;
  const goalId = task.goalId || collection?.goalId;
  const goal = goalId ? goals.find(g => g.id === goalId) : undefined;

  const node = waypoint?.targetMetric
    ? progress.waypointProgress(waypoint.id)
    : collection?.targetMetric
    ? progress.journeyProgress(collection.id)
    : goal?.metricType === 'units'
    ? progress.goalProgress(goal.id)
    : undefined;

  if (!node || !node.hasTarget) return undefined;
  const remaining = node.target - node.completed;
  return remaining > 0 ? remaining : undefined;
}

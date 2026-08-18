import { Task } from '../store/taskStore';
import { Waypoint, Collection } from '../store/collectionStore';
import { Goal } from '../store/goalStore';
import { resolveWaypointUnit } from './waypointUnit';

/**
 * Returns the unit label a task must report progress in before it can be
 * marked complete, or null if no quantity is required (no Waypoint link, or
 * the Waypoint has no enforced unit — unchanged from pre-existing behavior).
 * Only applies to tasks that don't already have a metricProgress value —
 * re-completing after un-completing a previously-logged task never re-asks.
 */
export function getRequiredUnitLabel(
  task: Task,
  waypoints: Waypoint[],
  collections: Collection[],
  goals: Goal[]
): string | null {
  if (task.metricProgress != null) return null;
  if (!task.waypointId) return null;
  const waypoint = waypoints.find(w => w.id === task.waypointId);
  const collection = task.collectionId ? collections.find(c => c.id === task.collectionId) : undefined;
  return resolveWaypointUnit(waypoint, collection, goals) || null;
}

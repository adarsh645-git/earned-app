import { useMemo } from 'react';
import { useGoalStore } from '../store/goalStore';
import { useCollectionStore } from '../store/collectionStore';
import { useTaskStore } from '../store/taskStore';
import { computeProgress, ProgressSelectors } from '../store/progress';

// Thin memoized wrapper around the pure engine for components — recomputes
// only when one of the five source arrays actually gets a new reference
// (i.e. an actual store mutation), not on every render.
export default function useProgress(): ProgressSelectors {
  const goals = useGoalStore((s) => s.goals);
  const collections = useCollectionStore((s) => s.collections);
  const waypoints = useCollectionStore((s) => s.waypoints || []);
  const tasks = useTaskStore((s) => s.tasks);
  const items = useCollectionStore((s) => s.items);

  return useMemo(
    () => computeProgress({ goals, collections, waypoints, tasks, items }),
    [goals, collections, waypoints, tasks, items]
  );
}

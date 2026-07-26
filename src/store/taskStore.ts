import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safeStorage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export type Pillar = {
  id: string;
  name: string;
  isArchived?: boolean;
};

export type Tag = {
  id: string;
  pillarId: string;
  name: string; 
  type: 'earner' | 'burner';
  isArchived?: boolean;
}

export type Task = {
  id: string;
  title: string;
  tagId: string;
  summitId?: string;
  collectionId?: string; // Journey this task belongs to
  parentId?: string; // ID of the parent task if this is a subtask
  estimatedMinutes: number;
  completed: boolean;
  isIcebox: boolean;
  dateCreated: string;
  description?: string;
  // Quantity this task contributes to its linked Summit's 'units' metric
  // (e.g. 10 for "10 pages") — purely a Goal-progress input, never the
  // economy payout, which always stays keyed to estimatedMinutes. Only
  // meaningful when summitId points at a metricType:'units' Summit.
  metricProgress?: number;
  // Manual ordering key — larger sorts lower within its group (a day's active
  // tasks, or a parent's subtasks). Optional so persisted/cloud rows that
  // predate this field still typecheck; sortKey() below covers the gap by
  // falling back to creation time, so an un-reordered list still reads in
  // creation order with zero backfill.
  sortOrder?: number;
}

/**
 * The manual-order comparator key shared by the store and any screen that
 * renders a sortable group. Falls back to creation time for tasks that
 * predate `sortOrder` (or rows pulled from a cloud snapshot that hasn't
 * synced it yet), so legacy and reordered tasks compose on the same
 * epoch-ms scale.
 */
export function sortKey(t: Task): number {
  return t.sortOrder ?? Date.parse(t.dateCreated);
}

interface TaskState {
  tasks: Task[];
  tags: Tag[];
  pillars: Pillar[];
  // Remembers the last tag used on a quick-added task, so the next quick-add
  // defaults to it instead of forcing a choice every time.
  lastUsedTagId: string;
  // Guards the one-time repair below so it only ever runs once per device.
  tagPillarIdBackfillApplied: boolean;

  // Task Actions
  // title is the only required field — quick-add can create a task from just
  // a title; tagId/estimatedMinutes/isIcebox get safe defaults filled in below.
  addTask: (task: { title: string; tagId?: string; estimatedMinutes?: number; isIcebox?: boolean; summitId?: string; collectionId?: string; parentId?: string; }) => string;
  setLastUsedTagId: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string, isManual?: boolean) => void;
  moveToIcebox: (id: string) => void;
  activateFromIcebox: (id: string) => void;
  // Persists a manual drag-reorder. `orderedActiveIds` is the full new order
  // for one sortable group (a day's active tasks, or one parent's active
  // subtasks) — every other task (other groups, completed rows, icebox) is
  // left untouched.
  reorderTasks: (orderedActiveIds: string[]) => void;
  
  // Pillar Actions
  addPillar: (name: string) => void;
  updatePillarName: (id: string, name: string) => void;
  archivePillar: (id: string) => void;
  
  // Tag (Journey) Actions
  addTag: (tag: Omit<Tag, 'id'>) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  archiveTag: (id: string) => void;
  // Repairs tags persisted before the `bucket` -> `pillarId` rename (commit
  // 79ffeb8) that never got migrated, so they still carry the old `bucket`
  // field with `pillarId` left undefined. Pushing that straight to Supabase
  // violates tags.pillar_id's NOT NULL constraint on every sync attempt —
  // see docs/sdd/018-sync-health-indicator.md's "Journeys/Tags" failure.
  backfillTagPillarIds: () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      pillars: [
        { id: 'office', name: 'Office' },
        { id: 'health', name: 'Health' },
        { id: 'personal', name: 'Personal' }
      ],
      tags: [
        { id: uuidv4(), pillarId: 'office', name: 'Deep Work', type: 'earner' },
        { id: uuidv4(), pillarId: 'health', name: 'Fitness', type: 'earner' },
        { id: uuidv4(), pillarId: 'personal', name: 'Gaming', type: 'burner' }
      ],
      lastUsedTagId: '',
      tagPillarIdBackfillApplied: false,

      addTask: (task) => {
        const id = uuidv4();
        
        if (task.parentId) {
          const state = get();
          const parent = state.tasks.find(t => t.id === task.parentId);
          const siblings = state.tasks.filter(t => t.parentId === task.parentId);
          if (parent && parent.completed) {
            if (siblings.length === 0) {
              // Adding first subtask to a childless completed parent: revert its payout before it becomes a container
              get().toggleTask(task.parentId, true);
            } else {
              // Parent is completed but already has children (meaning they are all completed). Adding an incomplete child uncompletes the parent.
              get().updateTask(task.parentId, { completed: false });
            }
          }
        }

        const updatedState = get();

        // Safe default-fill so any caller (quick-add included) can create a
        // task from just a title — last-used tag, then first non-archived
        // tag, then '' as a last resort.
        const tagId = task.tagId
          || (updatedState.tags.find(t => t.id === updatedState.lastUsedTagId && !t.isArchived)?.id)
          || updatedState.tags.find(t => !t.isArchived)?.id
          || '';
        const estimatedMinutes = task.estimatedMinutes && task.estimatedMinutes > 0 ? task.estimatedMinutes : 25;
        const isIcebox = task.isIcebox ?? false;

        set((state) => ({
          tasks: [...state.tasks, {
            title: task.title,
            tagId,
            estimatedMinutes,
            isIcebox,
            summitId: task.summitId,
            collectionId: task.collectionId,
            parentId: task.parentId,
            id,
            completed: false,
            // Full timestamp (not just the date) so the row can show the
            // creation time — day-grouping (TasksScreen) extracts the date
            // portion itself.
            dateCreated: new Date().toISOString(),
            // Epoch-ms puts a brand-new task's key far above any reindexed
            // group's small integers (see reorderTasks), so it always lands
            // at the bottom of its group — preserving creation-order default.
            sortOrder: Date.now(),
          }],
          lastUsedTagId: tagId || state.lastUsedTagId
        }));
        return id;
      },
      setLastUsedTagId: (id) => set({ lastUsedTagId: id }),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      deleteTask: (id) => set((state) => {
        const taskToDelete = state.tasks.find(t => t.id === id);
        if (!taskToDelete) return state;

        let newTasks = state.tasks.filter(t => t.id !== id && t.parentId !== id);

        // Edge case: when deleting a subtask, handle the parent's completion state
        if (taskToDelete.parentId) {
            const remainingSiblings = newTasks.filter(t => t.parentId === taskToDelete.parentId);
            if (remainingSiblings.length === 0) {
                // Parent just became childless. If it's currently completed, force it to false so it doesn't stay in a state where it never paid out but is marked complete.
                const parentIndex = newTasks.findIndex(t => t.id === taskToDelete.parentId);
                if (parentIndex !== -1 && newTasks[parentIndex].completed) {
                    newTasks[parentIndex] = { ...newTasks[parentIndex], completed: false };
                }
            } else if (taskToDelete.completed === false) {
                // We deleted an incomplete sibling. Maybe now all remaining siblings are completed?
                const allChildrenCompleted = remainingSiblings.every(t => t.completed);
                if (allChildrenCompleted) {
                    const parentIndex = newTasks.findIndex(t => t.id === taskToDelete.parentId);
                    if (parentIndex !== -1 && !newTasks[parentIndex].completed) {
                        newTasks[parentIndex] = { ...newTasks[parentIndex], completed: true };
                    }
                }
            }
        }
        
        return { tasks: newTasks };
      }),
      toggleTask: (id, isManual = true) => set((state) => {
        const task = state.tasks.find(t => t.id === id);
        if (!task) return state;

        const isCompleting = !task.completed;
        const subtasks = state.tasks.filter(t => t.parentId === id);
        const isContainer = subtasks.length > 0;

        if (isManual && !isContainer) {
          const tag = state.tags.find(t => t.id === task.tagId);
          
          // Require stores dynamically inside to avoid circular dependencies if any
          const { useEconomyStore } = require('./economyStore');
          const { useSummitStore } = require('./summitStore');

          const economyState = useEconomyStore.getState();
          const summitState = useSummitStore.getState();

          if (isCompleting) {
            // Payout
            if (tag?.type === 'earner') {
              const conversion = economyState.getConversionRate();
              const hoursEarned = Math.round(task.estimatedMinutes * conversion.multiplier);
              economyState.addHours(hoursEarned);
              economyState.incrementStreak();
              economyState.incrementCompletedTasks();

              if (task.summitId) {
                summitState.applyLeafProgress(task.summitId, task.estimatedMinutes, task.metricProgress);
              }
            } else if (tag?.type === 'burner') {
              economyState.spendHours(task.estimatedMinutes);
            }
          } else {
            // Revert
            if (tag?.type === 'earner') {
              const conversion = economyState.getConversionRate();
              const hoursEarned = Math.round(task.estimatedMinutes * conversion.multiplier);
              economyState.removeHours(hoursEarned);
              economyState.decrementCompletedTasks();

              if (task.summitId) {
                summitState.revokeLeafProgress(task.summitId, task.estimatedMinutes, task.metricProgress);
              }
            } else if (tag?.type === 'burner') {
              economyState.addHours(task.estimatedMinutes);
            }
          }
        }

        const newTasks = state.tasks.map(t => t.id === id ? { ...t, completed: isCompleting } : t);

        // Auto-complete parent bubbling
        if (task.parentId) {
          const children = newTasks.filter(t => t.parentId === task.parentId);
          const allChildrenCompleted = children.every(t => t.completed);
          
          if (isCompleting && allChildrenCompleted) {
             const parentIndex = newTasks.findIndex(t => t.id === task.parentId);
             if (parentIndex !== -1) newTasks[parentIndex] = { ...newTasks[parentIndex], completed: true };
          } else if (!isCompleting) {
             const parentIndex = newTasks.findIndex(t => t.id === task.parentId);
             if (parentIndex !== -1) newTasks[parentIndex] = { ...newTasks[parentIndex], completed: false };
          }
        }

        return { tasks: newTasks };
      }),
      moveToIcebox: (id) => set((state) => ({
        // Cascade to subtasks so a parent's children don't strand as
        // orphaned, unrenderable rows (day view hides them once the parent
        // is iceboxed; the Icebox list only shows top-level rows).
        tasks: state.tasks.map(t => (t.id === id || t.parentId === id) ? { ...t, isIcebox: true } : t)
      })),
      activateFromIcebox: (id) => set((state) => ({
        tasks: state.tasks.map(t => (t.id === id || t.parentId === id) ? { ...t, isIcebox: false, dateCreated: new Date().toISOString() } : t)
      })),
      reorderTasks: (orderedActiveIds) => set((state) => {
        // Whole-group integer reindex — a personal daily list is tiny
        // (single-digit active rows per group), so reassigning every id in
        // the dropped group on every drop is trivially correct and needs no
        // fractional/gap-based rebalancing. Spacing (1000) is purely for
        // debug readability, not a real constraint.
        const newOrder = new Map(orderedActiveIds.map((id, index) => [id, index * 1000]));
        return {
          tasks: state.tasks.map(t => newOrder.has(t.id) ? { ...t, sortOrder: newOrder.get(t.id) } : t),
        };
      }),
      
      // Pillar Actions
      addPillar: (name) => set((state) => {
        const activePillars = state.pillars.filter(p => !p.isArchived);
        if (activePillars.length >= 5) {
          console.warn("Max 5 active pillars allowed.");
          return state; // Do nothing if limit reached
        }
        return {
          pillars: [...state.pillars, { id: uuidv4(), name }]
        };
      }),
      updatePillarName: (id, name) => set((state) => ({
        pillars: state.pillars.map(p => p.id === id ? { ...p, name } : p)
      })),
      archivePillar: (id) => set((state) => ({
        pillars: state.pillars.map(p => p.id === id ? { ...p, isArchived: true } : p)
      })),

      // Tag Actions
      addTag: (tag) => set((state) => ({
        tags: [...state.tags, { ...tag, id: uuidv4() }]
      })),
      updateTag: (id, updates) => set((state) => ({
        tags: state.tags.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      archiveTag: (id) => set((state) => ({
        tags: state.tags.map(t => t.id === id ? { ...t, isArchived: true } : t)
      })),
      backfillTagPillarIds: () => {
        if (get().tagPillarIdBackfillApplied) return;

        set((state) => {
          const fallbackPillarId = state.pillars.find(p => !p.isArchived)?.id || state.pillars[0]?.id || 'office';
          return {
            tags: state.tags.map(t => {
              if (t.pillarId) return t;
              // Pre-rename rows persisted the pillar under `bucket` (see
              // commit 79ffeb8); fall back to the first pillar if even that's gone.
              const legacyBucket = (t as unknown as { bucket?: string }).bucket;
              return { ...t, pillarId: legacyBucket || fallbackPillarId };
            }),
          };
        });

        set({ tagPillarIdBackfillApplied: true });
      },
    }),
    {
      name: 'earned-task-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

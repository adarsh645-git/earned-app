import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safeStorage';
import { useEconomyStore } from './economyStore';
import { computeProgress } from './progress';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export type UnlockedMilestoneInfo = {
  percentage: number;
  dollarsAwarded: number;
  goalTitle: string;
};

export type GoalType = 'productive' | 'entertainment';

export type Goal = {
  id: string;
  title: string;
  horizon: 'monthly' | 'yearly';
  targetMinutes: number; // legacy/fallback for economy math
  completedMinutes: number; // legacy/fallback
  metricType?: 'minutes' | 'units';
  targetMetric?: number;
  completedMetric?: number;
  // Free-text label for a 'units' goal's metric (e.g. "pages", "reps", "km") —
  // purely a display/homogeneity concern, never an economy input.
  unitLabel?: string;
  unlockedMilestones: number[]; // e.g. [25, 50, 75, 100]
  type?: GoalType;
  parentId?: string; // If set, this is a sub-project nested under a parent Goal
  category?: 'video-game' | 'movie' | 'tv-show' | 'youtube' | 'custom'; // For dynamic categorization
  paysCurrency?: boolean; // The one level in a chain that pays currency. Undefined = pays (back-compat).
  // Pillar (life area) this Goal belongs to. Undefined for Entertainment-type
  // goals (never pillar-scoped) and for productive Goals with no pillar
  // signal yet (pre-backfill, or genuinely unassigned) — see backfillGoalPillarIds.
  pillarId?: string;
};

// Chains are capped at 3 levels (depth 0, 1, 2) to keep progress legible —
// e.g. Book(2) -> Series(1) -> "20 Books"(0). Root = depth 0.
export const MAX_CHAIN_DEPTH = 2;

export function getChainDepth(goals: Goal[], goalId: string): number {
  let depth = 0;
  let cur = goals.find(g => g.id === goalId);
  const seen = new Set<string>();
  while (cur?.parentId && !seen.has(cur.id)) {
    seen.add(cur.id);
    depth++;
    cur = goals.find(g => g.id === cur!.parentId);
  }
  return depth;
}

export function getDescendantIds(goals: Goal[], goalId: string): Set<string> {
  const result = new Set<string>();
  const stack = [goalId];
  while (stack.length) {
    const cur = stack.pop()!;
    goals.forEach(g => {
      if (g.parentId === cur && !result.has(g.id)) {
        result.add(g.id);
        stack.push(g.id);
      }
    });
  }
  return result;
}

export function getChainRoot(goals: Goal[], goalId: string): Goal | undefined {
  let cur = goals.find(g => g.id === goalId);
  const seen = new Set<string>();
  while (cur?.parentId && !seen.has(cur.id)) {
    seen.add(cur.id);
    const parent = goals.find(g => g.id === cur!.parentId);
    if (!parent) break;
    cur = parent;
  }
  return cur;
}

// Titles from `goalId` up to its chain root, leaf-first (e.g. ["Elden Ring",
// "Games Backlog"]). Length 1 means the goal isn't part of a chain — callers
// use that to decide whether cascade-legibility feedback is worth showing.
export function getChainTrail(goals: Goal[], goalId: string): string[] {
  const trail: string[] = [];
  let cur = goals.find(g => g.id === goalId);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    trail.push(cur.title);
    cur = cur.parentId ? goals.find(g => g.id === cur!.parentId) : undefined;
  }
  return trail;
}

// Valid parents for `goal` (or for a not-yet-created goal, pass null): same
// type (productive/entertainment stay separate Goal trees) and same
// metricType (chains are homogeneous), excluding self/descendants (no cycles)
// and anything already at max depth (no chain longer than MAX_CHAIN_DEPTH + 1).
export function getEligibleParents(
  goals: Goal[],
  goal: Goal | null,
  type: GoalType,
  metricType: 'minutes' | 'units',
  // Chains must agree on what a "unit" even means, not just that they're both
  // 'units' mode — a "pages" chain and a "reps" chain can't cascade into each
  // other. Defaults to '' so existing call sites (no label concept yet) keep
  // matching only other unlabeled goals, unchanged from today's behavior.
  unitLabel: string = ''
): Goal[] {
  const excludeIds = goal ? new Set([goal.id, ...getDescendantIds(goals, goal.id)]) : new Set<string>();
  const normalizedUnitLabel = unitLabel.trim().toLowerCase();
  return goals.filter(g => {
    if (excludeIds.has(g.id)) return false;
    if ((g.type || 'productive') !== type) return false;
    if ((g.metricType || 'minutes') !== metricType) return false;
    if (metricType === 'units' && (g.unitLabel || '').trim().toLowerCase() !== normalizedUnitLabel) return false;
    if (getChainDepth(goals, g.id) >= MAX_CHAIN_DEPTH) return false;
    return true;
  });
}

export const getMilestoneDollars = (targetMinutes: number, milestone: number, goalType: GoalType = 'productive'): number => {
  // Entertainment goals are already paid for with earned Hours — no Dollar double-dip on completion.
  if (goalType === 'entertainment') return 0;

  const totalBonusKeys = Math.max(1, Math.round(targetMinutes / 60));
  const keys25 = Math.round(totalBonusKeys * 0.2);
  const keys50 = Math.round(totalBonusKeys * 0.2);
  const keys75 = Math.round(totalBonusKeys * 0.2);
  const keys100 = totalBonusKeys - (keys25 + keys50 + keys75);

  let keys = 0;
  switch (milestone) {
    case 25: keys = keys25; break;
    case 50: keys = keys50; break;
    case 75: keys = keys75; break;
    case 100: keys = keys100; break;
  }

  // 1 Key = $0.02
  return Math.round((keys * 0.02) * 100) / 100;
};

interface GoalState {
  goals: Goal[];
  paysCurrencyDefaultsApplied: boolean;
  applyPaysCurrencyDefaults: () => void;
  backfillGoalPillarIdsApplied: boolean;
  // One-time: existing productive Goals predate pillarId and would otherwise
  // sit in "Unassigned" forever. Best-effort guess from the pillar of the
  // Goal's own linked tasks — see docs/sdd/024-goal-pillar-hierarchy.md.
  backfillGoalPillarIds: () => void;
  addGoal: (goal: Omit<Goal, 'id' | 'completedMinutes' | 'completedMetric' | 'unlockedMilestones'>) => string;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  // Recomputes this Goal's (and every ancestor's, via parentId) % fresh
  // through the trickle-up engine (progress.ts), diffs against
  // unlockedMilestones, and awards/revokes getMilestoneDollars for whatever
  // changed — the one place milestone economy is touched. Call after any
  // task/item completion change that could affect this Goal's chain. Returns
  // only the newly-unlocked milestones (never revokes) for toast feedback,
  // mirroring the old applyLeafProgress/addProgress return shape. See
  // docs/sdd/025-unified-trickle-up-progress.md.
  reconcileGoalMilestones: (goalId: string) => UnlockedMilestoneInfo[];
  // Makes `goalId` the one paying level of its whole chain (root + all
  // descendants), clearing paysCurrency everywhere else in that chain.
  setPayingLevel: (goalId: string) => void;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: [],
      paysCurrencyDefaultsApplied: false,
      backfillGoalPillarIdsApplied: false,

      // One-time: existing chains predate the single-paying-level rule and would
      // otherwise pay at every level. Default the root of each chain to pay and
      // descendants not to, without overriding any explicit user choice.
      applyPaysCurrencyDefaults: () => {
        if (get().paysCurrencyDefaultsApplied) return;
        set((state) => ({
          paysCurrencyDefaultsApplied: true,
          goals: state.goals.map(g => ({
            ...g,
            paysCurrency: g.paysCurrency !== undefined ? g.paysCurrency : !g.parentId,
          })),
        }));
      },

      backfillGoalPillarIds: () => {
        if (get().backfillGoalPillarIdsApplied) return;

        // Dynamic require avoids a circular import (taskStore doesn't import
        // this store, but keeping the same defensive pattern used elsewhere
        // in this file, e.g. deleteGoal below).
        const { useTaskStore } = require('./taskStore');
        const { tasks, tags } = useTaskStore.getState();

        set((state) => ({
          backfillGoalPillarIdsApplied: true,
          goals: state.goals.map(g => {
            if (g.pillarId || g.type === 'entertainment') return g;
            const task = tasks.find((t: any) => t.goalId === g.id);
            const tag = task ? tags.find((tg: any) => tg.id === task.tagId) : undefined;
            // No signal → leave undefined (lands in the "Unassigned" bucket)
            // rather than inventing a fake pillar assignment.
            return tag?.pillarId ? { ...g, pillarId: tag.pillarId } : g;
          }),
        }));
      },

      addGoal: (goal) => {
        const id = uuidv4();
        set((state) => ({
          goals: [...state.goals, {
            ...goal,
            id,
            type: goal.type || 'productive',
            parentId: goal.parentId,
            completedMinutes: 0,
            completedMetric: 0,
            metricType: goal.metricType || 'minutes',
            unlockedMilestones: [],
          }]
        }));
        return id;
      },
      updateGoal: (id, updates) => {
        set((state) => ({
          goals: state.goals.map(g => g.id === id ? { ...g, ...updates } : g)
        }));

        // A Journey's Pillar is forced to match its linked Goal's (see
        // docs/sdd/029-journey-page-audit.md) — reassigning the Goal's own
        // Pillar cascades to every Journey linked to it, reusing
        // collectionStore.updateCollection's own retag side effect so Tasks
        // underneath cascade too. Dynamic require avoids a circular import,
        // matching this file's existing deleteGoal pattern.
        if ('pillarId' in updates) {
          const { useCollectionStore } = require('./collectionStore');
          const collectionState = useCollectionStore.getState();
          collectionState.collections
            .filter((c: { goalId?: string }) => c.goalId === id)
            .forEach((c: { id: string }) => collectionState.updateCollection(c.id, { pillarId: updates.pillarId }));
        }
      },
      setPayingLevel: (goalId) => set((state) => {
        const root = getChainRoot(state.goals, goalId);
        if (!root) return state;
        const chainIds = new Set([root.id, ...getDescendantIds(state.goals, root.id)]);
        return {
          goals: state.goals.map(g =>
            chainIds.has(g.id) ? { ...g, paysCurrency: g.id === goalId } : g
          ),
        };
      }),
      deleteGoal: (id) => {
        // Sub-goals are structurally dependent on their parent — remove them too.
        // Anything else that merely references this goal (tasks, Journeys) is
        // unlinked, not deleted, so unrelated work is never silently destroyed.
        const childIds = get().goals.filter(g => g.parentId === id).map(g => g.id);
        const idsToRemove = new Set([id, ...childIds]);

        set((state) => ({
          goals: state.goals.filter(g => !idsToRemove.has(g.id))
        }));

        // Dynamic require avoids a circular import (taskStore/collectionStore
        // already import this store), matching the pattern used in taskStore.ts.
        const { useTaskStore } = require('./taskStore');
        useTaskStore.setState((s: any) => ({
          tasks: s.tasks.map((t: any) =>
            t.goalId && idsToRemove.has(t.goalId) ? { ...t, goalId: undefined } : t
          ),
        }));

        const { useCollectionStore } = require('./collectionStore');
        useCollectionStore.setState((s: any) => ({
          collections: s.collections.map((c: any) =>
            c.goalId && idsToRemove.has(c.goalId) ? { ...c, goalId: undefined } : c
          ),
        }));
      },
      reconcileGoalMilestones: (goalId) => {
        // Dynamic requires avoid a circular import — collectionStore already
        // statically imports this store, same defensive pattern used
        // elsewhere in this file (e.g. deleteGoal below).
        const { useCollectionStore } = require('./collectionStore');
        const { useTaskStore } = require('./taskStore');
        const collectionsState = useCollectionStore.getState();
        const tasksState = useTaskStore.getState();

        const goals = get().goals;
        const selectors = computeProgress({
          goals,
          collections: collectionsState.collections,
          waypoints: collectionsState.waypoints || [],
          tasks: tasksState.tasks,
          items: collectionsState.items,
        });

        const updates: Record<string, Partial<Goal>> = {};
        const newlyUnlocked: UnlockedMilestoneInfo[] = [];

        // Walk this Goal + every ancestor up the parentId chain — a change
        // anywhere in the tree can affect a milestone at any level above it.
        let cur: Goal | undefined = goals.find(g => g.id === goalId);
        const seen = new Set<string>();
        while (cur && !seen.has(cur.id)) {
          seen.add(cur.id);
          const p = selectors.goalProgress(cur.id);

          if (p && p.hasTarget) {
            const isUnits = cur.metricType === 'units';
            const targetForPayout = isUnits ? (cur.targetMetric || 1) * 60 : cur.targetMinutes;
            const pays = cur.paysCurrency !== false;
            const existing = cur.unlockedMilestones || [];
            const updatedUnlocked = [...existing];

            [25, 50, 75, 100].forEach(m => {
              const wasUnlocked = existing.includes(m);
              const nowUnlocked = p.pct >= m;
              if (nowUnlocked && !wasUnlocked) {
                const dollars = getMilestoneDollars(targetForPayout, m, cur!.type || 'productive');
                updatedUnlocked.push(m);
                newlyUnlocked.push({ percentage: m, dollarsAwarded: dollars, goalTitle: cur!.title });
                if (pays) {
                  useEconomyStore.getState().addBalance(dollars);
                  if (m === 100) useEconomyStore.getState().incrementCompletedGoals();
                }
              } else if (!nowUnlocked && wasUnlocked) {
                const dollars = getMilestoneDollars(targetForPayout, m, cur!.type || 'productive');
                const idx = updatedUnlocked.indexOf(m);
                if (idx > -1) updatedUnlocked.splice(idx, 1);
                if (pays) {
                  useEconomyStore.getState().removeBalance(dollars);
                }
              }
            });

            // completedMinutes/completedMetric become a cosmetic/sync cache of
            // the derived value — written here, never read back as truth.
            updates[cur.id] = {
              unlockedMilestones: updatedUnlocked,
              completedMinutes: isUnits ? cur.completedMinutes : p.completed,
              completedMetric: isUnits ? p.completed : cur.completedMetric,
            };
          }

          cur = cur.parentId ? goals.find(g => g.id === cur!.parentId) : undefined;
        }

        if (Object.keys(updates).length > 0) {
          set((state) => ({
            goals: state.goals.map(g => (updates[g.id] ? { ...g, ...updates[g.id] } : g)),
          }));
        }

        return newlyUnlocked;
      },
    }),
    {
      // Storage key intentionally left unchanged — this is a Goal/Waypoint
      // *naming* rename, not a storage migration. Changing this key would
      // orphan any local-only (unsynced) data for offline users on next load.
      name: 'earned-macro-storage',
      storage: createJSONStorage(() => safeStorage),
      // v0 persisted state has `summits` (pre-spec-022 field name). Carry it
      // forward into `goals` so existing offline-only data isn't orphaned by
      // the field rename — the array itself never changes shape, just its key.
      version: 1,
      migrate: (persistedState: any, version) => {
        if (version < 1 && persistedState && 'summits' in persistedState) {
          persistedState.goals = persistedState.summits;
          delete persistedState.summits;
        }
        return persistedState;
      },
    }
  )
);

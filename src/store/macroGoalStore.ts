import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safeStorage';
import { useEconomyStore } from './economyStore';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export type UnlockedMilestoneInfo = {
  percentage: number;
  dollarsAwarded: number;
  goalTitle: string;
};

export type MacroGoalType = 'productive' | 'entertainment';

export type MacroGoal = {
  id: string;
  title: string;
  horizon: 'monthly' | 'yearly';
  targetMinutes: number; // legacy/fallback for economy math
  completedMinutes: number; // legacy/fallback
  metricType?: 'minutes' | 'units';
  targetMetric?: number;
  completedMetric?: number;
  unlockedMilestones: number[]; // e.g. [25, 50, 75, 100]
  type?: MacroGoalType;
  parentId?: string; // If set, this is a sub-project nested under a parent MacroGoal
  category?: 'video-game' | 'movie' | 'tv-show' | 'youtube' | 'custom'; // For dynamic categorization
  paysCurrency?: boolean; // The one level in a chain that pays currency. Undefined = pays (back-compat).
};

// Chains are capped at 3 levels (depth 0, 1, 2) to keep progress legible —
// e.g. Book(2) -> Series(1) -> "20 Books"(0). Root = depth 0.
export const MAX_CHAIN_DEPTH = 2;

export function getChainDepth(macroGoals: MacroGoal[], goalId: string): number {
  let depth = 0;
  let cur = macroGoals.find(g => g.id === goalId);
  const seen = new Set<string>();
  while (cur?.parentId && !seen.has(cur.id)) {
    seen.add(cur.id);
    depth++;
    cur = macroGoals.find(g => g.id === cur!.parentId);
  }
  return depth;
}

export function getDescendantIds(macroGoals: MacroGoal[], goalId: string): Set<string> {
  const result = new Set<string>();
  const stack = [goalId];
  while (stack.length) {
    const cur = stack.pop()!;
    macroGoals.forEach(g => {
      if (g.parentId === cur && !result.has(g.id)) {
        result.add(g.id);
        stack.push(g.id);
      }
    });
  }
  return result;
}

export function getChainRoot(macroGoals: MacroGoal[], goalId: string): MacroGoal | undefined {
  let cur = macroGoals.find(g => g.id === goalId);
  const seen = new Set<string>();
  while (cur?.parentId && !seen.has(cur.id)) {
    seen.add(cur.id);
    const parent = macroGoals.find(g => g.id === cur!.parentId);
    if (!parent) break;
    cur = parent;
  }
  return cur;
}

// Titles from `goalId` up to its chain root, leaf-first (e.g. ["Elden Ring",
// "RPG Backlog"]). Length 1 means the goal isn't part of a chain — callers
// use that to decide whether cascade-legibility feedback is worth showing.
export function getChainTrail(macroGoals: MacroGoal[], goalId: string): string[] {
  const trail: string[] = [];
  let cur = macroGoals.find(g => g.id === goalId);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    trail.push(cur.title);
    cur = cur.parentId ? macroGoals.find(g => g.id === cur!.parentId) : undefined;
  }
  return trail;
}

// Valid parents for `goal` (or for a not-yet-created goal, pass null): same
// type (productive/entertainment stay separate pyramids) and same metricType
// (chains are homogeneous), excluding self/descendants (no cycles) and
// anything already at max depth (no chain longer than MAX_CHAIN_DEPTH + 1).
export function getEligibleParents(
  macroGoals: MacroGoal[],
  goal: MacroGoal | null,
  type: MacroGoalType,
  metricType: 'minutes' | 'units'
): MacroGoal[] {
  const excludeIds = goal ? new Set([goal.id, ...getDescendantIds(macroGoals, goal.id)]) : new Set<string>();
  return macroGoals.filter(g => {
    if (excludeIds.has(g.id)) return false;
    if ((g.type || 'productive') !== type) return false;
    if ((g.metricType || 'minutes') !== metricType) return false;
    if (getChainDepth(macroGoals, g.id) >= MAX_CHAIN_DEPTH) return false;
    return true;
  });
}

export const getMilestoneDollars = (targetMinutes: number, milestone: number, goalType: MacroGoalType = 'productive'): number => {
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

interface MacroGoalState {
  macroGoals: MacroGoal[];
  paysCurrencyDefaultsApplied: boolean;
  applyPaysCurrencyDefaults: () => void;
  addMacroGoal: (goal: Omit<MacroGoal, 'id' | 'completedMinutes' | 'completedMetric' | 'unlockedMilestones'>) => void;
  updateMacroGoal: (id: string, updates: Partial<MacroGoal>) => void;
  deleteMacroGoal: (id: string) => void;
  addProgress: (id: string, amount: number) => UnlockedMilestoneInfo[];
  removeProgress: (id: string, amount: number) => void;
  // Walks a units (count) chain from parentId to root, stepping each ancestor's
  // completed count by delta (+1 on a leaf completion, -1 on an un-completion).
  stepCountAncestors: (parentId: string, delta: 1 | -1) => UnlockedMilestoneInfo[];
  // Routes a leaf action to the correct unit for the linked goal's chain:
  // a discrete completion is +1 to a count goal; effort is minutes to a time goal.
  applyLeafProgress: (goalId: string, minutes: number) => UnlockedMilestoneInfo[];
  revokeLeafProgress: (goalId: string, minutes: number) => void;
  // Makes `goalId` the one paying level of its whole chain (root + all
  // descendants), clearing paysCurrency everywhere else in that chain.
  setPayingLevel: (goalId: string) => void;
}

export const useMacroGoalStore = create<MacroGoalState>()(
  persist(
    (set, get) => ({
      macroGoals: [],
      paysCurrencyDefaultsApplied: false,

      // One-time: existing chains predate the single-paying-level rule and would
      // otherwise pay at every level. Default the root of each chain to pay and
      // descendants not to, without overriding any explicit user choice.
      applyPaysCurrencyDefaults: () => {
        if (get().paysCurrencyDefaultsApplied) return;
        set((state) => ({
          paysCurrencyDefaultsApplied: true,
          macroGoals: state.macroGoals.map(g => ({
            ...g,
            paysCurrency: g.paysCurrency !== undefined ? g.paysCurrency : !g.parentId,
          })),
        }));
      },

      addMacroGoal: (goal) => set((state) => ({
        macroGoals: [...state.macroGoals, { 
          ...goal, 
          id: uuidv4(),
          type: goal.type || 'productive',
          parentId: goal.parentId,
          completedMinutes: 0,
          completedMetric: 0,
          metricType: goal.metricType || 'minutes',
          unlockedMilestones: [],
        }]
      })),
      updateMacroGoal: (id, updates) => set((state) => ({
        macroGoals: state.macroGoals.map(g => g.id === id ? { ...g, ...updates } : g)
      })),
      setPayingLevel: (goalId) => set((state) => {
        const root = getChainRoot(state.macroGoals, goalId);
        if (!root) return state;
        const chainIds = new Set([root.id, ...getDescendantIds(state.macroGoals, root.id)]);
        return {
          macroGoals: state.macroGoals.map(g =>
            chainIds.has(g.id) ? { ...g, paysCurrency: g.id === goalId } : g
          ),
        };
      }),
      deleteMacroGoal: (id) => {
        // Sub-goals are structurally dependent on their parent — remove them too.
        // Anything else that merely references this goal (tasks, Journeys) is
        // unlinked, not deleted, so unrelated work is never silently destroyed.
        const childIds = get().macroGoals.filter(g => g.parentId === id).map(g => g.id);
        const idsToRemove = new Set([id, ...childIds]);

        set((state) => ({
          macroGoals: state.macroGoals.filter(g => !idsToRemove.has(g.id))
        }));

        // Dynamic require avoids a circular import (taskStore/collectionStore
        // already import this store), matching the pattern used in taskStore.ts.
        const { useTaskStore } = require('./taskStore');
        useTaskStore.setState((s: any) => ({
          tasks: s.tasks.map((t: any) =>
            t.macroGoalId && idsToRemove.has(t.macroGoalId) ? { ...t, macroGoalId: undefined } : t
          ),
        }));

        const { useCollectionStore } = require('./collectionStore');
        useCollectionStore.setState((s: any) => ({
          collections: s.collections.map((c: any) =>
            c.macroGoalId && idsToRemove.has(c.macroGoalId) ? { ...c, macroGoalId: undefined } : c
          ),
        }));
      },
      addProgress: (id, amount) => {
        const goal = get().macroGoals.find(g => g.id === id);
        if (!goal) return [];

        const isUnits = goal.metricType === 'units';
        // Currency is paid at exactly one designated level of a chain. Progress
        // and milestone badges still update everywhere; only payout is gated.
        const pays = goal.paysCurrency !== false;

        let newPct = 0;
        let prevPct = 0;
        let newMinutes = goal.completedMinutes;
        let newMetric = goal.completedMetric || 0;
        let targetForPayout = goal.targetMinutes;

        if (isUnits) {
          const target = goal.targetMetric || 1;
          prevPct = Math.min(100, Math.floor(((goal.completedMetric || 0) / target) * 100));
          newMetric = newMetric + amount;
          newPct = Math.min(100, Math.floor((newMetric / target) * 100));
          targetForPayout = (goal.targetMetric || 1) * 60; // Approximate 1 hour per unit for economy math fallback
        } else {
          const target = goal.targetMinutes;
          prevPct = target > 0 ? Math.min(100, Math.floor((goal.completedMinutes / target) * 100)) : 0;
          newMinutes = newMinutes + amount;
          newPct = target > 0 ? Math.min(100, Math.floor((newMinutes / target) * 100)) : 0;
        }

        const existingMilestones = goal.unlockedMilestones || [];
        const possibleMilestones = [25, 50, 75, 100];
        const newlyUnlocked: UnlockedMilestoneInfo[] = [];
        const updatedUnlocked = [...existingMilestones];

        possibleMilestones.forEach(m => {
          if (newPct >= m && !existingMilestones.includes(m)) {
            const dollars = getMilestoneDollars(targetForPayout, m, goal.type || 'productive');
            newlyUnlocked.push({
              percentage: m,
              dollarsAwarded: dollars,
              goalTitle: goal.title,
            });
            updatedUnlocked.push(m);
            if (pays) {
              // Award bonus dollars immediately to balance (garnish-safe)
              useEconomyStore.getState().addBalance(dollars);
              // Increment Discipline Score booster if 100% milestone reached
              if (m === 100) {
                useEconomyStore.getState().incrementCompletedMacroGoals();
              }
            }
          }
        });

        set((state) => ({
          macroGoals: state.macroGoals.map(g =>
            g.id === id
              ? { ...g, completedMinutes: newMinutes, completedMetric: newMetric, unlockedMilestones: updatedUnlocked }
              : g
          ),
        }));

        // Cascade to the parent chain (chains are homogeneous in metricType):
        //  - Time chains: minutes flow up continuously, one level at a time.
        //  - Count chains: only a *completion* (transition to 100%) counts as a
        //    discrete unit, contributing +1 to every count-ancestor exactly once
        //    — so a 20-chapter book adds +1 to "20 books", never +20.
        let parentUnlocked: UnlockedMilestoneInfo[] = [];
        if (goal.parentId) {
          if (isUnits) {
            if (prevPct < 100 && newPct >= 100) {
              parentUnlocked = get().stepCountAncestors(goal.parentId, 1);
            }
          } else {
            parentUnlocked = get().addProgress(goal.parentId, amount);
          }
        }

        return [...newlyUnlocked, ...parentUnlocked];
      },

      stepCountAncestors: (startParentId, delta) => {
        const unlocked: UnlockedMilestoneInfo[] = [];
        let cur: string | undefined = startParentId;
        // Guard against malformed cycles.
        const seen = new Set<string>();

        while (cur && !seen.has(cur)) {
          seen.add(cur);
          const g = get().macroGoals.find(x => x.id === cur);
          // Homogeneity guard: stop if the chain breaks or switches metric.
          if (!g || g.metricType !== 'units') break;

          const target = g.targetMetric || 1;
          const prev = g.completedMetric || 0;
          const next = Math.max(0, prev + delta);
          const prevPct = Math.min(100, Math.floor((prev / target) * 100));
          const nextPct = Math.min(100, Math.floor((next / target) * 100));
          const pays = g.paysCurrency !== false;
          const existing = g.unlockedMilestones || [];
          const updated = [...existing];

          [25, 50, 75, 100].forEach(m => {
            if (delta > 0 && nextPct >= m && !existing.includes(m)) {
              const dollars = getMilestoneDollars(target * 60, m, g.type || 'productive');
              unlocked.push({ percentage: m, dollarsAwarded: dollars, goalTitle: g.title });
              updated.push(m);
              if (pays) {
                useEconomyStore.getState().addBalance(dollars);
                if (m === 100) useEconomyStore.getState().incrementCompletedMacroGoals();
              }
            } else if (delta < 0 && existing.includes(m) && nextPct < m) {
              const idx = updated.indexOf(m);
              if (idx > -1) updated.splice(idx, 1);
              if (pays) {
                useEconomyStore.getState().removeBalance(getMilestoneDollars(target * 60, m, g.type || 'productive'));
              }
            }
          });

          const curId = cur;
          set((state) => ({
            macroGoals: state.macroGoals.map(x =>
              x.id === curId ? { ...x, completedMetric: next, unlockedMilestones: updated } : x
            ),
          }));

          cur = g.parentId;
        }

        return unlocked;
      },

      applyLeafProgress: (goalId, minutes) => {
        const goal = get().macroGoals.find(g => g.id === goalId);
        if (!goal) return [];
        // Count chains advance one unit per discrete completion; time chains
        // absorb the minutes of effort. addProgress handles accumulation + the
        // completion ripple to ancestors.
        return get().addProgress(goalId, goal.metricType === 'units' ? 1 : minutes);
      },

      revokeLeafProgress: (goalId, minutes) => {
        const goal = get().macroGoals.find(g => g.id === goalId);
        if (!goal) return;
        get().removeProgress(goalId, goal.metricType === 'units' ? 1 : minutes);
      },

      removeProgress: (id, amount) => {
        const goal = get().macroGoals.find(g => g.id === id);
        if (!goal) return;

        const isUnits = goal.metricType === 'units';
        const pays = goal.paysCurrency !== false;

        let newPct = 0;
        let prevPct = 0;
        let newMinutes = goal.completedMinutes;
        let newMetric = goal.completedMetric || 0;
        let targetForPayout = goal.targetMinutes;

        if (isUnits) {
          const target = goal.targetMetric || 1;
          prevPct = Math.min(100, Math.floor(((goal.completedMetric || 0) / target) * 100));
          newMetric = Math.max(0, newMetric - amount);
          newPct = Math.min(100, Math.floor((newMetric / target) * 100));
          targetForPayout = (goal.targetMetric || 1) * 60;
        } else {
          const target = goal.targetMinutes;
          prevPct = target > 0 ? Math.min(100, Math.floor((goal.completedMinutes / target) * 100)) : 0;
          newMinutes = Math.max(0, newMinutes - amount);
          newPct = target > 0 ? Math.min(100, Math.floor((newMinutes / target) * 100)) : 0;
        }

        const existingMilestones = goal.unlockedMilestones || [];
        const possibleMilestones = [25, 50, 75, 100];
        const updatedUnlocked = [...existingMilestones];

        possibleMilestones.forEach(m => {
          // If we had unlocked this milestone previously, but our new percentage has dropped below it...
          if (existingMilestones.includes(m) && newPct < m) {
            const dollars = getMilestoneDollars(targetForPayout, m, goal.type || 'productive');
            // Remove the milestone from the active array
            const idx = updatedUnlocked.indexOf(m);
            if (idx > -1) {
              updatedUnlocked.splice(idx, 1);
            }
            // Revoke the bonus dollars only if this level was the paying level.
            if (pays) {
              useEconomyStore.getState().removeBalance(dollars);
            }
          }
        });

        set((state) => ({
          macroGoals: state.macroGoals.map(g =>
            g.id === id
              ? { ...g, completedMinutes: newMinutes, completedMetric: newMetric, unlockedMilestones: updatedUnlocked }
              : g
          ),
        }));

        // Mirror the addProgress cascade in reverse (homogeneous chains):
        //  - Time chains: remove the same minutes from each ancestor.
        //  - Count chains: only reverse a *completion* — if this node dropped out
        //    of 100%, step every count-ancestor down by 1.
        if (goal.parentId) {
          if (isUnits) {
            if (prevPct >= 100 && newPct < 100) {
              get().stepCountAncestors(goal.parentId, -1);
            }
          } else {
            get().removeProgress(goal.parentId, amount);
          }
        }
      },
    }),
    {
      name: 'earned-macro-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

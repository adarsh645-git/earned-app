// Unified trickle-up progress engine — Task/Item (leaf) -> Waypoint -> Journey
// (Collection) -> Goal, including Goal.parentId sub-goal chains. Pure function
// over the current task tree; nothing here is stored — Goal/Journey/Waypoint
// progress is *always* a fresh recompute, never an incrementally-mutated
// counter, so completing/deleting/editing a task can never leave a stale
// number behind (see docs/sdd/025-unified-trickle-up-progress.md).
//
// The one roll-up rule, auto-decided by unit match (no manual toggle):
//  - child unit === parent unit  -> child's completed amount ADDS into the
//    parent (continuous partial credit — e.g. miles run, hours focused).
//  - child unit !== parent unit  -> child contributes a discrete +1 to the
//    parent the moment it reaches 100% (e.g. finishing one 1000-page book
//    counts as +1 toward a "20 books" Goal, never +1000).
//  - a node with no target set (passive) is transparent: its own children
//    roll straight through to whatever unit its parent asked for, as if the
//    passive node weren't there at all. This is what lets an un-targeted
//    "series" Journey or "week" Waypoint be pure organization with zero
//    progress math of its own.
import type { Goal } from './goalStore';
import type { Collection, Waypoint, CollectionItem } from './collectionStore';
import type { Task } from './taskStore';

export const MINUTES_UNIT = 'minutes';

export type NodeProgress = {
  id: string;
  unit: string; // normalized (trimmed, lowercased); MINUTES_UNIT sentinel for time-mode
  hasTarget: boolean;
  target: number; // 0 when hasTarget is false
  completed: number; // raw accumulated amount, expressed in `unit`
  pct: number; // 0-100, floored — used for milestone/completion gating (money-safe)
  pctRounded: number; // 0-100, rounded — display only
};

export interface ProgressSources {
  goals: Goal[];
  collections: Collection[];
  waypoints: Waypoint[];
  tasks: Task[];
  items: CollectionItem[];
}

function normalizeUnit(label?: string): string {
  return (label || '').trim().toLowerCase();
}

function pctOf(completed: number, target: number): { pct: number; pctRounded: number } {
  if (target <= 0) return { pct: 0, pctRounded: 0 };
  return {
    pct: Math.min(100, Math.floor((completed / target) * 100)),
    pctRounded: Math.min(100, Math.round((completed / target) * 100)),
  };
}

// Amount a completed Task contributes when its immediate parent (Waypoint, or
// Journey/Goal directly if it has no Waypoint) speaks `unit`. Mirrors the old
// applyLeafProgress: minutes-mode uses the task's time estimate, units-mode
// uses its declared metricProgress (defaulting to a flat +1 so every
// pre-existing units task without one keeps behaving exactly as before).
function taskAmount(t: Task, unit: string): number {
  if (!t.completed) return 0;
  if (unit === MINUTES_UNIT) return t.estimatedMinutes || 0;
  return t.metricProgress ?? 1;
}

// Same idea for a checklist CollectionItem — items never carry a custom
// metric quantity (mirrors the old collectionStore.toggleItemCompletion,
// which always passed a flat `1`), and default to a 60-minute assumption
// when a minutes-mode item never set its own estimate.
function itemAmount(i: CollectionItem, unit: string): number {
  if (!i.completed) return 0;
  if (unit === MINUTES_UNIT) return i.estimatedMinutes || 60;
  return 1;
}

export function computeProgress(src: ProgressSources) {
  const { goals, collections, waypoints, tasks, items } = src;

  const goalById = new Map(goals.map((g) => [g.id, g]));
  const collectionById = new Map(collections.map((c) => [c.id, c]));

  const goalUnit = (g: Goal): string =>
    g.metricType === 'units' ? normalizeUnit(g.unitLabel) : MINUTES_UNIT;

  // A Journey/Waypoint's own unit: an explicit label wins; otherwise it
  // falls back to its linked Goal's unit (the pre-existing "borrows the
  // goal's unit" behavior), otherwise defaults to minutes.
  const collectionUnit = (c: Collection): string => {
    if (c.unitLabel) return normalizeUnit(c.unitLabel);
    const g = c.goalId ? goalById.get(c.goalId) : undefined;
    return g ? goalUnit(g) : MINUTES_UNIT;
  };
  const waypointUnit = (w: Waypoint): string => {
    if (w.unitLabel) return normalizeUnit(w.unitLabel);
    const c = collectionById.get(w.collectionId);
    return c ? collectionUnit(c) : MINUTES_UNIT;
  };

  const waypointCache = new Map<string, NodeProgress>();
  function waypointProgress(w: Waypoint): NodeProgress {
    const cached = waypointCache.get(w.id);
    if (cached) return cached;

    const unit = waypointUnit(w);
    const lt = tasks.filter((t) => t.waypointId === w.id);
    const li = items.filter((i) => i.waypointId === w.id);
    const hasTarget = !!w.targetMetric && w.targetMetric > 0;

    let result: NodeProgress;
    if (hasTarget) {
      const completed =
        lt.reduce((s, t) => s + taskAmount(t, unit), 0) + li.reduce((s, i) => s + itemAmount(i, unit), 0);
      result = { id: w.id, unit, hasTarget: true, target: w.targetMetric!, completed, ...pctOf(completed, w.targetMetric!) };
    } else {
      // Passive Waypoint: no target set — binary completed/total-tasks
      // display fallback (its own display only; rollup transparency is
      // handled separately by waypointContribution below).
      const total = lt.length + li.length;
      const done = lt.filter((t) => t.completed).length + li.filter((i) => i.completed).length;
      result = { id: w.id, unit, hasTarget: false, target: 0, completed: done, ...pctOf(done, total) };
    }
    waypointCache.set(w.id, result);
    return result;
  }

  // How much a Waypoint feeds into a parent that itself speaks `parentUnit`.
  function waypointContribution(w: Waypoint, parentUnit: string): number {
    const p = waypointProgress(w);
    if (!p.hasTarget) {
      // Transparent flatten straight to its own leaves, in the parent's unit.
      const lt = tasks.filter((t) => t.waypointId === w.id);
      const li = items.filter((i) => i.waypointId === w.id);
      return lt.reduce((s, t) => s + taskAmount(t, parentUnit), 0) + li.reduce((s, i) => s + itemAmount(i, parentUnit), 0);
    }
    if (p.unit === parentUnit) return p.completed;
    return p.pct >= 100 ? 1 : 0;
  }

  const journeyCache = new Map<string, NodeProgress>();
  function journeyProgress(c: Collection): NodeProgress {
    const cached = journeyCache.get(c.id);
    if (cached) return cached;

    const unit = collectionUnit(c);
    const childWaypoints = waypoints.filter((w) => w.collectionId === c.id);
    const lt = tasks.filter((t) => t.collectionId === c.id && !t.waypointId);
    const li = items.filter((i) => i.collectionId === c.id && !i.waypointId);
    const hasTarget = !!c.targetMetric && c.targetMetric > 0;

    let result: NodeProgress;
    if (hasTarget) {
      const completed =
        lt.reduce((s, t) => s + taskAmount(t, unit), 0) +
        li.reduce((s, i) => s + itemAmount(i, unit), 0) +
        childWaypoints.reduce((s, w) => s + waypointContribution(w, unit), 0);
      result = { id: c.id, unit, hasTarget: true, target: c.targetMetric!, completed, ...pctOf(completed, c.targetMetric!) };
    } else {
      // Passive Journey: "This Journey" own display stays the simple binary
      // items-completed bar (unchanged cosmetic behavior from before this
      // engine existed); rollup transparency is handled by
      // journeyContribution below, not here.
      const journeyItems = items.filter((i) => i.collectionId === c.id);
      const done = journeyItems.filter((i) => i.completed).length;
      result = { id: c.id, unit, hasTarget: false, target: 0, completed: done, ...pctOf(done, journeyItems.length) };
    }
    journeyCache.set(c.id, result);
    return result;
  }

  function journeyContribution(c: Collection, parentUnit: string): number {
    const p = journeyProgress(c);
    if (!p.hasTarget) {
      const childWaypoints = waypoints.filter((w) => w.collectionId === c.id);
      const lt = tasks.filter((t) => t.collectionId === c.id && !t.waypointId);
      const li = items.filter((i) => i.collectionId === c.id && !i.waypointId);
      return (
        lt.reduce((s, t) => s + taskAmount(t, parentUnit), 0) +
        li.reduce((s, i) => s + itemAmount(i, parentUnit), 0) +
        childWaypoints.reduce((s, w) => s + waypointContribution(w, parentUnit), 0)
      );
    }
    if (p.unit === parentUnit) return p.completed;
    return p.pct >= 100 ? 1 : 0;
  }

  const goalCache = new Map<string, NodeProgress>();
  function goalProgress(g: Goal): NodeProgress {
    const cached = goalCache.get(g.id);
    if (cached) return cached;

    const unit = goalUnit(g);
    const target = unit === MINUTES_UNIT ? g.targetMinutes : g.targetMetric || 0;
    const hasTarget = target > 0;
    const childJourneys = collections.filter((c) => c.goalId === g.id);
    const childGoals = goals.filter((sg) => sg.parentId === g.id);
    // Legacy/edge case: a task linked straight to a Goal with no Journey at
    // all (goal creation has been Journey-only since spec 016, but old data
    // may still have this shape).
    const directLeaves = tasks.filter((t) => t.goalId === g.id && !t.collectionId);

    const completed =
      directLeaves.reduce((s, t) => s + taskAmount(t, unit), 0) +
      childJourneys.reduce((s, c) => s + journeyContribution(c, unit), 0) +
      childGoals.reduce((s, sg) => s + goalContribution(sg, unit, new Set([g.id])), 0);

    const result: NodeProgress = hasTarget
      ? { id: g.id, unit, hasTarget: true, target, completed, ...pctOf(completed, target) }
      : { id: g.id, unit, hasTarget: false, target: 0, completed, pct: 0, pctRounded: 0 };
    goalCache.set(g.id, result);
    return result;
  }

  // Sub-goal contribution mirrors journey/waypoint contribution, walking
  // Goal.parentId instead of collectionId. `seen` guards a malformed cycle,
  // matching the existing guards in goalStore's own chain walkers.
  function goalContribution(g: Goal, parentUnit: string, seen: Set<string>): number {
    if (seen.has(g.id)) return 0;
    const nextSeen = new Set(seen);
    nextSeen.add(g.id);

    const p = goalProgress(g);
    if (!p.hasTarget) {
      const childJourneys = collections.filter((c) => c.goalId === g.id);
      const childGoals = goals.filter((sg) => sg.parentId === g.id);
      const directLeaves = tasks.filter((t) => t.goalId === g.id && !t.collectionId);
      return (
        directLeaves.reduce((s, t) => s + taskAmount(t, parentUnit), 0) +
        childJourneys.reduce((s, c) => s + journeyContribution(c, parentUnit), 0) +
        childGoals.reduce((s, sg) => s + goalContribution(sg, parentUnit, nextSeen), 0)
      );
    }
    if (p.unit === parentUnit) return p.completed;
    return p.pct >= 100 ? 1 : 0;
  }

  return {
    goalProgress: (id: string): NodeProgress | undefined => {
      const g = goalById.get(id);
      return g ? goalProgress(g) : undefined;
    },
    journeyProgress: (id: string): NodeProgress | undefined => {
      const c = collectionById.get(id);
      return c ? journeyProgress(c) : undefined;
    },
    waypointProgress: (id: string): NodeProgress | undefined => {
      const w = waypoints.find((x) => x.id === id);
      return w ? waypointProgress(w) : undefined;
    },
  };
}

export type ProgressSelectors = ReturnType<typeof computeProgress>;

// Whether a task-creation surface should show a metric-quantity input, and
// which unit to label it with — checked across the whole Waypoint -> Journey
// -> Goal chain (not just the immediate Waypoint), since any node in that
// chain can be the one carrying a target+unit (a passive Waypoint under a
// unit-mode Goal still needs the field). First node with an explicit target
// wins the unit label; a unit-mode Goal with no explicit unitLabel at any
// level falls back to 'units'.
export function chainMetricContext(
  waypoint?: Waypoint,
  journey?: Collection,
  goal?: Goal
): { show: boolean; unitLabel: string } {
  const isUnitsGoal = goal?.metricType === 'units';
  const show = !!waypoint?.targetMetric || !!journey?.targetMetric || isUnitsGoal;
  const unitLabel = waypoint?.unitLabel || journey?.unitLabel || goal?.unitLabel || 'units';
  return { show, unitLabel };
}

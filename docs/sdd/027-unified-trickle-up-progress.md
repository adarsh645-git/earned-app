# 025 — Unified Trickle-Up Progress Engine

## Objective

Progress lived in three disconnected tracks that all fed off task
completion but never fed each other: Goal % (`completedMetric`/
`completedMinutes` vs target, mutated incrementally, driving milestone
dollar payouts), Journey % (completed-items/total-items, computed inline,
feeding nothing), and Waypoint % (a stored `completedMetric` counter that
borrowed the linked Goal's unit label). A single task's completion called
two parallel, disconnected progress functions — the Waypoint never rolled
into the Goal.

Rebuilds progress as one engine: a Task's completion is the only place a
raw amount is entered, and it trickles up the *visible* Goal → Journey →
Waypoint tree (plus the existing Goal.parentId sub-goal chain) via a single
rule, auto-decided by unit match — no manual per-node toggle. Also lets a
Waypoint or Journey own its own target + unit (previously only a Goal
could), so "Book A: 1000 pages" and "20 Books" can coexist as independent
progress nodes in the same tree.

## The Model

**One roll-up rule** between any child node and its parent:
- **Same unit** → child's completed amount **adds** into the parent
  (continuous partial credit — e.g. miles run, hours focused).
- **Different unit** → child contributes a discrete **+1** to the parent
  the instant it reaches 100% (e.g. finishing a 1000-page book counts as
  +1 toward a "20 books" Goal, never +1000).
- **No target set (passive)** → transparent: the node's own children roll
  straight through to whatever unit the *grandparent* asked for, as if the
  passive node didn't exist. This is what lets an un-targeted "series"
  Journey, or "week" Waypoint, be pure organization with zero progress math
  of its own.

**Engine = derived recompute, not a stored counter.** `computeProgress`
(`src/store/progress.ts`) is a pure function over the current
goals/collections/waypoints/tasks/items arrays; Goal/Journey/Waypoint % is
always freshly computed from `task.completed` + `task.metricProgress`, never
incrementally mutated. This structurally rules out the double-count and
`floor`-vs-`round` drift the old parallel apply/revoke calls were exposed to,
and makes completing, un-completing, editing, or deleting a task always
produce the exact same recomputed answer.

Validated against three real scenarios during design (all satisfied by the
one rule above, see `verify-progress.ts` run during implementation):
1. 20 books; a Journey per series (passive); a Waypoint per book (target in
   pages) — book completions discretely count toward the book total.
2. 30 mi/month; Waypoints = treadmill 15mi + outdoor 15mi — same-unit,
   continuous sum straight through a passive Journey.
3. 1000 hrs/year; a Journey per month, a Waypoint per week — same-unit sum
   all the way up.

## Data Schema / Interface Contracts

- `src/store/collectionStore.ts`: `Waypoint.unitLabel?: string` (falls back
  to the linked Goal's `unitLabel` when unset — same behavior as before,
  now just a fallback instead of the only option). `Collection.unitLabel?:
  string` / `Collection.targetMetric?: number` — a Journey is now optionally
  its own progress node. `Waypoint.completedMetric` is vestigial: the column
  stays (still synced) but is never written or read by new code.
  `applyWaypointProgress`/`revokeWaypointProgress` retired.
- `src/store/goalStore.ts`: `addProgress`/`removeProgress`/
  `stepCountAncestors`/`applyLeafProgress`/`revokeLeafProgress` retired,
  replaced by `reconcileGoalMilestones(goalId)` — the one place milestone
  economy is touched. Recomputes the goal's (and every ancestor's) % via the
  engine, diffs against `unlockedMilestones`, and awards/revokes
  `getMilestoneDollars` exactly as the old incremental path did (same
  floor-based gating, same `paysCurrency` single-payer rule, same
  idempotent award-once/revoke-once semantics). `completedMetric`/
  `completedMinutes` become a cosmetic/sync cache of the derived value,
  written by `reconcileGoalMilestones`, never read back as truth.
- `src/store/taskStore.ts`: `toggleTask` no longer computes or applies a
  progress amount — it flips `task.completed`, commits it, then resolves
  the owning Goal (`resolveGoalIdForTask`, new exported helper: own
  `goalId` or via `collectionId` → Journey's `goalId`) and calls
  `reconcileGoalMilestones` once. `collectionStore.toggleItemCompletion`
  mirrors the same pattern.
- `src/store/timerStore.ts`: `completeSession` (the focus-timer completion
  path, distinct from the manual checkbox) now also goes through
  `reconcileGoalMilestones`. Because a Bonus Time session's actual elapsed
  minutes can differ from the task's stored `estimatedMinutes`, the task's
  estimate is corrected to match reality before reconciling — otherwise the
  derived engine would recompute off a stale number. Side effect: a
  timer-completed task now correctly rolls into its Waypoint too, closing a
  pre-existing gap where the timer path only ever fed the Goal.
- New `src/store/progress.ts` (pure, zero runtime store imports — only
  `import type`, so it's safe to import statically everywhere with no
  circularity) and `src/hooks/useProgress.ts` (memoized wrapper for
  components, keyed on the five source array references).
- Migration `supabase/migrations/20260729000002_progress_node_units.sql`:
  `waypoints.unit_label`, `collections.unit_label`, `collections.target_metric`
  (all nullable, no backfill needed — unset = passive, matching every
  existing row's current organizational-only behavior exactly).
  `supabase/schema.sql` updated to match. `syncEngine.ts` pull + push
  mapping updated for all three new columns.

## UI Changes

- Task metric-amount input (`TaskDetailModal.tsx`, `TasksScreen.tsx`
  quick-add) now gates on the **picked Waypoint's own** target+unit first,
  falling back to a units-mode linked Goal when the task has no Waypoint —
  previously it only ever looked at the Goal.
- `JourneyDetailModal.tsx`: new Target/unit-label pills for both the
  Journey itself and each Waypoint (Waypoint's target-options list expanded
  to 200/500/1000 for book/mile/hour-scale targets); all progress bars
  (This Journey, Linked Goal, per-Waypoint) now read `useProgress()`
  selectors instead of inline math.
- `AnimatedGoalCard.tsx`, `GoalDetailModal.tsx`, `ProfileScreen.tsx`,
  `CollectionsScreen.tsx` (`GoalRow`/`JourneyRow`/inline Waypoint calc): all
  swapped from reading `goal.completedMetric`/`goal.completedMinutes`
  directly to the derived selector — no behavior change for a goal with no
  Journeys/Waypoints feeding it (same formula, same numbers), but now
  correctly reflects the trickle-up tree for goals that have them.

## Verification

- `verify-progress.ts` (pure-engine test against the actual shipped
  `progress.ts`, run via `npx tsx`): all 3 user scenarios plus edge cases
  (sub-goal chain +1-on-completion, direct-journey task with no waypoint,
  checklist-item flat contribution, and full completion/un-completion
  symmetry) — 15/15 pass.
- Real app (web, headless browser): built scenario 1 live — Goal "20 Books"
  (units, target 20, unit "books") → passive "Fantasy Series" Journey →
  Waypoint "Book A" (target 1000, unit "pages"). Confirmed the task
  metric-input field correctly switches its placeholder/gate from the
  Goal's unit ("books") to the Waypoint's own unit ("pages") the moment a
  Waypoint is picked. Completed a 50-page task → Waypoint showed exactly
  "50/1000 pages (5%)", Goal stayed at 0%. Completed a second 950-page task
  finishing the book → Waypoint hit 100%, Goal ticked to exactly "1/20
  books (5%)" — confirming the discrete +1-on-completion rule end-to-end,
  not +1000.
- `npx tsc --noEmit` clean. `npx expo export -p web` clean (bundling smoke
  test).
- [x] User confirms `20260729000002_progress_node_units.sql` has been run
      against the live Supabase project — verified via anon-key REST query:
      `waypoints.unit_label`, `collections.unit_label`,
      `collections.target_metric` all reachable (empty result, not a
      `42703` schema error).

## Amendment (2026-08-21) — the wiring above never actually landed

Picked this back up in a later session and found only `progress.ts`,
`useProgress.ts`, and the migration had survived — `goalStore.ts`,
`collectionStore.ts`, `taskStore.ts`, and `timerStore.ts` were all still on
the old incremental path (`addProgress`/`removeProgress`/
`stepCountAncestors`/`applyLeafProgress`/`revokeLeafProgress`/
`applyWaypointProgress`/`revokeWaypointProgress`), `Collection` never got
`unitLabel`/`targetMetric`, and zero components imported `useProgress`. The
"Verification" section above describes a real earlier pass, but its result
didn't survive into this branch. Redone this session:

- Retired all six old incremental functions; added
  `goalStore.reconcileGoalMilestones(goalId)` (recomputes via
  `computeProgress`, diffs `unlockedMilestones`, awards/revokes exactly as
  the old path did, walks the Goal's `parentId` chain, returns
  newly-unlocked info for toast feedback).
- `taskStore.ts`: new exported `resolveGoalIdForTask` helper; `toggleTask`
  and `collectionStore.toggleItemCompletion` now call
  `reconcileGoalMilestones` once after committing the completion flip,
  instead of the old apply/revoke calls.
- `timerStore.completeSession`: same reconcile call, task's
  `estimatedMinutes` corrected to the real elapsed time first (so the
  engine isn't reading a stale number) — this also fixes the pre-existing
  gap where a timer-completed task never fed its Waypoint, only its Goal.
- `Collection.unitLabel`/`targetMetric` added; `addCollection` accepts them;
  `JourneyDetailModal.tsx` gets a Target/Unit editor for the Journey itself
  (previously only Waypoints had one).
- Found and fixed a real staleness bug this caused:
  `JourneyDetailModal.tsx` was still reading `waypoint.completedMetric`
  directly — a field nothing writes anymore now that
  `applyWaypointProgress`/`revokeWaypointProgress` are gone. Swapped to
  `useProgress().waypointProgress(id)`.
- Found and fixed a real priority conflict: `utils/waypointUnit.ts`'s
  `resolveWaypointUnit` had a units-mode linked Goal *always* override a
  Waypoint's own `unitLabel` — directly contradicting this spec's own
  scenario 1 (a "pages" Waypoint under a "books"-mode Goal). Corrected to
  the engine's actual priority (Waypoint's own unit wins, Journey's own
  next, Goal only as the final fallback) and removed the now-wrong
  `isWaypointUnitGoalGoverned` unit-picker lock in `JourneyDetailModal.tsx`.
- `utils/taskCompletionGate.ts` swapped to the exported `chainMetricContext`
  (from `progress.ts`) instead of hand-rolling the same priority — also
  closes a real gap where a task linked directly to a Journey (no
  Waypoint) never gated on the Journey's own target, only a Waypoint's.
- Re-verified the pure engine standalone (`computeProgress`) against this
  doc's three original scenarios, un-completion symmetry, and the new
  Journey-as-its-own-node case — all pass. `npx tsc --noEmit` clean
  repo-wide.
- Initially left `AnimatedGoalCard.tsx`, `GoalDetailModal.tsx`,
  `ProfileScreen.tsx`, `CollectionsScreen.tsx` reading
  `goal.completedMetric`/`completedMinutes` directly — not a bug
  (`reconcileGoalMilestones` keeps those fields accurate), but a second
  source of truth trusting a cache instead of the live engine. Swapped all
  four to `useProgress().goalProgress(id)?.completed` in the same session
  once asked to close the gap — `tsc` stayed clean throughout.

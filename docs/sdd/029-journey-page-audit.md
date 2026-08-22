# 029 — Journey Page Audit: Goal Overcounting, Stale Progress, Pillar Inheritance, Task Interactivity

## Objective

Triggered by a live user report with a screenshot: a Goal targeting "20
books" showed **3/20** after the user finished exactly **1** book, and the
Journey's own progress bar showed **0/0 tasks (0%)** despite a completed
Waypoint sitting right above it. Investigated via `/grill-with-docs`
(interview + two research forks reading `progress.ts` and `goalStore.ts`
directly) rather than guessed at. Found four distinct, real gaps — one
economy-correctness bug, one display bug (in two locations), one staleness
bug, and one data-model gap (a rerun of the same theme as spec 028: nothing
enforces a Journey's Pillar matches its own linked Goal's Pillar) — plus
confirmed the Waypoint→Journey→Goal unit-cascade math itself (spec 027's
same-unit-adds / different-unit-discrete-+1 rule) is *not* the bug; it's
working as designed.

## Findings (Phase 0 — grilled with user, one question per finding)

### 1. Goal overcount (3 instead of 1) — real bug, fixed

Root cause: the Journey ("Stormlight Archive") is passive (no
`targetMetric`). Under a passive Journey, `journeyContribution()`
(`progress.ts`) summed **both** its Waypoints' contributions **and** any
general (non-Waypoint) Tasks directly on the Journey into the Goal's unit.
The Waypoint "Way of the Kings" hit 100% → +1 book (correct, discrete
rule). But two completed general Tasks ("Read 2 Chapters of way of the
kings", "Read Book") — progress *notes* about that same book, not separate
books — had no `metricProgress` set, so each defaulted to a flat +1 in the
parent's unit (`taskAmount`'s pre-existing "no metricProgress = +1" default,
correct for a genuine unwaypointed leaf, wrong here). 1 + 1 + 1 = 3.

**Decision**: once a Journey has one or more Waypoints, each Waypoint IS the
unit of completion (the book) — general Tasks under that same Journey no
longer independently roll up into the Goal. A Journey with *no* Waypoints
keeps today's behavior unchanged (its Tasks are the leaves).

### 2. "This Journey" / Journeys-list progress — display bug, two locations

Both `JourneyDetailModal.tsx`'s "This Journey" bar and
`CollectionsScreen.tsx`'s `JourneyRow` list-card compute their own passive-
Journey progress from checklist Items only (`collectionItems.filter(i =>
i.completed).length` / `collectionItems.length`) — never Tasks. Since spec
025 made "Add a task" inside a Waypoint create a real Task (not a
`CollectionItem`), this fallback has shown a stale/misleading number
(frequently 0/0) ever since, in both places. The engine's own
`waypointProgress()` passive branch already counts Tasks + Items correctly
at the Waypoint level — `journeyProgress()`'s equivalent branch did not.

**Decision**: fix `journeyProgress()`'s passive branch to count Tasks +
Items across the whole Journey (every Waypoint's leaves plus general ones),
mirroring `waypointProgress()`. Both UI surfaces read the fix from there
instead of recomputing their own (buggy) local version.

### 3. `Goal.completedMetric` staleness on delete/edit

`reconcileGoalMilestones` (writes `Goal.completedMetric`, unlocks/claws back
milestone $ payouts) fires on `toggleTask`, `toggleItemCompletion`, and
timer-session completion — but not on `taskStore.deleteTask` or
`taskStore.updateTask`. Deleting an already-completed task, or editing its
`metricProgress` after the fact, leaves the Goal's stored number frozen
until something unrelated happens to touch the same Goal's chain.

**Decision**: wire `reconcileGoalMilestones` into both. Scoped exactly as
found — `deleteTask` (when the deleted task was completed) and `updateTask`
(when the update touches `metricProgress`). Re-linking a task's
`collectionId`/`waypointId`/`goalId` after completion is a known, separate,
narrower residual gap — not fixed here (see Notes).

### 4. Journey Pillar doesn't inherit from its linked Goal

Same theme as spec 028: `Goal.pillarId` (spec 024) and `Collection.pillarId`
(spec 028) are both real fields, but nothing keeps them in sync — a Journey
linked to a Goal could independently carry a *different* Pillar than that
Goal, breaking "everything underneath them matches."

**Decision**: when a Journey is linked to a Goal, its Pillar is **forced**
to that Goal's Pillar — not independently pickable (the Pillar picker added
in spec 028 becomes read-only in this state, mirrors how the disabled-pill
pattern already works for Tasks under a Pillar-locked Journey). A standalone
Journey (no Goal) keeps its own independent, freely-editable Pillar. The
cascade runs both directions structurally: creating/relinking a Journey to a
Goal pulls that Goal's Pillar in immediately; reassigning a Goal's own
Pillar (via `GoalDetailModal`) cascades to every Journey linked to it,
which — via spec 028's existing `updateCollection` retag logic — cascades
further to that Journey's Tasks automatically. One write, whole chain
follows.

### 5. Waypoint-linked and general Tasks are read-only inside the Journey view

Confirmed via code read: a Task shown inside a Waypoint's card (or the
"General" bucket) in `JourneyDetailModal` has no tap-to-toggle, no edit, no
delete — contrast with checklist Items in the same card, which are fully
interactive. A Task created from the Journey view *does* show up on the
Tasks page (and vice versa — same record, not a sync) — but can only
actually be worked (toggled/edited/deleted) from the Tasks page.

**Decision**: full interaction, matching the Tasks page exactly — reuse
`AnimatedTaskRow` (the same component `TasksScreen`/`DashboardScreen` already
use) instead of the bespoke static rows, including the same
Waypoint-progress-quantity gate (`ProgressPromptModal`) on completion.

## Data Schema / Interface Contracts

- `src/store/progress.ts`:
  - `NodeProgress` gains `total: number` (0 for a `hasTarget: true` node's
    passive-display purposes is moot — `total` mirrors `target` there;
    meaningful specifically for the `hasTarget: false` passive display case).
  - `journeyProgress()`'s passive branch: now counts every Task + Item under
    the Journey (`collectionId` match, regardless of `waypointId`), not just
    top-level Items.
  - `journeyContribution()`'s passive branch: when the Journey has Waypoints,
    sums *only* `childWaypoints` contributions (general Tasks/Items
    excluded); when it has none, unchanged (sums general Tasks/Items
    directly, as today).
- `src/store/taskStore.ts`:
  - `deleteTask`: after removing, if the deleted task was completed, resolve
    its Goal via `resolveGoalIdForTask` and call `reconcileGoalMilestones`.
  - `updateTask`: after applying, if `updates` touches `metricProgress`,
    same resolve-and-reconcile.
- `src/store/collectionStore.ts`:
  - `addCollection` / `updateCollection`: when `goalId` is present (new or
    changed to a linked Goal), `pillarId` is derived from that Goal's
    `pillarId`, overriding any explicit `pillarId` passed in. Reuses
    `updateCollection`'s existing spec-028 task-retag side effect
    unchanged — it fires exactly the same whether the new `pillarId` came
    from an explicit pick or this derivation.
- `src/store/goalStore.ts`:
  - `updateGoal`: when `updates.pillarId` is present, cascades to every
    `Collection` with `goalId === id` via `useCollectionStore.getState().
    updateCollection(c.id, { pillarId: updates.pillarId })` (dynamic
    `require`, matching this file's existing `deleteGoal` pattern).
- `src/screens/CollectionsScreen.tsx`: "New Journey" form's Pillar chip-row
  (added in spec 028) now only renders/validates when `journeyLinkMode ===
  'none'` (standalone Journey) — linking to an existing or newly-created Goal
  derives the Pillar automatically.
- `src/components/JourneyDetailModal.tsx`:
  - Pillar `PillPicker` (spec 028) gains `disabled={!!collection.goalId}`.
  - "This Journey" passive-display branch reads `journeyProgressNode.
    completed`/`.total`/`.pctRounded` instead of its own local
    `completedCount`/`collectionItems.length` calc.
  - Waypoint-nested and General Task rows replaced with `AnimatedTaskRow`,
    wired to the same gated-toggle (`getRequiredUnitLabel` +
    `ProgressPromptModal`, mirroring `TasksScreen.tsx`) and an embedded
    `TaskDetailModal` for edit/delete, owned locally by this component.
- `src/screens/CollectionsScreen.tsx`'s `JourneyRow`: reads the same fixed
  `journeyProgress()` selector instead of its own local Items-only calc.

## Implementation Checklist

- [ ] `progress.ts`: `NodeProgress.total`, `journeyProgress` passive-branch
      fix (Tasks + Items), `journeyContribution` passive-branch fix
      (Waypoint-exclusivity when Waypoints exist)
- [ ] `JourneyDetailModal.tsx` + `CollectionsScreen.tsx` `JourneyRow`: read
      the fixed selector instead of local Items-only calcs
- [ ] `taskStore.ts`: `deleteTask`/`updateTask` reconcile wiring
- [ ] `collectionStore.ts`: `addCollection`/`updateCollection` Pillar
      derivation from linked Goal
- [ ] `goalStore.ts`: `updateGoal` Pillar-reassignment cascade to linked
      Journeys
- [ ] `CollectionsScreen.tsx`: New Journey form — Pillar chip-row gated to
      standalone Journeys only
- [ ] `JourneyDetailModal.tsx`: Pillar pill `disabled` when Goal-linked
- [ ] `JourneyDetailModal.tsx`: Waypoint/General Task rows → `AnimatedTaskRow`
      with full toggle/edit/delete, gated completion, embedded
      `TaskDetailModal`
- [ ] Typecheck (`npx tsc --noEmit`)
- [ ] End-to-end verification (same environment caveat as spec 028 — no
      headless-browser tool available; verify via bundler compile + careful
      read)

## Notes

- **Known residual gap, not fixed here**: re-linking an already-completed
  Task's `collectionId`/`waypointId`/`goalId` (moving it to a different
  Journey/Waypoint/Goal after the fact) doesn't reconcile either the old or
  new Goal's chain. Same failure class as finding #3, narrower trigger.
  Flagging per AGENTS.md rather than leaving it silently unhandled.
- The reported Journey also had its own explicit `unitLabel: "Pages"` set
  despite having no target — cosmetically implied it tracked pages even
  though the Goal rollup correctly uses "books" regardless. Not a math bug;
  no schema change needed, just noted as a contributor to the original
  confusion.

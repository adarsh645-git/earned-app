# SDD: Waypoint Units, Enforced Progress, Real Task Linking

## 1. Feature Overview
Doc 020 gave a units-mode Goal a free-text `unitLabel` and a Task an optional
`metricProgress` quantity. What it didn't give was a Waypoint (the Journey
sub-bucket a Task actually gets scoped to day-to-day) any unit of its own —
`JourneyDetailModal` only ever borrowed the parent Goal's `unitLabel`, and
fell back to a meaningless `"min"` for any Waypoint under a minutes-mode or
unlinked Goal. That's the concrete case that surfaced this: a finished
1,125-page book, tracked as a Waypoint, under a Journey with no units-mode
Goal to borrow a "pages" label from — there was no field anywhere to name
the unit, and nothing stopped the book from being checked off with a
meaningless `+1`. This adds a Waypoint-owned unit (deferring to the Goal's
when one governs), enforces entering the matching quantity before a
Waypoint-linked task can be completed, and fixes "Add a task" inside a
Waypoint card so it creates a real `Task` instead of a separate
`CollectionItem` that never reached the Tasks page.

## 2. Three-Lens Alignment (Phase 0 — resolved with user, via AskUserQuestion)
- **Economics**: zero new currency surface. `metricProgress` still never
  touches Hours/Dollars payout — that stays keyed to `estimatedMinutes`,
  unchanged from doc 020. No exploit path opened.
- **Psychology**: the completion-time gate is deliberate friction, but
  scoped tightly — it only fires once a Waypoint (or its governing Goal)
  actually has a unit configured, so it adds zero friction to any task that
  isn't opted in. Gating at *completion* rather than *creation* matches how
  reading/running/etc. actually works: you often don't know the exact
  quantity until you're done.
- **Architecture**: additive, backward-compatible columns (`IF NOT EXISTS`),
  no new table (so no new RLS policy), a single shared resolver
  (`resolveWaypointUnit`) so the "Goal governs when units-mode, else the
  Waypoint's own field" rule lives in exactly one place instead of being
  re-derived per component. Known, accepted gap: subtask-completion bubbling
  (`taskStore.ts` `toggleTask`, ~line 271) auto-completes a parent task by
  setting `completed: true` directly, without ever calling
  `applyWaypointProgress`/`applyLeafProgress` for that parent — pre-existing
  since doc 020 (a units-mode Goal-linked parent has the same gap), left
  unfixed here to keep this change scoped to what was asked.

**Decisions locked in with the user:**
- A Waypoint's unit **must match** its Journey's linked Goal when that Goal
  is units-mode (not independently overridable in that case). When there's
  no forcing Goal, the Waypoint gets its own selectable unit.
- Quantity entry is enforced **at completion**, not at task creation.
- The per-waypoint "Add a task" box now creates a real `Task`
  (`taskStore.addTask`) instead of a `CollectionItem`. The Journey-root
  (non-waypoint) "Add a task" box is untouched — out of scope.
- Backfilling unlogged progress (e.g. the finished book) uses the normal
  task flow — one wrap-up task, enter the quantity, mark complete. No
  separate manual "log progress" control.

## 3. Unit Type List
Preset via `PillPicker` (matches the existing fixed-list convention already
used for Target/Year/Month/Category pills in `JourneyDetailModal`):
`Pages`, `Minutes`, `Hours`, `Miles`, `Kilometers`, `Reps`, `Sessions`,
`Chapters`, `Dollars`, `Custom…` (reveals a free-text label input).

## 4. Data Schema / Interface Contracts
`src/store/collectionStore.ts` — `Waypoint` gains:
```ts
unitType?: string;   // preset key, or 'custom'
unitLabel?: string;  // resolved display label
```

New migration `supabase/migrations/20260730000001_waypoint_unit_type.sql`:
```sql
ALTER TABLE public.waypoints ADD COLUMN IF NOT EXISTS unit_type TEXT;
ALTER TABLE public.waypoints ADD COLUMN IF NOT EXISTS unit_label TEXT;
```
**Not yet run against production** — per the standing migration rule, cloud
sync of both fields won't work until this is pasted into the Supabase SQL
Editor.

`src/utils/waypointUnit.ts` (new) — single source of truth for "what unit
governs this Waypoint, if any":
```ts
resolveWaypointUnit(waypoint, collection, goals): string | undefined
// Goal's unitLabel (or 'units') when collection.goalId points at a
// metricType==='units' Goal; otherwise waypoint.unitLabel.
```

`src/utils/taskCompletionGate.ts` (new) — `getRequiredUnitLabel(task,
waypoints, collections, goals)`: returns the resolved unit label when
`task.waypointId` is set and that Waypoint has an enforced unit, else
`null`. Used identically by `TasksScreen.tsx` and `DashboardScreen.tsx` to
gate all three manual completion entry points (row checkbox in both
screens, `TaskDetailModal`'s own checkbox) — a single wrapped `onToggle`
per screen covers all three, since `TaskDetailModal` and its nested subtask
rows already call whatever `onToggle` their parent screen passes in.

`src/components/ProgressPromptModal.tsx` (new) — small modal (numeric
`TextInput` + Save/Cancel), visually matching `ConfirmModal`, shown instead
of completing when the gate blocks; submitting sets `metricProgress` via
`updateTask` then calls the real `toggleTask`.

## 5. Implementation Checklist
- [x] `Waypoint.unitType?`/`unitLabel?` in `collectionStore.ts`
- [x] Migration + `schema.sql` baseline + `syncEngine.ts` pull/push mapping
- [x] `src/utils/waypointUnit.ts` (`resolveWaypointUnit`)
- [x] `src/utils/taskCompletionGate.ts` (`getRequiredUnitLabel`)
- [x] `src/components/ProgressPromptModal.tsx`
- [x] `JourneyDetailModal.tsx`: Unit pill (locked when Goal governs, else
      preset+custom picker), Target switched from fixed presets to a free
      numeric `TextInput`, progress label uses `resolveWaypointUnit`,
      per-waypoint "Add a task" creates a real `Task`
- [x] `TaskDetailModal.tsx`: Progress field shown/labeled via
      `resolveWaypointUnit`, not Goal-only
- [x] `TasksScreen.tsx` + `DashboardScreen.tsx`: gated `onToggle` wrapper +
      `ProgressPromptModal` wiring; Waypoint-unit hint in quick-add
- [x] Typecheck (`npx tsc --noEmit`)

Two bugs surfaced only by driving the real app (not caught by `tsc`), both
fixed before calling this done:
- **`collectionStore.applyWaypointProgress`/`revokeWaypointProgress` never
  learned about a Waypoint's own unit.** They only switched from raw minutes
  to `metricProgress` when the linked *Goal* was units-mode — exactly the
  case this feature exists to cover (no Goal, or a non-units Goal) fell
  through to adding `estimatedMinutes` instead of the entered quantity. A
  Waypoint tracking 1125 pages was silently incremented by `25` (the task's
  time estimate) instead. Fixed by checking `goal?.metricType === 'units' ||
  !!wp.unitLabel` instead of the Goal alone.
- **`AnimatedTaskRow`'s checkbox plays its full "completed" animation
  (checkmark, strikethrough, confetti) optimistically, ~1 second before
  calling `onToggle`.** The completion gate lives inside that delayed
  `onToggle`, so a blocked completion still showed as done immediately —
  cancelling the progress prompt left the row visually stuck. Fixed by
  adding a `canComplete?: (task) => boolean` prop checked *before* the
  animation starts; when it returns false, `onToggle` fires immediately
  with no animation, letting the gate open the prompt with the row still
  showing unchecked. Threaded through `TasksScreen.tsx`, `DashboardScreen.tsx`,
  and `TaskDetailModal.tsx`'s subtask rows.

## 6. Verification (end-to-end, real app interactions via a headless-Chromium
driver against `npm run web`)
- [x] Waypoint under a Journey with no units-mode Goal: Unit pill is
  selectable (picked "Pages"), Target field accepted `1125` (previously
  capped at a 100-max preset).
- [ ] Waypoint under a units-mode Goal: Unit pill shows the Goal's label,
  locked (non-interactive) — implemented and type-checked, not click-tested
  live (lower risk: pure conditional display reusing the already-verified
  resolver, no new mutation path).
- [x] Task added from inside a Waypoint card ("Finished reading") appeared
  on the Tasks page and Dashboard, and nested under the Waypoint in
  `JourneyDetailModal` — confirms the `CollectionItem` → real `Task` fix.
- [x] Checking off a Waypoint-linked task with no quantity entered is
  blocked by `ProgressPromptModal` ("Progress Required... How many pages
  does..."); Cancel leaves the row correctly unchecked (no stuck
  false-complete state, post-fix); entering `1125` and confirming completes
  the task and brings the Waypoint to exactly `1125 / 1125 Pages (100%)`;
  un-completing and re-completing is symmetric.
- [ ] Migration **not yet run against production** — flagged to the user;
  do not consider this feature live until confirmed.

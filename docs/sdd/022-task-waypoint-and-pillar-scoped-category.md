# SDD: Task Waypoint Assignment & Pillar-Scoped Category Picker

## 1. Feature Overview
Two related task-creation improvements:
1. A Task can now belong to a specific **Waypoint** within its linked
   Journey (e.g. a "Fiction" Waypoint under a "Reading List" Journey), not
   just the Journey as a whole.
2. The Category (Tag) picker now scopes to a **Pillar** picked first,
   instead of always listing every tag across every Pillar.

Both are available in the two surfaces where task fields get set: the Tasks
screen's quick-add bar and the full-screen Task Detail view. The compact
task row and Dashboard's Quick Start shortcut are unchanged.

## 2. Three-Lens Alignment (Phase 0 — resolved with user)
- **Economics**: no currency/payout surface touched. `waypointId` is purely
  organizational — completion still pays out exactly as before, keyed to
  `estimatedMinutes`/`tagId`/`summitId`, unchanged.
- **Psychology**: Pillar-first narrows a growing tag list back down to a
  manageable, contextual set at the moment of picking — the same
  "progressive disclosure" principle behind Task Detail's own pill row.
  Auto-picking a sensible default Category on Pillar switch (rather than
  leaving Category blank) avoids a dead-end state.
- **Architecture**: reuses `PillPicker` exactly as-is (no changes to the
  shared component) — both new pickers are just another pill in the same
  row, following the exact `open`/`onToggle`/`onSelect` convention already
  used for Tag/Journey. Waypoint's derived progress calculation
  (`JourneyDetailModal.tsx`) already existed for `CollectionItem`s; this
  extends the same math to also count linked `Task`s rather than
  introducing a new calculation.
- **Decision**: build into quick-add + Task Detail only (not the compact
  row, not Dashboard's Quick Start) — confirmed with the user. Switching
  Pillar auto-picks that Pillar's first Category. Journey Detail's "Tasks"
  reverse-lookup is now grouped by Waypoint (nested under each Waypoint's
  own card, with an ungrouped "General"/"Tasks" bucket for the rest).

## 3. Data Schema / Interface Contracts
`src/store/taskStore.ts` — `Task` gains one optional field:
```ts
waypointId?: string;
```
`addTask`'s param type gains the same, passthrough like `collectionId`/
`summitId` (no default-fill logic — starts unset).

New migration `supabase/migrations/20260727000001_task_waypoint_id.sql`:
```sql
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS waypoint_id TEXT;
```
Plain column, no FK — matches the existing `collection_id`/`summit_id`
convention on this table (soft app-level references). `supabase/schema.sql`
baseline updated to match. `src/store/syncEngine.ts` threads `waypointId`
through both the Task pull mapping and `pushAllTasksToCloud`'s payload.

**⚠️ This migration is not auto-applied.** Per AGENTS.md's migration rule,
this file must be manually pasted into the Supabase SQL Editor and run
against the live project before cloud sync of `waypointId` will work.
Local-first behavior (create/edit/read on-device) works immediately
regardless.

`src/store/collectionStore.ts` — `deleteWaypoint(id)` now also unsets
`waypointId` on any `Task` pointing at the deleted Waypoint (mirrors what it
already did for `CollectionItem`), via the dynamic-`require('./taskStore')`
cross-store pattern `summitStore.ts`'s `deleteSummit` already uses.

## 4. Implementation Checklist
- [x] `Task.waypointId?: string` + `addTask` param type, `taskStore.ts`
- [x] `supabase/migrations/20260727000001_task_waypoint_id.sql` (not yet run
      against production — flag to user)
- [x] `supabase/schema.sql` baseline updated to match
- [x] `syncEngine.ts` pull mapping + `pushAllTasksToCloud` payload include
      `waypointId`
- [x] `collectionStore.ts`: `deleteWaypoint` unlinks Tasks too
- [x] `TasksScreen.tsx` quick-add expandable: new Pillar pill (first),
      Category pill scoped to it, new Waypoint pill (shown once a Journey
      with Waypoints is picked; cleared when the Journey changes)
- [x] `TaskDetailModal.tsx`: same two additions — `OpenPill` type extended
      to include `'pillar' | 'waypoint'`; new `pillars` prop (passed from
      `TasksScreen.tsx` and `DashboardScreen.tsx`)
- [x] `JourneyDetailModal.tsx`: Waypoint progress now counts completed
      linked Tasks alongside `CollectionItem`s; the "Tasks" section is
      grouped — Waypoint-linked tasks render nested (read-only) inside
      their Waypoint's card, everything else falls into a "General"/"Tasks"
      bucket below
- [x] Typecheck (`npx tsc --noEmit`)
- [x] End-to-end verification via headless browser (see below)

## 5. Implementation Notes
- "Current Pillar" for scoping isn't a stored field — it's derived: an
  explicit in-progress pick wins, otherwise it falls back to whichever
  Pillar the task's current tag (or, in quick-add, the last-used tag)
  belongs to. This keeps the pre-existing "Tag (last used)" default
  behavior intact when nobody touches the new Pillar pill at all.
- Switching Journey clears `waypointId` (a Waypoint only makes sense within
  its own Journey) — same pattern already used for clearing `summitId` on
  Journey change.
- Verified live in a headless browser: quick-add's Pillar pill correctly
  scopes the Category dropdown (confirmed a second Pillar's tag was
  excluded), switching Pillar auto-picked that Pillar's first Category,
  picking a Journey with Waypoints revealed the Waypoint pill, and the
  created task's `tagId`/`collectionId`/`waypointId` all landed correctly.
  Opening that Journey's detail view showed the task nested under its
  Waypoint with the Waypoint's percentage reflecting it.

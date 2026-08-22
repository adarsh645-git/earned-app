# 028 — Journey Pillar + Locked Task Category

## Objective

A Journey had no Pillar of its own — `Collection` carried no `pillarId` field
at all, and its Tasks could carry *any* Pillar's Tag regardless of what the
Journey was actually about (e.g. a "Fitness" Journey's task accidentally
tagged under "Gaming"). Reported as Bug #005 in `docs/bugs/BUGS.md`: "the
journey should be tagged to a pillar and the tasks that I create in them
should automatically be attached to that pillar."

Closes the gap: `Collection.pillarId`, required on every newly-created
Journey going forward, and once set, every Task inside that Journey — quick-
add, Task Detail, and Waypoint-scoped "Add a task" alike — is locked to that
Pillar's Tags, mirroring how a subtask is already locked to its parent
task's Pillar.

## Three-Lens Alignment (Phase 0 — resolved with user)

- **Economics**: a Pillar doesn't itself earn or burn currency — that's
  per-Tag — so this is a *consistency* constraint on which Tags a Journey's
  Tasks may draw from, not a new payout mechanic. Closes an existing
  inconsistency-exploit-adjacent gap (a Journey's tasks drifting across
  unrelated Pillars) rather than opening one.
- **Psychology**: auto-filling the Pillar on task creation removes a small
  recurring decision for a Journey the user has already mentally filed under
  one Pillar — friction reduction, reinforces habit. User explicitly chose
  the **hard-lock** trade-off over a soft/overridable default, accepting
  reduced flexibility (no off-Pillar task inside a Pillar-locked Journey) for
  guaranteed consistency.
- **Architecture**: `Goal.pillarId` (spec 024) already established the exact
  pattern to mirror — nullable column, `REFERENCES pillars(id) ON DELETE SET
  NULL`. Reused directly rather than inventing a new convention.
  `taskStore.addTask` gains the Journey's Pillar as another tier in its
  existing tagId default-fill chain (`task.tagId || parent?.tagId ||
  lastUsedTagId || ...`) rather than duplicating resolution logic across
  every task-creation call site (`TasksScreen.tsx` quick-add,
  `JourneyDetailModal.tsx`'s waypoint-scoped quick-add, `TaskDetailModal.tsx`).

### Decisions confirmed with user (AskUserQuestion, one at a time)

1. **Enforcement**: hard lock, not soft default — a Pillar-locked Journey's
   Tasks can only pick Tags within that Pillar (mirrors the existing subtask
   lock).
2. **Migration for existing Journeys**: required *going forward* only. New
   Journeys must pick a Pillar at creation (`CollectionsScreen.tsx`'s "New
   Journey" form). Existing Journeys stay unset — no guessed backfill; an
   unset Journey behaves exactly as before (no lock) until the user
   explicitly sets one via `JourneyDetailModal`.
3. **Retagging on Pillar set/change**: auto-retag every existing Task whose
   `collectionId` matches that Journey to the newly-set Pillar's first
   available Tag, immediately. Accepted trade-off: this can silently change
   an already-tagged task's earner/burner type going forward (its next
   completion pays out under the new Tag) — the user chose consistency over
   leaving stragglers untouched. Scope: direct `collectionId` matches only
   (covers both Waypoint-linked and general Journey tasks, since both carry
   `collectionId`); subtasks aren't touched directly — they don't carry their
   own `collectionId` and already inherit their parent's Tag at creation
   time only, an existing, separate behavior this doesn't change.

## Data Schema / Interface Contracts

- **Migration**: `supabase/migrations/20260822000001_collection_pillar_id.sql`
  — `ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS pillar_id TEXT
  REFERENCES public.pillars(id) ON DELETE SET NULL`. Nullable — existing
  Journeys keep working with no Pillar until set. **Must be run in the
  Supabase SQL Editor before/alongside this deploy**, per AGENTS.md's
  migration-tracking rule.
- `src/store/collectionStore.ts`: `Collection.pillarId?: string`.
  `addCollection`'s param type gains the same, passthrough (no default-fill —
  starts unset unless explicitly passed, matching `goalId`).
- `src/store/taskStore.ts`: `addTask`'s tagId default-fill chain gains one
  more tier — when `task.collectionId` resolves to a Pillar-locked Journey
  and no explicit `tagId` was given, defaults to that Pillar's first
  non-archived Tag (ahead of the app-wide `lastUsedTagId` fallback, behind an
  explicit pick or a subtask's inherited `parent?.tagId`). Resolves
  `collectionStore` via the existing lazy `require('./collectionStore')`
  pattern (`toggleTask` already does this) to avoid a circular import at
  module-eval time.
- `src/store/collectionStore.ts`: `updateCollection` — when `pillarId`
  changes to a new value, retags every Task with a matching `collectionId`
  to the new Pillar's first Tag (dynamic `require('./taskStore')`, same
  cross-store pattern `deleteWaypoint` already uses). No-op when the Journey
  has no Tasks yet, or when clearing `pillarId` back to unset (retag only
  fires on set-to-a-value).
- `src/store/syncEngine.ts`: `pillar_id` mapped on both the Collections pull
  and `pushAllCollectionsToCloud` payload — omitting either side silently
  drops the field on every cloud round-trip (spec 018's failure class).
- `src/screens/CollectionsScreen.tsx`: new required Pillar chip-row in the
  "New Journey" form (reuses the exact visual pattern already used for
  `newGoalPillarId`'s Pillar row), validated the same way as the existing
  Goal-title/Pillar checks in `handleSaveJourney`.
- `src/components/JourneyDetailModal.tsx`: new Pillar `PillPicker` in the
  header row (alongside Category/Goal), so an existing unset Journey can
  have one set, or an already-set one reassigned.
- Task-creation surfaces locked to the Journey's Pillar once set:
  - `TasksScreen.tsx` quick-add: picking a Journey with a `pillarId` now also
    sets `quickAddPillarId` + jumps `quickAddTagId` to that Pillar's first
    Tag (mirrors the existing explicit-Pillar-pick behavior), and the Pillar
    pill itself becomes non-interactive while that Journey is selected.
  - `JourneyDetailModal.tsx`'s waypoint-scoped `handleQuickAddWaypointTask`
    already passes `collectionId` — no call-site change needed, since the
    lock lives in `taskStore.addTask` itself.
  - `TaskDetailModal.tsx`: Tag pill options scoped to the linked Journey's
    Pillar (when set) instead of the task's own current-tag pillar, and the
    Pillar pill (if shown there) becomes non-interactive under the same
    condition.

## Implementation Checklist

- [x] Migration `20260822000001_collection_pillar_id.sql` (nullable, `ON
      DELETE SET NULL`)
- [x] `supabase/schema.sql` baseline updated to match
- [x] `Collection.pillarId` field, `collectionStore.ts`
- [x] `updateCollection` retags matching Tasks on Pillar set/change,
      `collectionStore.ts`
- [x] `taskStore.addTask` tagId default-fill gains the Journey-Pillar tier
- [x] `syncEngine.ts` pull + push `pillar_id` mapping for Collections
- [x] `CollectionsScreen.tsx`: required Pillar chip-row in "New Journey" form
      + validation
- [x] `JourneyDetailModal.tsx`: Pillar picker in header; locks task-creation
      pillar scope once set
- [x] `TasksScreen.tsx` quick-add: Journey pick locks the Pillar pill
      (`PillPicker` gained a `disabled` prop for this)
- [x] `TaskDetailModal.tsx`: Tag pill scoped/locked to linked Journey's Pillar
- [x] Typecheck (`npx tsc --noEmit`) — clean after every phase
- [ ] End-to-end interactive verification — **not done**: this environment
      has no headless-browser tool (`chromium-cli` absent, `playwright` not
      installed and not added as a new dependency for a one-off check).
      Verified instead that the dev server's live Metro bundler (already
      running against this repo) recompiled every changed file with no
      transform/syntax errors — confirmed by fetching the served bundle and
      checking each file compiled in cleanly. Flagging per AGENTS.md's "verify
      visually in a real browser" rule rather than claiming full coverage.
- [x] User confirms `20260822000001_collection_pillar_id.sql` has been run
      against the live Supabase project (independently re-verified via
      anon-key REST query — `collections.pillar_id` exists, no
      missing-column error)

## Notes

- Deleting a Pillar unlinks Journeys (sets `pillar_id` NULL, same as Goals) —
  never deletes the Journey.
- `docs/sdd/024-goal-pillar-hierarchy.md` left an open checklist item ("User
  confirms `20260727000003_goal_pillar_id.sql` has been run against the live
  Supabase project") — flagged separately to the user; this spec's migration
  is independent of it (different table) but both are still outstanding
  confirmations.

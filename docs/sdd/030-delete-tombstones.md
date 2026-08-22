# 030 — Delete Tombstones (Fixes Deleted Records Resurrecting on Reload)

## Objective

Live bug report: a deleted Task came back after reload. Root cause traced,
not guessed at — this is a pre-existing gap in the sync engine, unrelated to
the day's earlier changes, and it affects every deletable entity type
identically, not just Tasks.

## Root Cause

Deleting a record is local-optimistic: the id is removed from local state,
and a cloud `DELETE` fires fire-and-forget (never awaited by the caller).
`pullCloudData` runs fresh on every app mount — including immediately on
reload — and merges cloud rows into local state via `mergeById`, which has
no concept of "this id was intentionally deleted, just not confirmed gone
from the server yet." It only ever adds/overwrites from the cloud side.
If the DELETE hasn't committed server-side by the time the next pull runs
(or if it silently failed), the row comes right back. Reload is the
single most common trigger, since it's exactly when a fresh pull always
runs. Ruled out local-storage write timing as an alternate cause —
`AsyncStorage.setItem` on web is effectively synchronous.

The identical pattern (delete-then-fire-and-forget-cloud-delete, merge with
no tombstone) exists for all six deletable entity types: Tasks, Rewards,
Goals, Collections, Waypoints, and Collection Items — confirmed with the
user this should be fixed everywhere in one pass, not just for Tasks.

## Fix: Local Tombstones

Each of the four stores that own a deletable entity (`taskStore`,
`rewardStore`, `goalStore`, `collectionStore`) gains a persisted
`pendingDeletes: Record<string, number>` (id → deleted-at epoch ms).
`collectionStore` shares one map across Collections/Waypoints/Items — ids
are globally unique uuids, no collision risk.

- **On delete**: the deleted id(s) — including any cascade removals (a
  parent task's subtasks, a deleted Goal's sub-goals, a deleted Collection's
  Waypoints/Items) — are added to `pendingDeletes` in the same `set()` call
  that removes them from the entity array.
- **On pull** (`mergeById` in `syncEngine.ts`): gains an optional
  `pendingDeleteIds: Set<string>` parameter — any cloud row whose id is in
  that set is skipped, never merged back in, regardless of what the cloud
  still has.
- **On confirmed cloud delete**: every `deleteXFromCloud` function in
  `syncEngine.ts` now returns `Promise<boolean>` (previously implicit
  `undefined` always, since the internal try/catch never rethrows) — `true`
  on confirmed success (or trivially when there was nothing to delete /
  sync isn't configured), `false` on failure. The `useCloudSync` subscribe
  callbacks that fire these now chain `.then(ok => ok &&
  store.getState().clearPendingDeletes(ids))` — the tombstone is only
  cleared once the server has actually confirmed the row is gone. A failed
  delete leaves the tombstone in place, which is exactly the safe default:
  the row stays hidden locally and won't resurrect, and the existing
  `reportResult`/sync-health-indicator (spec 018) machinery still surfaces
  the failure through the normal channel.

### Addendum — "confirmed" wasn't actually confirmed (fixed same day)

First pass judged success purely by "the Supabase call didn't throw." That's
not sufficient: when RLS's `USING` clause on a DELETE policy excludes a row,
Postgrest doesn't error — the statement matches and deletes 0 rows and
resolves *normally* (confirmed straight from `@supabase/postgrest-js`'s own
source/docs: "only rows visible through SELECT policies are deleted... by
default no rows are visible"). A delete silently blocked that way would
still report success and clear the tombstone, and the very next pull
resurrects the row right back — same bug, one layer deeper, and exactly
what the user hit immediately after the first fix shipped.

Fix: every `deleteXFromCloud` call now passes `{ count: 'exact' }` and
compares the returned `count` against the number of ids requested — only a
count match is treated as `ok`/tombstone-clearable. A mismatch (silently
blocked by RLS, or the row was already gone) leaves the tombstone in place,
same as a thrown error.

No pruning/expiry was added for old tombstones — the overwhelming majority
clear within one sync round-trip, and at this app's personal-use scale an
unbounded (if rare) leftover entry has no meaningful cost. Flagged here
rather than silently decided.

## Data Schema / Interface Contracts

- `src/store/taskStore.ts`: `pendingDeletes: Record<string, number>` +
  `clearPendingDeletes(ids)`; `deleteTask` tombstones the task and any
  removed subtasks.
- `src/store/rewardStore.ts`: same pattern; `deleteReward` tombstones the id.
- `src/store/goalStore.ts`: same pattern; `deleteGoal` tombstones the goal
  and any removed sub-goals.
- `src/store/collectionStore.ts`: same pattern (one shared map);
  `deleteCollection` tombstones the collection plus its cascaded
  Waypoints/Items, `deleteWaypoint` and `deleteItem` tombstone their own id.
- `src/store/syncEngine.ts`:
  - `mergeById` gains the `pendingDeleteIds` parameter.
  - Every `pullCloudData` merge for a deletable entity type passes
    `new Set(Object.keys(store.getState().pendingDeletes))`.
  - All six `deleteXFromCloud` functions return `Promise<boolean>`.
  - All six `useCloudSync` subscribe callbacks clear the tombstone on
    confirmed success.

No new Supabase table/column — this is purely local sync-plumbing state,
never pushed to the cloud.

## Implementation Checklist

- [x] `taskStore.ts`: `pendingDeletes` + `clearPendingDeletes`, `deleteTask`
      tombstones removed ids
- [x] `rewardStore.ts`: same pattern for `deleteReward`
- [x] `goalStore.ts`: same pattern for `deleteGoal` (incl. sub-goals)
- [x] `collectionStore.ts`: same pattern for `deleteCollection` (incl.
      cascaded Waypoints/Items), `deleteWaypoint`, `deleteItem`
- [x] `syncEngine.ts`: `mergeById` respects `pendingDeleteIds`; every
      relevant `pullCloudData` merge passes it; all six `deleteXFromCloud`
      functions return `Promise<boolean>`; all six subscribe callbacks
      clear the tombstone on confirmed success
- [x] Typecheck (`npx tsc --noEmit`) — clean after every phase
- [ ] End-to-end verification (same environment caveat as specs 028/029 —
      no headless-browser tool available; verified via bundler compile).
      Worth a manual check: delete a task, reload immediately (before the
      network round-trip could plausibly finish), confirm it stays deleted.

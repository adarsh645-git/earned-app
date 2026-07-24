# SDD: Cloud Sync Data Loss Fixes

## 1. Feature Overview
Fixes two data-integrity bugs in `src/store/syncEngine.ts`, both reported by the user:

1. Newly-added taxonomy tags/pillars would disappear after re-authenticating (including automatic token refresh, not just manual login).
2. Items added via the Store's Entertainment tab would vanish from there and reappear as Pyramid Targets on the Profile screen.

## 2. Root Causes
- **Dropped `type` field on macro goals**: `pushAllMacroGoalsToCloud` never sent the `type` field (DB column `goal_type`), and `pullCloudData`'s macro-goals mapping never read it back. Every cloud round-trip (which fires automatically via the Realtime `postgres_changes` subscription right after any local push) silently reset every macro goal's `type` to `undefined`, which downstream filters (`Dashboard`, `Store`) treat as `'productive'`. Entertainment projects thus reflowed into the productive bucket.
- **Unfiltered Pyramid list**: `ProfileScreen.tsx`'s "Macro Targets (The Pyramid)" section rendered *all* macro goals with no type filter, unlike `DashboardScreen`/`StoreScreen` which already filter correctly. This is where the corrupted-type goals became visible.
- **Destructive pull overwrite**: `pullCloudData` replaced local arrays wholesale with the cloud snapshot (`setState({ tags: cloudTags })`) instead of merging. Pushes are fire-and-forget (not awaited). Since `useCloudSync`'s effect depends on `[user]`, and Supabase's `onAuthStateChange` produces a new `user` object reference on every auth event — including automatic `TOKEN_REFRESHED`, not just explicit login — the sync effect can re-run and pull shortly after a local add, racing the in-flight push. A pull that resolves before the push commits wipes out the just-added item.

## 3. Fix
- `syncEngine.ts`: `pushAllMacroGoalsToCloud` now sends `goal_type: g.type || 'productive'`; `pullCloudData`'s macro-goals mapping now reads `type: g.goal_type || 'productive'`.
- `syncEngine.ts`: added `mergeById<T extends { id: string }>(local, cloud)` — merges cloud rows into the local array by id (cloud wins per-id, since it's confirmed-synced) instead of truncating to the cloud snapshot. Applied to every entity `pullCloudData` fetches: tasks, pillars, tags, rewards, macro goals, collections, sub-goals, items.
- `ProfileScreen.tsx`: the Pyramid section now filters to `!type || type === 'productive'`, matching the convention already used in `DashboardScreen`/`StoreScreen`.

## 4. Known Limitations (not fixed here, flagged for transparency)
- **No delete-tombstone mechanism.** Nothing in the sync layer tracks deletions — a locally-deleted item that was already pushed to the cloud will reappear on the next pull, with or without this fix. Pre-existing, not reported by the user, out of scope.
- **`MacroGoal.parentId` and `MacroGoal.category` are not synced at all** (push/pull never included them), and unlike `type`, the `macro_goals` table has **no columns for them** — fixing this would require an actual schema migration, not just a code change. Sub-project hierarchies and entertainment-project categories (game/movie/TV/etc.) are silently dropped on any cloud round-trip today. Flagged for a follow-up if the user wants it addressed.

## 5. Task Checklist
- [x] Add `mergeById` helper to `syncEngine.ts`
- [x] Fix macro goal `type`/`goal_type` push + pull
- [x] Replace all destructive overwrites in `pullCloudData` with `mergeById`
- [x] Filter `ProfileScreen.tsx`'s Pyramid list to productive-only
- [x] Typecheck (`npx tsc --noEmit`)

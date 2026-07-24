# 015 — Task→Journey Linking & Compact Task Creation

## Objective

Tasks had no way to attach to a Journey — the add-task form's "Link to Pyramid Goal" picker was a flat, unfiltered list of every macro goal (productive and entertainment mixed, root goals and chain sub-goals mixed), with no Journey context at all. Task creation was also a full-page form takeover, out of step with the compact-modal pattern (`QuickStartModal`) already proven elsewhere in the app.

## User Flow

1. Tapping **Add Task** opens a centered, compact modal (not a full-page navigation) — title autofocuses immediately.
2. A single **Link Progress** picker replaces the old flat goal list: horizontal pills for eligible Journeys (matching the task's earner/burner economic type, or goalless/type-neutral Journeys) followed by standalone root goals not already reachable through a Journey.
3. Picking a Journey that has a linked macro goal **auto-links that goal too** — one tap sets both `collectionId` and `macroGoalId`, so progress actually cascades into the chain/currency system, not just a cosmetic label.
4. Picking a goalless Journey sets `collectionId` only (no progress link, tag persists).
5. Picking a standalone goal clears `collectionId`. "None" clears both.
6. The same `LinkProgressPicker` appears in `EditTaskModal`, so an existing task's link can be changed after creation, not just at creation time.

## Data Schema / Interface Contracts

- `tasks.collection_id TEXT` (nullable) — new column, migration `20260725000001_task_collection_link.sql`, mirrored in `supabase/schema.sql`.
- `Task.collectionId?: string` (`src/store/taskStore.ts`).
- `syncEngine.ts`: `collection_id` included in both push payload and pull mapping for tasks, alongside existing `macro_goal_id` handling.

## Implementation Checklist

- [x] Migration + schema: `collection_id` on `tasks`
- [x] `Task.collectionId` added to `taskStore.ts`; `addTask`/`updateTask` pass it through generically
- [x] `collection_id` synced in `syncEngine.ts` (push + pull)
- [x] `src/utils/categoryIcons.tsx` extracted (shared `CategoryVectorIcon`, de-duplicated from `CollectionsScreen.tsx`)
- [x] `src/components/LinkProgressPicker.tsx` — shared Journey/goal picker with auto-link semantics
- [x] `TasksScreen.tsx` — full-page add form replaced with a compact centered `Modal` (`QuickStartModal`-style card), wired to `LinkProgressPicker`, `feedback()` on selection/submit
- [x] `EditTaskModal.tsx` — `LinkProgressPicker` added for edit-time parity, `macroGoalId`/`collectionId` now included in `onSave` updates

## Notes

- Chain sub-goals are intentionally excluded from the standalone-goal list — picking a sub-goal directly would bypass its Journey and confuse the single-payer cascade model; sub-goal progress should always flow via its Journey.
- Same manual-migration-before-merge ordering discipline as prior schema-touching PRs this session: the sync push payload includes `collection_id` immediately, so the column must exist before merge.

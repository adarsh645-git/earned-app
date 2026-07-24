# 016 — Summit/Waypoint Rename & Journey-Only Goal Linking

## Objective

Three changes, decided via Phase 0 brainstorming:

1. **"Pyramid" → "Summit"**: one consistent term replacing "Pyramid" everywhere — UI copy, the `MacroGoal` type, `macro_goals` table, `macroGoalId` fields — instead of code and product language using two different words.
2. **"Quest"/"RPG" → "Waypoint"**: `JourneySubGoal` and all Quest/Sub-Quest copy become "Waypoint," pairing with the (kept, unchanged) "Journey" name under a consistent travel metaphor.
3. **Journey-only goal linking**: a long-term goal (Summit) can currently be created two ways — standalone (no Journey involved) or wrapped in a Journey. Collapsing to one path removes decision-fatigue and the redundant three-screen flow (make goal → make Journey → link them) previously required to get a task that both organizes under a Journey and progresses a target.

## User Flow

1. **Creating a goal**: only entry point is "New Journey" (`CollectionsScreen.tsx`). Its linked-goal picker becomes a 3-way choice — None / Link Existing Summit / Create New Summit (inline fields: Title, Time-or-Count, Target, Horizon, Contributes-To). The standalone "New Pyramid Target" form on Profile is removed.
2. **Task creation**: `LinkProgressPicker` shows only Journey pills (auto-linking the Journey's Summit, unchanged from spec 015) + "None" — the standalone-goal fallback is removed, since every Summit now has a Journey.
3. **Existing data**: any Summit that predates this change and has no Journey gets one auto-created on first load (`title = Summit.title`, `category = 'general'`), so nothing already-created becomes unreachable from task creation.
4. **Everywhere else**: "Pyramid" → "Summit", "Quest"/"Sub-Quest" → "Waypoint" in all live UI copy. Historical `docs/sdd/*.md` files are left as written (point-in-time design record, not living copy).

## Data Schema / Interface Contracts

- DB: `macro_goals` → `summits`; `summits.goal_type` → `summit_type`; `tasks.macro_goal_id` → `summit_id`; `collections.macro_goal_id` → `summit_id`; `journey_sub_goals` → `waypoints`; `collection_items.sub_goal_id` → `waypoint_id`. Migration: `supabase/migrations/<ts>_rename_summit_waypoint.sql`, applied before merge (existing convention from spec 015).
- `src/store/summitStore.ts` (renamed from `macroGoalStore.ts`): `Summit` (was `MacroGoal`), `SummitType`, `useSummitStore`, `summits`, `addSummit`/`updateSummit`/`deleteSummit`.
- `src/store/taskStore.ts`, `src/store/collectionStore.ts`: `summitId` (was `macroGoalId`).
- `src/store/collectionStore.ts`: `Waypoint` (was `JourneySubGoal`), `waypoints`, `addWaypoint`/`updateWaypoint`/`deleteWaypoint`, `CollectionItem.waypointId`. One-time `journeyBackfillApplied` migration action.
- `src/store/economyStore.ts`: `completedSummitsCount`, `incrementCompletedSummits`.
- `CollectionCategory`: `'other'` relabeled `'general'` (value + display), no new enum member.

## Implementation Checklist

- [ ] Migration + `supabase/schema.sql` baseline updated
- [ ] `macroGoalStore.ts` → `summitStore.ts` rename (type, store, actions)
- [ ] `summitId` field rename in `taskStore.ts` / `collectionStore.ts`
- [ ] `JourneySubGoal` → `Waypoint` rename + one-time orphan-Summit → auto-Journey backfill
- [ ] `economyStore.ts` `completedSummitsCount` rename
- [ ] `syncEngine.ts` table/column mapping updates (push + pull)
- [ ] Component renames: `EditMacroGoalModal.tsx` → `EditSummitModal.tsx`, `AnimatedMacroGoalCard.tsx` → `AnimatedSummitCard.tsx`, all import sites updated
- [ ] `CollectionsScreen.tsx`: 3-way linked-goal picker (None/Existing/Create New) with inline Summit fields
- [ ] `ProfileScreen.tsx`: standalone creation form removed
- [ ] `LinkProgressPicker.tsx`: standalone-goal fallback removed
- [ ] Category `'other'` → `'general'` relabel
- [ ] Copy pass: Pyramid → Summit strings
- [ ] Copy pass: Quest/RPG → Waypoint/Journey strings
- [ ] `npx tsc --noEmit` clean + grep sweep confirms no residual identifiers in `src/`/`supabase/`

## Notes

- Store's entertainment-goal creation (`StoreScreen.tsx`) has the identical standalone-form pattern and was explicitly left out of this pass — flagged as a natural follow-up, not done here.
- Milestone-tier naming (`getMilestoneDollars`, `UnlockedMilestoneInfo`, the 25/50/75/100 badges) is unrelated to the Summit rename and stays as-is — it's progress *within* a Summit, not the Summit itself.

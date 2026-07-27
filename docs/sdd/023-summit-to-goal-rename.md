# 023 — Summit → Goal Rename

## Objective

Full-stack rename: "Summit" → "Goal" everywhere — TypeScript types, the
Zustand store, DB tables/columns, component names, and all UI copy. Spec 016
renamed "Pyramid" → "Summit" to pair it with the new Journey/Waypoint travel
metaphor, but "Summit" (a mountain-climbing image) never actually cohered
with "Journey"/"Waypoint" (a road-trip image). "Goal" is metaphor-neutral —
the destination a Journey moves toward, passing Waypoints along the way —
and it also resolves an existing naming mismatch: `GoalDetailModal` (spec
021) is already the detail/edit view for a Summit, so this rename makes the
component's name finally match what it edits.

Journey and Waypoint naming are unaffected — out of scope for this pass.

## User Flow

No behavioral change. This is a like-for-like identifier/copy rename:
anywhere a screen currently reads "Summit" (buttons, headers, empty states,
picker labels) now reads "Goal"/"Goals". No new screens, fields, or flows.

## Data Schema / Interface Contracts

Confirmed live state: migration `20260725000002_rename_summit_waypoint.sql`
has already been run against production, so the DB currently has `summits`,
`summits.summit_type`, `tasks.summit_id`, `collections.summit_id`, and
`waypoints` (unaffected). This migration renames from that confirmed state:

- DB: `summits` → `goals`; `goals.summit_type` → `goals.goal_type`;
  `tasks.summit_id` → `tasks.goal_id`; `collections.summit_id` →
  `collections.goal_id`. RLS policies renamed to match (`"Users can view own
  summits"` → `"Users can view own goals"`, etc.). Migration:
  `supabase/migrations/20260727000002_rename_summit_to_goal.sql`, guarded/
  idempotent (checks `information_schema` before each step, matching the 016
  migration's defensive pattern) — **must be run in the Supabase SQL Editor
  before/alongside this deploy**, per AGENTS.md's migration-tracking rule.
- `src/store/summitStore.ts` → `src/store/goalStore.ts`: `Summit` → `Goal`,
  `SummitType` → `GoalType`, `useSummitStore` → `useGoalStore`, `summits` →
  `goals` (state field), `addSummit`/`updateSummit`/`deleteSummit` →
  `addGoal`/`updateGoal`/`deleteGoal`, and all helper fns
  (`getChainDepth`/`getDescendantIds`/`getChainRoot`/`getChainTrail`/
  `getEligibleParents`/`getMilestoneDollars`) keep their names (already
  goal-agnostic) but their `summits: Summit[]` params become `goals: Goal[]`.
  Zustand persist `name: 'earned-macro-storage'` stays unchanged — no
  storage-key migration, matching 016's precedent (renaming the identifier,
  not the local-storage bucket, avoids orphaning offline users' unsynced
  data).
- `src/store/taskStore.ts`, `src/store/collectionStore.ts`: `summitId` →
  `goalId`.
- `src/store/economyStore.ts`: `completedSummitsCount` →
  `completedGoalsCount`, `incrementCompletedSummits` → `incrementCompletedGoals`.
- `src/components/AnimatedSummitCard.tsx` → `AnimatedGoalCard.tsx`, all
  import sites updated.
- `src/store/syncEngine.ts`: push/pull table+column mapping updated
  (`summits`→`goals`, `summit_type`→`goal_type`, `summit_id`→`goal_id`).

## Implementation Checklist

- [x] Migration `20260727000002_rename_summit_to_goal.sql` written (guarded)
- [x] `supabase/schema.sql` baseline updated to the post-rename shape
- [x] `summitStore.ts` → `goalStore.ts` rename (type, store, actions)
- [x] `goalId` field rename in `taskStore.ts` / `collectionStore.ts`
- [x] `economyStore.ts` `completedGoalsCount`/`incrementCompletedGoals` rename
- [x] `syncEngine.ts` table/column mapping updates (push + pull)
- [x] `AnimatedSummitCard.tsx` → `AnimatedGoalCard.tsx` rename + import sites
- [x] Copy pass: Summit → Goal strings across screens/components
- [x] `npx tsc --noEmit` clean + grep sweep confirms no residual `[Ss]ummit`
      identifiers in `src/`
- [x] `npx expo export -p web` verified clean (bundling smoke test)
- [x] Zustand `persist` migrations added (`version: 1` + `migrate`) in
      `goalStore.ts`, `economyStore.ts`, `taskStore.ts`, `collectionStore.ts`
      — a plain field rename inside a persisted store silently orphans
      existing local data (the array itself, the discipline-score counter,
      and every task/collection's goal link) without one; not part of the
      original scope call above but a direct consequence of the "full
      rename" choice, so it's covered under the same pass
- [x] User confirms migration has been run against the live Supabase project
      — verified via anon-key REST query: `goals`/`goal_type` reachable,
      `tasks.goal_id`/`collections.goal_id` reachable, `public.summits` 404s

## Notes

- Historical migration files (`20260725000002_rename_summit_waypoint.sql`,
  `20260726000002_summit_unit_label_and_task_metric_progress.sql`, etc.) are
  a record of what ran at the time and are left unedited, per the 016
  precedent — only `schema.sql` (the living baseline) and a new migration
  file change.
- `docs/sdd/*.md` historical specs (016–021) are left as written — a
  point-in-time design record, not living copy.
- Originally numbered 022; renumbered to 023 on merge with `main`, which had
  independently claimed 022 for `022-task-waypoint-and-pillar-scoped-category.md`.
  Same reason the migration moved from `20260727000001` to `20260727000002` —
  `main`'s `20260727000001_task_waypoint_id.sql` (unrelated: adds
  `tasks.waypoint_id`) claimed that timestamp first.

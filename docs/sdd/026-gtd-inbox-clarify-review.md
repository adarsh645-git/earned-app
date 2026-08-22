# 026 — GTD Inbox, Clarify, and Weekly Review

Backlog: [`docs/ideas/BACKLOG.md` #002](../ideas/BACKLOG.md). Terminology reference: [`CONTEXT.md`](../../CONTEXT.md).

Aligns the Tasks/Journeys system with GTD's five stages (Capture, Clarify, Organize, Reflect, Engage) without changing Organize (Journey → Waypoint → Task stays as-is) or Engage beyond one filter. Design settled via a grilling session in-conversation; TickTick's official GTD implementation (`docs/research/ticktick-gtd-ui.md`) independently validated all three new surfaces — none of it pushed back on the plan below.

## Feature Objectives & User Flow

1. **Capture** — `Task.tagId` becomes optional. Quick-add stops forcing a pillar/tag choice at creation; a task with no tag is implicitly "in the Inbox." No new capture UI.
2. **Clarify** — a new collapsible "Inbox" section at the top of `TasksScreen`, same pattern as the existing Icebox section, listing every untagged Task. Each row: tap to tag it (reuses the existing tag-picker sheet from quick-add — leaves the Inbox), or tap a "→ Journey" icon to convert it into a new bare Journey (title-only, pre-filled from the task's title; the original Task is discarded, not kept as the Journey's first Task — clarifying "is this a project?" is a re-filing decision, not a demotion).
3. **Organize** — unchanged. No structural change to Journey/Waypoint/Task.
4. **Engage** — Today's Focus List excludes untagged (Inbox) tasks; only clarified tasks count as trusted next actions.
5. **Reflect** — a Weekly Review bottom sheet, reachable from `TasksScreen`. Single scrollable checklist, four items, **no manual checkboxes** — every item reflects real computed state:
   - **Inbox empty** — live count of untagged Tasks; passes only at 0. Not deep-linked; user dismisses the sheet, clears the Inbox section, reopens Review.
   - **Every active Journey has a Task** — live pass/fail per Journey; lists any Journey with zero linked Tasks. Same dismiss-and-fix flow as above.
   - **Skim Icebox** — auto-passes the moment the user expands/views the Icebox list within the sheet.
   - **Skim week's completed Tasks** — auto-passes the moment the user expands/views that list within the sheet.
   - "Complete Review" button stays disabled until all four pass. On completion: `profiles.last_reviewed_at` is set to now, and the same streak-extend path already used for daily completion runs.
   - Cadence is rolling: due 7 days after `last_reviewed_at`. Missing the window consumes a one-time grace token (same shape as the daily check-in's `gracePeriodUsed`, but its own field — `reviewGracePeriodUsed` — since `gracePeriodUsed` is already owned by `checkInDaily`'s daily-cadence logic and reusing it directly would collide). A second consecutive miss breaks the same `streak` value the rest of the app already reads. Evaluated lazily on the next `completeWeeklyReview()` call, same lazy-diff pattern `checkInDaily` already uses — no background job.

## Data Schema / Interface Contracts

- `src/store/taskStore.ts`: `Task.tagId: string` → `Task.tagId?: string`.
- `src/store/economyStore.ts`: add `lastReviewedAt: string | null` next to the existing `streak`/`debt`/`gracePeriodUsed` fields, plus a `completeWeeklyReview()` action that sets it and runs the existing streak-extend logic. Review state lives here, not a new store — it directly manipulates streak/grace, which already live here.
- `supabase/migrations/20260821000001_task_tag_id_optional.sql`: `ALTER TABLE public.tasks ALTER COLUMN tag_id DROP NOT NULL;` — required companion to the type change above; without it, pushing any Inbox task to Supabase violates `tag_id`'s existing `NOT NULL` constraint (same failure class as the `sort_order` incident in `AGENTS.md`).
- `supabase/migrations/20260821000002_profiles_last_reviewed_at.sql`: `ALTER TABLE public.profiles ADD COLUMN last_reviewed_at TIMESTAMPTZ;` — nullable, no RLS policy change (existing `profiles` RLS already scopes by `auth.uid()`).
- `supabase/schema.sql` baseline updated to match both migrations.
- `src/components/`: new `WeeklyReviewSheet.tsx` (or similar), new Inbox section inside `TasksScreen.tsx` reusing the Icebox section's existing render pattern.

## Implementation Checklist

- [x] Loosen `Task.tagId` to optional in `taskStore.ts`; audit call sites that assumed it's always set. (Also widened `PillPicker.selectedId` to `string | undefined` — `TaskDetailModal`/`AnimatedTaskRow` pass `task.tagId` straight through.)
- [x] Exclude untagged Tasks from Today's Focus List grouping in `TasksScreen.tsx`.
- [x] Add collapsible Inbox section to `TasksScreen.tsx` (mirrors Icebox section).
- [x] Wire "tap to tag" — opens the existing `TaskDetailModal` (which already has tag editing) rather than a separate picker sheet; same end result, zero new component.
- [x] Wire "→ Journey" conversion action (bare title-only Journey creation, discard original Task).
- [x] Write and register the migrations — **two, not one**: `tasks.tag_id` had to lose its `NOT NULL` constraint too (discovered while implementing; same failure class as the `sort_order` incident) alongside `profiles.last_reviewed_at`. **Both must be run manually against the live Supabase project** (per `AGENTS.md` migration-tracking rule) before this ships — not yet confirmed run.
- [x] Add `lastReviewedAt` + `completeWeeklyReview()` to `economyStore.ts`. Uses its own `reviewGracePeriodUsed` field, not the daily check-in's `gracePeriodUsed` (discovered while implementing — sharing it would collide with `checkInDaily`'s own daily-cadence logic).
- [x] Build `WeeklyReviewSheet` with the four gated (non-manual) checklist items.
- [x] `npx tsc --noEmit` — clean on every file this feature touched. **Not clean repo-wide**: `src/store/progress.ts` (pre-existing untracked WIP, unrelated to this feature) has 8 errors; commit went through with `--no-verify` on the user's explicit go-ahead rather than touching unrelated in-progress work.
- [ ] Test on a real account: capture untagged, clarify via tag / via Journey conversion, trigger and complete a Review, and confirm a missed-cadence review actually consumes grace / breaks streak. Migrations confirmed run against the live project — this is the last open item.

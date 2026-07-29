# 024 — Goal-Pillar Link + Journeys Hierarchy

## Objective

Goals lived on the Dashboard, disconnected from the Pillars (life areas) and
Journeys (projects) that give them context — the Dashboard just listed every
root Goal flat, with no relationship to which Pillar it served. Relocates
Goals to the Journeys screen (Collections tab) as a real hierarchy: **Pillar
→ Goals under that pillar → Journeys feeding each goal**. This required
closing a data-model gap: `Goal` had no `pillarId` and nothing derived one
reliably (a Goal only touched a Pillar indirectly and ambiguously through
whichever tasks happened to reference it).

Considered and rejected: deriving a Goal's pillar on the fly from its linked
tasks' tags, with no schema change. Rejected because a brand-new Goal with
zero tasks yet has no pillar and can't be placed in the hierarchy, and a
Goal whose tasks span multiple pillars becomes ambiguous. Went with an
explicit `pillarId` on `Goal` instead — mirrors how `Tag` already requires a
`pillarId`, set at creation and correctable later.

Also fixed in the same pass: the milestone-badge row (25/50/75/100%) had no
wrap/shrink behavior in both `AnimatedGoalCard` and `GoalDetailModal`, so the
widest badge ("100%", largest dollar payout) overflowed past the card edge
on narrow screens.

## User Flow

- Dashboard now shows only "today's tasks + daily ring" — no Goals section.
- Journeys screen: creating a Goal (still only possible inline via "New
  Journey" → "+ Create New Goal...") now requires picking a Pillar. The
  screen renders each active Pillar as a section, listing that Pillar's root
  Goals (via `AnimatedGoalCard`, unchanged card itself) with their linked
  Journeys nested underneath. Productive Goals with no Pillar (pre-backfill,
  or genuinely unset) land in an "Unassigned" section; Entertainment Goals
  stay in their own ungrouped "Entertainment Projects" section (entertainment
  isn't pillar-scoped); Journeys with no Goal link at all land in "Other
  Journeys" — nothing that existed before disappears.
- `GoalDetailModal` gains a Pillar picker (hidden for Entertainment goals) so
  a wrong backfill guess, or any future reassignment, is correctable.
- Quick Start (task-creation + timer-start for a Goal) moved from Dashboard
  to the Journeys screen along with the Goals themselves.
- Milestone badges wrap to a second row instead of clipping.

## Data Schema / Interface Contracts

- **Migration**: `supabase/migrations/20260727000003_goal_pillar_id.sql` —
  `ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS pillar_id TEXT
  REFERENCES public.pillars(id) ON DELETE SET NULL` (nullable; deleting a
  Pillar unlinks Goals, never deletes them, matching the existing
  `collections.goal_id` convention). **Must be run in the Supabase SQL
  Editor before/alongside this deploy**, per AGENTS.md's migration-tracking
  rule — the FK is added via a separate `ALTER TABLE` in `schema.sql` too
  (after `public.pillars` exists), since `goals` is defined earlier in that
  file than `pillars`.
- `src/store/goalStore.ts`: `Goal.pillarId?: string` (undefined = Entertainment
  goal, or pre-backfill/genuinely unassigned productive goal). New
  `backfillGoalPillarIds`/`backfillGoalPillarIdsApplied`, mirroring
  `taskStore.ts`'s `backfillTagPillarIds` pattern: for each productive Goal
  missing `pillarId`, guesses from the first task referencing it
  (`Task.goalId` → `Task.tagId` → `Tag.pillarId`); no match leaves it
  undefined (lands in "Unassigned") rather than inventing a fake pillar.
  Wired into `App.tsx` after `backfillTagPillarIds` (depends on `Tag.pillarId`
  already being populated).
- `src/store/syncEngine.ts`: `pillar_id` mapped on both the Goals pull
  (`formattedGoals`) and push (`pushAllGoalsToCloud`) — omitting either side
  would silently drop the field on every cloud round-trip, the same failure
  class as the incident documented in spec 018.
- `src/screens/CollectionsScreen.tsx`: new required Pillar picker in the
  inline Goal-creation form; flat Journey list replaced by the Pillar → Goal
  → Journey render (a `JourneyRow` subcomponent, extracted from the old
  per-collection card, is reused for both nested and standalone Journeys);
  Quick Start (`quickStartGoal` state, `QuickStartModal`, `handleQuickStart`)
  and `useTimerLauncher` (new shared hook, see below) moved in from Dashboard.
- `src/components/GoalDetailModal.tsx`: Pillar reassignment picker, gated on
  `!isEntertainment`.
- `src/hooks/useTimerLauncher.tsx` (new): the insufficient-hours
  blocked-modal flow, extracted so both `DashboardScreen` (ordinary task
  rows, which stayed put) and `CollectionsScreen` (Goal quick-start, which
  moved) share one implementation instead of drifting.
- `src/utils/pillarColor.ts`: exported `FALLBACK_COLOR` (was file-private)
  for the "Unassigned" section's accent dot.

## Implementation Checklist

- [x] Migration `20260727000003_goal_pillar_id.sql` written (nullable, `ON
      DELETE SET NULL`)
- [x] `supabase/schema.sql` updated — column on `goals`, FK constraint added
      after `pillars` is defined
- [x] `Goal.pillarId` field + `backfillGoalPillarIds` in `goalStore.ts`
- [x] Backfill wired into `App.tsx` after `backfillTagPillarIds`
- [x] `syncEngine.ts` pull + push `pillar_id` mapping
- [x] Required Pillar picker in `CollectionsScreen.tsx`'s new-Goal form
- [x] Pillar reassignment picker in `GoalDetailModal.tsx`
- [x] `useTimerLauncher` hook extracted; used by both Dashboard and Journeys
- [x] `CollectionsScreen.tsx` restructured into Pillar → Goal → Journey
      hierarchy, with Unassigned / Entertainment Projects / Other Journeys
      sections; Quick Start relocated here
- [x] `DashboardScreen.tsx` Goals sections, Quick Start, and inline
      blocked-modal logic removed
- [x] Milestone-badge row wraps (`AnimatedGoalCard.tsx` + `GoalDetailModal.tsx`)
- [x] `npx tsc --noEmit` clean
- [ ] User confirms `20260727000003_goal_pillar_id.sql` has been run against
      the live Supabase project

## Notes

- `ProfileScreen.tsx`'s separate flat "read/edit/delete" Goals list is left
  unchanged — it's an explicitly secondary utility view; duplicating the
  Pillar hierarchy there wasn't judged worth the added surface for a
  personal-use app.
- A Goal's linked Journeys, for hierarchy purposes, include Journeys linked
  to any of its sub-goals too (`collection.goalId` matching the goal or any
  child), not just the root Goal itself.

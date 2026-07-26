# SDD: Dynamic Goal Units & Journey Progress Bar

## 1. Feature Overview
Task → Journey → Goal progress cascade already existed and is solid (multi-level
`parentId` chains, single-payer economics — see docs 013/014). The real gap:
a Summit's `metricType: 'units'` mode was a bare discrete count — completing a
task always added exactly `+1`, with no field anywhere for a task to report a
custom quantity ("10 pages") and no field on a Summit to label what the unit
even means. This adds that, plus a Journey-card progress bar (a Journey has no
progress of its own — it's a 1:1 label over a Summit — so this mirrors the
linked Summit right where tasks get created, removing a navigation hop).

## 2. Three-Lens Alignment (Phase 0 — resolved with user)
- **Economics**: payout stays fully decoupled — a task's time estimate always
  drives Hours/Dollars, unchanged. The unit quantity only feeds Summit
  progress, purely additive, no new economy surface, no exploit risk.
- **Psychology**: concrete units ("12/50 pages") are a stronger feedback loop
  than an abstract count. Unit label is free-text (not a fixed preset list) —
  maximum flexibility for minimal new UI.
- **Architecture**: chains stay homogeneous — extending the existing
  "every goal in a chain shares one metricType" rule (`getEligibleParents`)
  to also require matching `unitLabel`, so a parent goal's progress number
  always means one consistent thing.

## 3. Data Schema / Interface Contracts
`src/store/summitStore.ts` — `Summit.unitLabel?: string`.
`src/store/taskStore.ts` — `Task.metricProgress?: number` (quantity this task
contributes to its linked Summit's unit, e.g. `10` for "10 pages").

`applyLeafProgress`/`revokeLeafProgress` gain an optional third param:
```ts
applyLeafProgress: (goalId: string, minutes: number, metricAmount?: number) => UnlockedMilestoneInfo[];
revokeLeafProgress: (goalId: string, minutes: number, metricAmount?: number) => void;
```
For `metricType === 'units'`, uses `metricAmount ?? 1` — preserves exact
backward compatibility for every existing units-mode goal with no quantity
ever set (verified directly, see below). `stepCountAncestors` (the
parent-chain ripple on a leaf hitting 100%) is untouched — a leaf's own
`completedMetric` absorbs the custom quantity, but a completed leaf still
only contributes a flat `+1` to its parent's count (e.g. finishing one
200-page book still counts as +1 toward a "5 books this year" parent, not
+200) — this is the existing, intentional Book→Series→Library model.

`getEligibleParents` gains an optional `unitLabel` param (default `''`, so
untouched call sites keep matching only other unlabeled goals): when both
sides are `'units'`, also requires matching `unitLabel` (case-insensitive).

New migration `supabase/migrations/20260726000002_summit_unit_label_and_task_metric_progress.sql`:
```sql
ALTER TABLE public.summits ADD COLUMN IF NOT EXISTS unit_label TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS metric_progress DOUBLE PRECISION;
```
**Not yet run against production** — per the standing migration rule, cloud
sync of both fields won't work until this is pasted into the Supabase SQL
Editor.

## 4. Implementation Checklist
- [x] `Summit.unitLabel?: string`, `Task.metricProgress?: number`
- [x] `applyLeafProgress`/`revokeLeafProgress` accept optional `metricAmount`
- [x] `getEligibleParents` homogeneity extended to `unitLabel`
- [x] Migration + `schema.sql` baseline + `syncEngine.ts` pull/push mapping (both fields)
- [x] `CollectionsScreen.tsx` inline Summit-creation form + `EditSummitModal.tsx`: free-text "Unit label" input in Count/units mode
- [x] `TaskDetailModal.tsx`: "Progress (unitLabel)" input, shown only when the linked Summit is units-mode
- [x] `AnimatedSummitCard.tsx` + `ProfileScreen.tsx`: unit label appended to progress text — **also fixed a pre-existing gap in `ProfileScreen.tsx`'s Summit list, which never branched on `metricType` at all and always displayed hours (meaningless for a Count goal) regardless of mode**
- [x] `CollectionsScreen.tsx`: each Journey card shows a progress bar (reusing `AnimatedProgressBar`) mirroring its linked Summit's own progress, visible in the always-on compact header (not gated behind expanding the card)
- [x] Typecheck (`npx tsc --noEmit`)

## 5. Verification (end-to-end, real app interactions + direct store-state checks)
- Created a units-mode Goal ("Stormlight Archive", target 200, unit label
  "pages") via the real Journey-creation UI; confirmed the new "Unit label"
  field renders and saves.
- Linked a task (25m estimate, `metricProgress: 10`) to that Journey; the
  detail screen correctly showed "Progress (pages)" pre-filled with 10.
- Completed the task: Summit's `completedMetric` went to exactly `10` (not
  the old hardcoded `+1`); Hours balance increased by the time-estimate's
  conversion (13min), confirming payout is driven by the 25-minute estimate,
  not the 10 pages; Journey card updated live to "10/200 pages".
- Un-completed the task: both reverted exactly back (`completedMetric` → 0,
  Hours → original), confirming symmetric reversion.
- Backward compatibility: seeded a legacy-shaped units goal (no `unitLabel`)
  and task (no `metricProgress`) — completing it still added exactly `+1`,
  matching pre-existing behavior with zero regression.
- Chain homogeneity: seeded a "pages" goal, a "reps" goal, and a no-label
  goal as candidate parents for a "pages" leaf — the Edit Summit modal's
  "Contributes To" picker correctly showed only the matching "pages" goal,
  excluding both the "reps" goal and the unlabeled goal.

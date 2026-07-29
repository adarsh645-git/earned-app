# SDD: Goal & Journey Detail Views

## 1. Feature Overview
Extends the full-screen "detail view" pattern established by Task Detail
(`docs/sdd/019`) to Summits (Goals) and Collections (Journeys) — tapping a
Summit card or a Journey card now opens a translucent, full-screen editing
surface instead of a small centered popup (Goals) or an inline
expand-in-place accordion plus a separate duplicate edit popup (Journeys).
The Dashboard was explicitly out of scope — it's purely a composition of
Tasks and Summits, with no entity of its own to drill into.

## 2. Three-Lens Alignment (Phase 0 — resolved with user)
- **Economics**: no currency/payout logic touched. `GoalDetailModal` and
  `JourneyDetailModal` call the same `updateSummit`/`deleteSummit`/
  `setPayingLevel`/`updateCollection`/`deleteCollection`/Waypoint-Item CRUD
  actions the old popups called — this is a UI consolidation, not a rules
  change.
- **Psychology**: both detail screens surface a **reverse lookup** that
  didn't exist anywhere before — Goal Detail lists the Journeys feeding it,
  Journey Detail lists the Tasks linked to it — closing a real
  legibility gap (previously the link was only visible from the
  Task/Journey-picker side, one direction only).
- **Architecture**: same `<Modal transparent animationType="slide">` +
  `SafeAreaView` shell as `TaskDetailModal.tsx` (`rgba(0,0,0,0.96)`
  background, `#1C1C1E`/`#2C2C2E`/`#3A3A3C` palette — the palette
  `AnimatedSummitCard` already used, not `EditSummitModal`'s older
  `#09090B`/`#18181B`/`#27272A` zinc scheme). Fields autosave immediately
  on change/blur, same convention as Task Detail — no explicit Save button.
- **Decision**: Goal Detail **replaces** `EditSummitModal` entirely (tapping
  the card or its pencil both open it, exactly like Task Detail replaced
  `EditTaskModal`). Journey Detail replaces **only** the edit popup — the
  lightweight inline "New Journey" quick-create accordion is untouched,
  same relationship as the Task quick-add bar vs. Task Detail.

## 3. Data Schema / Interface Contracts
No store or schema changes — pure UI consolidation.

New component `src/components/GoalDetailModal.tsx`:
```ts
interface GoalDetailModalProps {
  goal: Summit | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Summit>) => void;
  onDelete: (id: string) => void;
  onQuickStart?: (goal: Summit) => void;
  onNavigate?: (goal: Summit) => void; // reopens the same modal for a sub-goal
}
```
Carries over every `EditSummitModal` field (Title, Horizon, Target/Open-Ended,
"Contributes To" chain picker via `getEligibleParents`, "Rewards Paid Here"
toggle via `setPayingLevel`), adds the animated progress bar + milestone
badges `AnimatedSummitCard` already rendered, a one-level sub-goals list
(tapping a sub-goal calls `onNavigate` so the same caller can drill in), and
a new read-only "Journeys" section (`collections.filter(c => c.summitId ===
goal.id)` via `useCollectionStore`).

New component `src/components/JourneyDetailModal.tsx`:
```ts
interface JourneyDetailModalProps {
  collection: Collection | null;
  visible: boolean;
  onClose: () => void;
  onToggleItem: (itemId: string, collectionId: string, waypointId?: string) => void;
}
```
`onToggleItem` is routed through so the screen-level celebration
modal/chain-legibility toast (`CollectionsScreen`'s existing
`handleToggleItem`) keeps firing unchanged — those are screen-level side
effects, not something to duplicate inside the modal. Everything else
(title, category, linked-Goal picker, Waypoints/Items CRUD, delete) is
self-contained, pulling directly from `useCollectionStore`/`useSummitStore`/
`useTaskStore`. Adds two progress bars (the Journey's own item-completion
bar, and — separately, clearly labeled — the mirrored linked-Summit
progress) and a new read-only "Tasks" section (`tasks.filter(t =>
t.collectionId === journey.id)` via `useTaskStore`). Delete is a 2- or
3-action `ConfirmModal` (matching the old popup's "Delete Journey Only" vs
"Delete Journey & Linked Summit" choice when a Summit is linked).

## 4. Implementation Checklist
- [x] New `src/components/GoalDetailModal.tsx`
- [x] `AnimatedSummitCard.tsx`: swapped `EditSummitModal` → `GoalDetailModal`;
      card body wrapped in a `Pressable` to open detail (pencil still works
      too); `onNavigate` wired to the existing `setEditingGoal` state so a
      sub-goal's pencil opens its own detail view
- [x] `ProfileScreen.tsx`: same swap for its own hand-rolled Summit list;
      each row wrapped in `Pressable`
- [x] New `src/components/JourneyDetailModal.tsx`, including the relocated
      Waypoints Area (timeframe buckets, target/year/month correction pills,
      Item create/toggle/delete) — moved, not duplicated, out of
      `CollectionsScreen`'s old inline expand-in-place section
- [x] `CollectionsScreen.tsx`: removed the ~250-line separate edit-Journey
      `Modal`, the inline expand-in-place behavior (chevron,
      `expandedJourneys`), the per-row "fast correction" category/goal
      pill pair, and the now-dead Timeframe Filter Tabs (their only effect —
      filtering which Waypoints showed inline — no longer applies now that
      Waypoints management lives entirely in `JourneyDetailModal`, which
      shows all of a Journey's Waypoints unconditionally, matching how Task
      Detail shows all subtasks unconditionally)
- [x] `CollectionsScreen.tsx`: compact Journey card is now title, category
      badge, linked-goal badge, mirrored Summit progress bar, pencil — tap
      anywhere on the card (or the pencil) opens `JourneyDetailModal`; the
      "New Journey" quick-create accordion is untouched
- [x] Retired `src/components/EditSummitModal.tsx` (no remaining importers)
- [x] Typecheck (`npx tsc --noEmit`)

## 5. Implementation Notes
- Card-level delete icons (row trash) were **removed**, not carried forward,
  for both the Summit card and the Journey card — deletion now lives solely
  in each detail view's header trash + `ConfirmModal`, matching the actual
  established precedent (`AnimatedSummitCard`'s row already had no trash
  icon even before this change; only a pencil). The plan draft's wording
  ("pencil, trash") for the Journey card was superseded by this precedent
  once verified against the codebase.
- `GoalDetailModal` computes eligible parents live off the in-progress
  `unitLabel` input (not just the saved value), so the "Contributes To"
  chain list updates immediately as the user types a unit label — same
  behavior `EditSummitModal` had.
- Sub-goal drill-in (`onNavigate`) reuses the exact same `editingGoal`
  state each caller already had — no new navigation stack, just reopening
  the same modal for a different Summit id.

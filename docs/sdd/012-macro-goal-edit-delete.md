# SDD: Edit & Delete for Macro Targets

## 1. Feature Overview
Adds edit and delete UI for macro goals ("Macro Targets") — previously the store already had `updateMacroGoal`/`deleteMacroGoal`, and `AnimatedMacroGoalCard` already supported inline title editing, but there was no way to change a goal's target duration/units or delete it entirely from any screen.

## 2. Business Rules
- **Delete cascade** (user decision): deleting a macro goal also deletes its direct sub-goals (they're structurally meaningless without a parent and have no other home). Tasks and Journeys (Collections) that reference the deleted goal(s) are **unlinked** (`macroGoalId` cleared), not deleted — unrelated work is never silently destroyed.
- Editable fields: title, horizon (root goals only), and target (duration in minutes, or unit count if `metricType === 'units'`), with an Open Ended toggle (target = 0).

## 3. Data & Interface Changes
- `src/store/macroGoalStore.ts`: `deleteMacroGoal` now computes the set of ids to remove (goal + direct children), filters them out of `macroGoals`, and — via the same deferred `require()` pattern already used elsewhere in this store to avoid circular imports — clears `macroGoalId` on any matching `taskStore` tasks and `collectionStore` collections.
- New `src/components/EditMacroGoalModal.tsx`: shared edit/delete modal (title, horizon, target, delete-with-confirm), following the same visual pattern as `EditTaskModal.tsx`.
- `src/components/AnimatedMacroGoalCard.tsx`: pencil icon added next to the title (root goal) and each sub-goal's inline-editable title, opening `EditMacroGoalModal`. Covers Dashboard (Pyramid Targets + Entertainment Projects) and Store (Entertainment).
- `src/screens/ProfileScreen.tsx`: pencil icon added to its own (separate, non-shared) Pyramid Targets row rendering, wired to the same modal.

## 4. Known Limitation (flagged, not fixed here)
`horizon` (monthly/yearly) has **no column at all** in the `macro_goals` Supabase table, and `syncEngine.ts`'s pull handler hardcodes `horizon: 'monthly'` on every read — a pre-existing bug (not introduced by this feature) that silently reverts any yearly goal's horizon after a cloud sync round-trip. Unlike the `type`/`goal_type` fix in `011`, this can't be fixed with a code-only change — it needs an actual schema migration to add the column. Left the horizon editor in anyway since: (a) it's purely a cosmetic label, not used in any economic/gating logic, so the impact of it reverting is low: (b) it's still useful before the next sync, or for anyone not using cloud sync at all. Flagging for a follow-up migration if the user wants it fixed.

## 5. Task Checklist
- [x] Cascade-safe `deleteMacroGoal` (unlink tasks/collections, remove sub-goals)
- [x] `EditMacroGoalModal` component
- [x] Wire into `AnimatedMacroGoalCard` (root + sub-goals)
- [x] Wire into `ProfileScreen`'s Pyramid list
- [x] Typecheck (`npx tsc --noEmit`)

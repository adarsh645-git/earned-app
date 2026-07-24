# SDD: Interlinked Goal Chains — Cascade Foundation (Phase 1+2)

## 1. Feature Overview
Lets a completed action drip progress up a single nesting chain of macro goals — e.g. finishing a book advances its series and a "read 20 books" goal; a deep-work session advances its project and area. This document covers **Phase 1 (persistence) + Phase 2 (correct single-paying cascade)**. The chain-building UI and the "which level pays" toggle are Phase 3 (separate PR).

Design decisions (from a 3-lens evaluation with the user):
- **Single chain** on `MacroGoal.parentId` — not a many-to-many graph (which dilutes progress legibility and multiplies rewards).
- **Currency paid at exactly one designated level** per chain; progress still cascades everywhere.
- **Homogeneous chains** — every goal in a chain shares one `metricType` ("20 books" = count, "deep-work hours" = time).
- **Count chains advance only on explicit completion** — a discrete completion contributes **+1 to every count-ancestor, once**; a mere session doesn't increment a count. Time chains cascade minutes continuously.

## 2. The bug this also fixes
`macroGoalStore.addProgress` previously paid milestone Dollars at **every** level of its `parentId` recursion, multiplying rewards per unit of work — the same inflation removed from the entertainment side in specs 008/009. It also fed the raw `amount` to every ancestor regardless of unit, and callers (`taskStore`/`timerStore`) passed *minutes* even to count goals.

## 3. Data & Interface Changes
- **Schema** (`supabase/migrations/20260724000002_macro_goal_chains.sql`, mirrored in `schema.sql`): adds `parent_id`, `pays_currency` (default TRUE), `category` to `macro_goals`. **Must be run manually** — until it is, macro-goal cloud sync fails (the push now sends these columns).
- **`syncEngine.ts`**: pushes/pulls `parent_id`, `pays_currency`, `category` (previously dropped — chains didn't survive a sync round-trip).
- **`macroGoalStore.ts`**:
  - `MacroGoal` gains `paysCurrency?: boolean` (undefined = pays, back-compat).
  - `addProgress`: milestone payout (`addBalance`/`incrementCompletedMacroGoals`) gated on `paysCurrency !== false`. Cascade rewritten: time goals recurse minutes to the parent; a units goal, only on its transition to 100%, calls `stepCountAncestors(parentId, +1)`.
  - `stepCountAncestors(parentId, ±1)`: walks a count chain to root, stepping each ancestor's `completedMetric` and applying/revoking milestones (payout gated). Does **not** self-re-trigger, so a leaf's single completion adds exactly +1 to each ancestor (no double-count).
  - `applyLeafProgress(goalId, minutes)` / `revokeLeafProgress`: routes a leaf action to +1 for a count goal or minutes for a time goal.
  - `applyPaysCurrencyDefaults()` (one-time, persisted-flag guarded, invoked from `App.tsx`): sets existing chain **roots** to pay and descendants not to, without overriding explicit choices — stops the legacy multi-pay.
- **Callers** rerouted to `applyLeafProgress`/`revokeLeafProgress`: `taskStore.toggleTask` (both directions), `timerStore.completeSession`, `collectionStore.toggleItemCompletion` (drops its old `metricType` fudge).

## 4. Out of scope (Phase 3+, next PR)
Chain-building UI (parent selector + depth/cycle guards in `EditMacroGoalModal`), the user-facing "Rewards paid at this level" toggle, productive-goal parent selection at creation, and the cascade-legibility feedback ("Contributed to: Book → Series → 20 Books"). Until Phase 3 ships, chains can only be built via the existing entertainment parent-selector in `StoreScreen`; productive chains aren't yet buildable from the UI.

## 5. Task Checklist
- [x] Migration + schema (`parent_id`, `pays_currency`, `category`)
- [x] Sync the three fields in `syncEngine.ts`
- [x] `paysCurrency` on type + payout gate in `addProgress`/`removeProgress`
- [x] Completion-based count cascade (`stepCountAncestors`) + time cascade
- [x] `applyLeafProgress`/`revokeLeafProgress` router; reroute all three callers
- [x] One-time `applyPaysCurrencyDefaults` migration wired into `App.tsx`
- [x] Typecheck (`npx tsc --noEmit`)
- [ ] Run migration in Supabase (manual) before this ships to a synced client

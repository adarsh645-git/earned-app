# SDD: Interlinked Goal Chains — Chain-Building UI & Legibility (Phase 3+4)

## 1. Feature Overview
Follow-up to `docs/sdd/013` (which shipped the cascade engine only). This lands the actual UI to build chains, the "which level pays" control, and the cascade-legibility feedback that the original 3-lens evaluation identified as the psychological safeguard against progress dilution.

## 2. Gap found during implementation
No creation flow anywhere could produce a `metricType: 'units'` (count) goal — every path defaulted to time-based. That would have made the feature's own headline example ("finish 20 books") unbuildable. Both creation flows (`ProfileScreen.tsx`'s Pyramid form, `StoreScreen.tsx`'s entertainment form) gained a **Time / Count** toggle; Count shows a target-count input instead of target-hours.

## 3. Data & Interface Changes
`src/store/macroGoalStore.ts` gains pure helpers (no store dependency, reusable across screens):
- `getChainDepth`, `getDescendantIds`, `getChainRoot` — chain topology.
- `getEligibleParents(macroGoals, goal, type, metricType)` — same `type` (productive/entertainment stay separate pyramids) and same `metricType` (homogeneity), excludes self + descendants (no cycles), excludes anything already at `MAX_CHAIN_DEPTH` (chains capped at 3 levels).
- `getChainTrail(macroGoals, goalId)` — leaf-first titles for display, e.g. `["Elden Ring", "RPG Backlog"]`.
- `setPayingLevel(goalId)` (store action) — walks to the chain root, then every descendant, setting `paysCurrency: true` only on `goalId` and `false` everywhere else in that chain. Enforces "exactly one payer" regardless of where in the chain it's called from or how the chain was just restructured.

## 4. UI Changes
- **`EditMacroGoalModal.tsx`**: parent selector (via `getEligibleParents`); "Rewards Paid Here" toggle — on Save, if enabled, calls `setPayingLevel` (after the parent-id update has landed, so it reads the goal's *new* position); if disabled, just clears its own flag. Horizon field visibility now tracks the live parent selection, not the original goal's.
- **`ProfileScreen.tsx`** New Goal form: Time/Count toggle, conditional target input, optional parent selector (productive goals only, matching `metricType`).
- **`StoreScreen.tsx`** entertainment creation form: same Time/Count toggle; the pre-existing ad-hoc parent selector (top-level-only, no metric check) replaced with `getEligibleParents` for correctness — it was possible before to build a metricType-mismatched chain that would then silently misbehave.
- **`RewardToast.tsx`**: optional `chainTrail` prop rendering "↳ Contributed to: X → Y" as a third line.
- **`TimerOverlay.tsx`**: `SessionCompletionResult` (`timerStore.ts`) gained `chainTrail`, computed in `completeSession`. A `RewardToast` renders it after a session ends, with its own dismiss state independent of the milestone modal's — so the toast's ~3.5s auto-dismiss can't prematurely clear a milestone celebration sharing the same `recentCompletionResult`.
- **`TasksScreen.tsx`**: its existing reward toast (added earlier this session) now also carries the chain trail when the completed task's linked goal has a parent.
- **`CollectionsScreen.tsx`**: item completion now surfaces a chain toast when the collection's linked macro goal has a parent — independent of (and can co-occur with) the existing Sub-Goal/Journey celebration modal, which is a different completion concept (journey-item checklist, not the macro-goal chain).

## 5. Task Checklist
- [x] Chain helper functions (`getChainDepth`, `getDescendantIds`, `getChainRoot`, `getEligibleParents`, `getChainTrail`) + `setPayingLevel` action
- [x] Parent selector + paying-level toggle in `EditMacroGoalModal`
- [x] Time/Count toggle + parent selector in `ProfileScreen`'s New Goal form
- [x] Time/Count toggle + corrected parent selector in `StoreScreen`'s entertainment form
- [x] Chain-trail toast wired into Tasks, Timer, Collections completion paths
- [x] Typecheck (`npx tsc --noEmit`)

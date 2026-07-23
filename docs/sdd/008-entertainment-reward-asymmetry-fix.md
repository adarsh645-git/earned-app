# SDD: Entertainment Reward-Asymmetry Fix

## 1. Feature Overview
Corrects a design flaw in the dual-currency economy (see `004-dual-currency-reward-economy.md`): entertainment macro goals (games, movies, TV, YouTube) were paying real Dollars at milestone completion identically to productive goals. This double-rewards leisure that is already paid for with earned Hours, and dilutes the currency's meaning as a signal for effortful, low-natural-feedback activities (office deep work, fitness, effortful reading).

Behavioral rationale: reward should fill a feedback-loop gap, not follow effort uniformly. Games/media already have dense built-in progression/reward loops by design — an artificial Dollar payout on top is redundant and pulls reward-seeking attention away from the categories that actually lack a natural feedback loop.

## 2. Business Rules
- `MacroGoal.type === 'entertainment'` milestones (25/50/75/100%) unlock acknowledgment only (confetti, badge, percentage) — **zero Dollars**.
- `MacroGoal.type === 'productive'` milestones are unaffected — full existing Dollar payout formula.
- One-time retroactive correction: Dollars already paid out for previously-unlocked entertainment milestones are clawed back from the user's balance on next app load, exactly once.

## 3. Data & Interface Changes
- `src/store/macroGoalStore.ts`: `getMilestoneDollars(targetMinutes, milestone, goalType = 'productive')` — returns `0` immediately when `goalType === 'entertainment'`. All call sites now pass `goal.type || 'productive'`.
- `src/store/economyStore.ts`:
  - New persisted field `entertainmentClawbackApplied: boolean` (default `false`).
  - New action `applyEntertainmentClawback()` — sums the legacy (pre-fix) Dollar value of all already-unlocked entertainment milestones across `macroGoalStore`, removes that total from `dollarBalance` via `removeBalance`, and sets the flag so it only ever runs once.
- `App.tsx`: waits for both `economyStore` and `macroGoalStore` to finish `persist` hydration, then calls `applyEntertainmentClawback()`.

## 4. UI Changes
- `src/components/MilestoneModal.tsx`: hides the "+ $X.XX Bonus Cash" box and swaps the button label to "Nice!" when the unlocked milestone(s) total `$0` (entertainment). Trophy badge, percentage, and confetti are unchanged.
- `src/screens/ProfileScreen.tsx` / `src/components/AnimatedMacroGoalCard.tsx`: milestone reward previews now show `$0` for entertainment goals instead of a misleading cash preview.
- `src/screens/CollectionsScreen.tsx`: Journey-launch celebration copy no longer promises "cash bonus multipliers" when the linked macro goal is `entertainment` type; shows milestone-badge language instead.

## 5. Task Checklist
- [x] Make `getMilestoneDollars` type-aware; update all 3 call sites
- [x] Acknowledgment-only UI in `MilestoneModal.tsx`
- [x] Fix overpromising copy in `CollectionsScreen.tsx`
- [x] Add `entertainmentClawbackApplied` + `applyEntertainmentClawback` to `economyStore.ts`
- [x] Wire one-time clawback into `App.tsx` post-hydration
- [x] Typecheck verification (`npx tsc --noEmit`)

# SDD: Blame-Free Economy — Interest-Free IOU, No Default/Lockout

## 1. Feature Overview
Replaces the punitive credit system on the Dollar currency (300–850 credit score gating a borrow limit, compounding daily interest, 7-day default that wiped streaks/froze goals, 20% penalty fee) with a **flat-capped, interest-free tab**. Debt is now purely an accountability reminder — "you owe $X, future earnings repay it first" — never a punishment.

Behavioral rationale (established through discussion): blame requires a transgression the system can point at. A compounding, judged, defaultable debt *manufactures* that transgression. A flat interest-free tab with automatic garnishment gives the same "remember to compensate" signal without the shame mechanics — accountability without blame. This complements the entertainment reward-asymmetry fix (`008`) and the existing Hours hard-block (`timerStore.startTimer`), which remains the strict earn-before-burn gate — only the **Dollar** side gets an overspend valve; Hours stays debt-free by design.

## 2. Business Rules
- **Dollars**: cash-first spend; if short, may go on a flat, interest-free tab up to `IOU_CAP` ($25). No score-gated limit, no interest, no default, no lockout.
- **Garnishment** (unchanged, already existed): all future Dollar earnings repay the tab first before adding to spendable balance.
- **Discipline Score**: reframed as a pure positive feedback signal (`base 600 + streak + completedTasks + completedMacroGoals`, capped at 850). It never gates a transaction and never drops from punitive events — there are none left that touch it.
- **Hours**: unchanged — strict earn-before-burn, no debt allowed (`timerStore.ts` hard-block).

## 3. Data & Interface Changes
`src/store/economyStore.ts`:
- Removed: `historyOfDefaults`, `lastFocusDate`, `lastInterestAppliedDate`, `streakResetsCount`, `isInDefault` state fields.
- Removed functions: `applyDailyInterestAndCheckDefaults`, `getCreditLimit`/`getCreditLimitByScore`, `getDailyInterestRate`/`getDailyInterestRateByScore`, `applyPenalty`, `recordFocusSession`.
- Added: `export const IOU_CAP = 25.0` (flat, tunable in one place).
- Renamed: `calculateCreditScore` → `calculateDisciplineScore` (drops punitive inputs), `getCreditScore` → `getDisciplineScore`.
- `spendBalance`: drops the `isInDefault` block; tab room is `IOU_CAP - debt` instead of a score-gated limit.
- `checkInDaily`: no longer triggers interest/default checks; streak-gap reset unchanged.

`src/store/macroGoalStore.ts`: removed the `isInDefault` freeze guard in `addProgress`.

`src/store/timerStore.ts` / `src/store/taskStore.ts`: removed `recordFocusSession()` calls (its only job was interest/default bookkeeping, both gone).

No Supabase schema change — `syncEngine.ts` only ever synced `debt`, never the removed interest/score/default fields.

## 4. UI Changes
- `ProfileScreen.tsx`: "Credit Rating & Debt" → "Discipline Score & Tab"; rating badge is positive-only (Good/Great/Excellent, no red "Poor"/default tier); "Credit Limit" → flat "Tab Limit"; interest/default warning → neutral "You owe $X — future earnings go here first. No interest, no penalty."
- `StoreScreen.tsx`: "Buy on Credit" → "Put on Tab"; "Debt accrues daily interest" language removed; tab room computed from flat `IOU_CAP`.
- `DashboardScreen.tsx` / `AppNavigator.tsx`: debt indicator recolored from alarm-red to neutral blue, labeled "Tab: $X".

## 5. Task Checklist
- [x] Rework `economyStore.ts`: remove interest/default, add `IOU_CAP`, rename credit score to discipline score
- [x] Remove `isInDefault` guard in `macroGoalStore.ts`
- [x] Remove `recordFocusSession` call sites
- [x] Update `ProfileScreen.tsx` widget
- [x] Update `StoreScreen.tsx` redeem flow
- [x] Soften debt copy in `DashboardScreen.tsx` / `AppNavigator.tsx`
- [x] Typecheck verification (`npx tsc --noEmit`)

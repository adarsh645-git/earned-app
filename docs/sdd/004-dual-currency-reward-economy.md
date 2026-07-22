# SDD: Dual-Currency Reward Economy & Entertainment Completion Loop

## 1. Feature Overview
Redesign the Earned app's reward system from a single Dollar currency to a **dual-currency economy**:
1. **Hours (`hoursBalance`)**: Currency spent strictly on leisure/entertainment time. Earned by focusing on productive tasks (`earner` tags).
2. **Dollars (`dollarBalance`)**: Currency spent on material purchases in the Reward Store. Earned via macro goal milestone completion (productive + entertainment) and daily check-ins ($0.04).

This design applies behavioral economics concepts of **mental accounting** (separating fun budget from purchasing power) and the **completion effect** (rewarding the completion of entertainment projects like video games or TV series to eliminate guilt and motivate finish rates).

---

## 2. Business & Economic Rules

### A. Dual Currencies
- **Hours**:
  - Tracked internally in minutes for precision (`hoursBalanceMinutes`), displayed in hours (`3.5h`).
  - Hard money currency — **no debt/credit allowed**. If balance is insufficient, starting a burner timer is strictly blocked.
  - Conversion rate from focus time depends on streak:
    - **Streak 0–6 days**: **2:1** (120 min focus = 60 min entertainment)
    - **Streak 7–13 days**: **3:2** (90 min focus = 60 min entertainment)
    - **Streak 14+ days**: **1:1** (60 min focus = 60 min entertainment)
- **Dollars**:
  - Saved for physical/material rewards in the Reward Store.
  - Soft money currency — **credit/debt system retained** (dynamic credit score 300-850, limits, daily interest, garnishment, default lockouts).
  - Payouts come from:
    1. Daily check-in ($0.04)
    2. Macro goal milestones (25%, 50%, 75%, 100% of target minutes pay out Dollars for both productive and entertainment goals)
  - Planning creation bounties ($0.02/task) are **removed**.

### B. Entertainment Completion Loop
- Entertainment activities (e.g. "Complete Elden Ring") are registered as **Macro Goals** with `type = 'entertainment'`.
- Starting a focus timer on a `burner` task linked to an entertainment macro goal:
  1. Deducts Hours from `hoursBalance`.
  2. Logs completed minutes toward the entertainment macro goal.
- Hitting 25%, 50%, 75%, and 100% milestones on an entertainment macro goal awards Dollar bonuses, funding future material purchases or new games.

---

## 3. Storage & State Management

### A. `economyStore.ts`
- Add `hoursBalanceMinutes: number`
- Add `addHours(minutes: number): void`
- Add `spendHours(minutes: number): boolean`
- Add `getConversionRate(): { ratioString: string, focusRatio: number, leisureRatio: number }`
- Modify `recordFocusSession(tagType: 'earner' | 'burner', durationMinutes: number)`
- Remove `creationDollarsEarnedToday`, `lastCreationDate`, and `recordTaskCreationReward`

### B. `macroGoalStore.ts`
- Add `type: 'productive' | 'entertainment'` field to `MacroGoal` interface

### C. `timerStore.ts`
- Integrate pre-start balance check for `burner` timers (block if `hoursBalanceMinutes < estimatedMinutes`)
- Auto-deduct Hours and auto-log macro goal progress on completion

---

## 4. Database Schema Changes (Supabase Patch)
The database must be patched incrementally using `supabase_patch_dual_currency.sql`:
1. `public.profiles`:
   - Add column `hours_balance_minutes INTEGER DEFAULT 0`
   - Drop column `creation_dollars_earned_today`
2. `public.macro_goals`:
   - Add column `goal_type TEXT DEFAULT 'productive' CHECK (goal_type IN ('productive', 'entertainment'))`

---

## 5. UI Layout & Navigation
1. **Dashboard Header**:
   - Two pills: ⏱ `3.5h` (Cyan `#5AC8FA`) and 💲 `$12.40` (Green `#30D158`).
2. **Dashboard Goals**:
   - "Pyramid Targets" (Purple `#BF5AF2`) for productive goals.
   - "Entertainment" (Cyan `#5AC8FA`) for entertainment goals.
3. **Dashboard Daily Discipline**:
   - Single row: "Daily Check-In" ($0.04).
4. **Reward Store Screen**:
   - Apple Segmented Control Tab Picker: `Time Rewards` vs `Material Rewards`.
   - **Time Rewards Tab**: Cyan Hours balance banner, current conversion rate, list of active entertainment projects, and `+ Add Project` button.
   - **Material Rewards Tab**: Green Cash balance banner, outstanding debt warning, material items list, and `+ Add Item` button.

---

## 6. Task Checklist
- [ ] Create database patch script `supabase_patch_dual_currency.sql`
- [ ] Update `economyStore.ts` with `hoursBalanceMinutes` & streak conversion rates
- [ ] Update `macroGoalStore.ts` to support `type: 'productive' | 'entertainment'`
- [ ] Integrate hard-block & auto-deduction in `timerStore.ts` / `TimerOverlay.tsx`
- [ ] Update `DashboardScreen.tsx` (dual pills, split goal sections, updated discipline group)
- [ ] Update `StoreScreen.tsx` with grouped "Time Rewards" & "Material Rewards" sections
- [ ] Typecheck verification (`npx tsc --noEmit`)

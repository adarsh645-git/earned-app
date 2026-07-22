# SDD: Long-Term Goal Milestone Rewards

## 1. Feature Overview
Allows users to chew through long-term (Pyramid) goals slowly and receive progressive key rewards upon unlocking 25%, 50%, 75%, and 100% completion milestones.

## 2. Technical Architecture & Reward Scaling
- **Total Bonus Keys**: Equal to total target hours (`targetMinutes / 60`).
- **Milestone Tranches**:
  - `25%`: 20% of bonus keys
  - `50%`: 20% of bonus keys
  - `75%`: 20% of bonus keys
  - `100%`: 40% of bonus keys (completion jackpot)

## 3. Storage & State Management
- `macroGoalStore.ts`: Tracks `unlockedMilestones` (`[25, 50, 75, 100]`) on `MacroGoal`. Auto-credits keys to `economyStore`.
- `timerStore.ts`: Captures milestone completion results during session completion (`completeSession()`).

## 4. UI Components
- `MilestoneModal.tsx`: Celebratory popup upon crossing milestones.
- `DashboardScreen.tsx` & `ProfileScreen.tsx`: Milestone badges below progress bars (`✓ 25% (+10🔑)` vs `🔒 50% (+10🔑)`).

## 5. Task Checklist
- [x] Implement milestone bonus formula in `macroGoalStore.ts`
- [x] Auto-credit bonus keys on milestone threshold crossing
- [x] Create celebratory `MilestoneModal.tsx` overlay
- [x] Add milestone badges to Pyramid Target progress cards
- [x] Typecheck verification (`npx tsc --noEmit`)

# SDD: Daily Check-in & Planning Creation Rewards

## 1. Feature Overview
To overcome the initial friction of logging into the app daily and planning tasks, users receive instant positive reinforcement for:
1. Opening the app daily (**Daily Check-in Reward**: +2 Keys).
2. Creating focus tasks (**Planning Creation Bounty**: +1 Key per task created, max 3 Keys/day).
3. **Grace Period / Re-entry Shield**: Missing 1 day grace period prevents devastating 0-streak resets and offers a "Welcome Back" re-entry bonus to protect long-term habit formation.

## 2. Business & Economic Rules
- **Daily Check-in**: On first app launch of a calendar day, award **+2 Keys** automatically and increment/protect the daily streak.
- **Grace Period (Streak Shield)**: If 1 day is missed (e.g. 48h gap), the streak is preserved with a 1-day grace flag instead of immediately resetting to 0. A "Welcome Back! Keep the Momentum" prompt is displayed.
- **Planning Bounty**:
  - Max **3 Keys per calendar day** earned via task creation.
  - Track `creationKeysEarnedToday` in `economyStore` (resets daily).
  - Each new task created adds **+1 Key** until the daily max of 3 is reached.

## 3. Storage & State Management
- Extend `economyStore.ts`:
  - `lastCheckInDate: string | null`
  - `creationKeysEarnedToday: number`
  - `lastCreationDate: string | null`
  - `gracePeriodUsed: boolean`
  - `checkInDaily: () => { rewarded: boolean, streak: number, isWelcomeBack: boolean }`
  - `recordTaskCreationReward: () => { rewarded: boolean, keysLeftToday: number }`

## 4. UI Components & Notifications
- **`CheckInModal.tsx`**: Celebratory modal on first app launch of the day displaying check-in reward (+2 Keys), current streak, and streak shield status.
- **Toast / Banner Notification**: Interactive toast notification on task creation showing `+1 Key Earned for Planning! (X/3 today)`.
- **Dashboard Check-in Indicator**: Visual badge on the Dashboard showing today's check-in & planning reward status.

## 5. Task Checklist
- [ ] Add check-in & task creation reward state to `economyStore.ts`
- [ ] Create `CheckInModal.tsx` popup for daily launch check-ins
- [ ] Create `RewardToast.tsx` component for floating notification toasts
- [ ] Trigger check-in on app boot in `App.tsx` / `AppNavigator.tsx`
- [ ] Connect task creation rewards in `TasksScreen.tsx`
- [ ] Add Daily Planning Allowance widget / indicator to `DashboardScreen.tsx`
- [ ] Typecheck verification (`npx tsc --noEmit`)

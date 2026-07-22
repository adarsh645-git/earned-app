# SDD: Dopamine-Driven Journey Creation & Completion Loop Gamification

## 1. Feature Overview
Transforms Journey creation and progress into an addictive, habit-forming feedback loop:
- **"🚀 Journey Launched!" Celebration Modal**: Triggered upon creating a Journey or Sub-Goal bucket, displaying projected key/cash bounties, target metrics, category icons, and a full confetti particle explosion (`confettiStore`).
- **RPG Quest Log Aesthetic**: Apple Fitness dark-mode cards enhanced with RPG quest styling (category badges e.g. 📚 *Books*, 🏋️ *Fitness*, 📈 *Stocks*, quest level progress bars, target bounty badges, status indicators).
- **Completion Milestone Celebrations & Cash Payout Toasts**:
  - Item completion triggers a subtle glowing scale feedback.
  - 100% Sub-Goal or Journey completion triggers a full-screen confetti burst and a cash credit banner toast (+ $X.XX / + Keys added to balance).

## 2. Technical Architecture & Data Schema
- **Confetti Engine (`src/store/confettiStore.ts`)**:
  - Integrate `triggerConfetti()` call on Journey creation, Sub-Goal creation, and 100% item/goal completion.
- **UI Components & Gamification Utilities**:
  - `JourneyCelebrationModal`: Popup modal with animated badge, projected bounty calculation, and "Launch Quest" celebration.
  - `CompletionPayoutBanner`: Animated payout alert when completing sub-goals or milestones.
  - Category icon mapping: `books` -> 📚, `games` -> 🎮, `fitness` -> 🏋️, `stocks` -> 📈, `courses` -> 🎓, `travel` -> ✈️, `other` -> ⭐️.

## 3. Implementation Checklist
- [x] Create `JourneyCelebrationModal` component for creation dopamine feedback
- [x] Add category emoji icons and RPG Quest Log badges to `CollectionsScreen.tsx`
- [x] Trigger `confettiStore` explosion upon Journey & Sub-Goal creation
- [x] Implement completion payout banner / haptic glow when completing 100% sub-goals
- [x] Verify typechecking with `npx tsc --noEmit`


# SDD: High-Density RPG Quest Cards & Glassmorphic Redesign for Journeys Tab

## 1. Feature Overview & Objectives
Redesign the Journeys screen (`CollectionsScreen.tsx`) to deliver an Apple-inspired dark-mode UI with high visual density, elevated typography, glassmorphic metrics summary header, and collapsible RPG sub-goal quest logs without altering existing Zustand store contracts or celebratory triggers.

### Objectives:
1. **Glassmorphism Executive Header**: Summary cards displaying total quests, active sub-goals, overall completion percentage, and time-frame filtering chips (All, This Year, This Month).
2. **High-Density RPG Quest Cards**: Dual-toned category vector icon badges (`#AF52DE` purple, `#5AC8FA` blue, etc.), quest title typography, linked Macro-Goal chip, options dropdown/action buttons, and smooth animated completion progress bars.
3. **Collapsible Sub-Goal Accordions**: Expandable sub-goal cards with target metric progress counters, inline completion badges, and task list items with haptic checkbox feedback.
4. **Quick-Add Action Chips**: Convenient inline "+ Sub-Goal" and "+ Task" action chips on each journey card to minimize modal friction.
5. **Zero Breaking Changes**: Retain full offline Zustand sync, Supabase compatibility, `confettiStore` dopamine bursts, and existing CRUD modals (`JourneyCelebrationModal`, edit/delete confirmation modals).

## 2. Technical Architecture & UI Components
- **Target File**: `src/screens/CollectionsScreen.tsx`
- **Sub-Components (Inline or Extracted)**:
  - `JourneyHeaderStats`: Summary dashboard stats bar.
  - `TimeframeFilterPills`: Quick filter buttons for All / Year / Month.
  - `JourneyQuestCard`: Modernized card component for each Journey/Collection.
  - `SubGoalAccordionItem`: Collapsible sub-goal view with item checkbox list.
  - Retain `CategoryVectorIcon` & `CelebrationVectorIcon` for vector icon support.

## 3. Implementation Checklist
- [x] Create `docs/sdd/007-journeys-tab-redesign.md` feature spec
- [x] Implement `JourneyHeaderStats` glassmorphism summary stats in `CollectionsScreen.tsx`
- [x] Upgrade Journey list item rendering with modern dark-mode cards (`#1C1C1E`), dual-tone category badges, and completion progress bars
- [x] Implement collapsible `SubGoalAccordionItem` with quick-add task chips and target metric badges
- [x] Preserve all existing CRUD modals, timeframe filtering logic, `triggerConfetti()` triggers, and Zustand state mutations
- [x] Run `npx tsc --noEmit` typecheck to confirm zero TypeScript compilation errors

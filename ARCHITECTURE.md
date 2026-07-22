# ARCHITECTURE.md - Earned App Codebase Map

> High-level guide mapping major directories, core stores, screens, components, and backend contracts to help AI agents navigate without broad codebase sweeps.

---

## 📁 Directory Overview

```
earned-app/
├── docs/sdd/                 # Feature specs & task checklists for Spec-Driven Development
├── src/
│   ├── components/           # UI components & interactive overlays
│   ├── lib/                  # Third-party initializations (Supabase client)
│   ├── navigation/           # App navigation structure
│   ├── screens/              # Top-level page/tab views
│   ├── store/                # Local-first Zustand stores & storage sync engine
│   └── utils/                # Helper utilities & math functions
└── supabase/                 # PostgreSQL schema, RLS policies, migrations, CLI config
```

---

## 🏬 Core State Stores (`src/store/`)

- **[authStore.ts](file:///Users/adarshreddy/Projects/earned-app/src/store/authStore.ts)**: Supabase user authentication state, session token storage, Google OAuth flow.
- **[economyStore.ts](file:///Users/adarshreddy/Projects/earned-app/src/store/economyStore.ts)**: Core economic balances (Hours Balance, Cash $, Streak Count, Indulgence Debt, level progression).
- **[taskStore.ts](file:///Users/adarshreddy/Projects/earned-app/src/store/taskStore.ts)**: Productive task management, check-in bounty creation, completion state.
- **[macroGoalStore.ts](file:///Users/adarshreddy/Projects/earned-app/src/store/macroGoalStore.ts)**: Pyramid Macro Goals / Journeys, long-term milestone tracking, auto-crediting logic.
- **[timerStore.ts](file:///Users/adarshreddy/Projects/earned-app/src/store/timerStore.ts)**: Focus lock timer state, active focus sessions, economic rate calculations.
- **[rewardStore.ts](file:///Users/adarshreddy/Projects/earned-app/src/store/rewardStore.ts)**: Indulgence rewards catalog, guilt-free consumption redemption logic.
- **[collectionStore.ts](file:///Users/adarshreddy/Projects/earned-app/src/store/collectionStore.ts)**: Milestone badges, collection items, unlockable achievements.
- **[syncEngine.ts](file:///Users/adarshreddy/Projects/earned-app/src/store/syncEngine.ts)**: Background sync engine bridging local Zustand state with Supabase PostgreSQL.
- **[safeStorage.ts](file:///Users/adarshreddy/Projects/earned-app/src/store/safeStorage.ts)**: Safe AsyncStorage wrapper for web/native cross-compatibility.

---

## 📱 Screens & UI Views (`src/screens/`)

- **[DashboardScreen.tsx](file:///Users/adarshreddy/Projects/earned-app/src/screens/DashboardScreen.tsx)**: Main overview tab showing active balances, daily check-in, focus quick-launch, and macro goal progress.
- **[TasksScreen.tsx](file:///Users/adarshreddy/Projects/earned-app/src/screens/TasksScreen.tsx)**: Productive task list, planning bounties, task filter/creation UI.
- **[StoreScreen.tsx](file:///Users/adarshreddy/Projects/earned-app/src/screens/StoreScreen.tsx)**: Indulgence catalog for spending Hours/Cash balance on guilt-free consumption.
- **[CollectionsScreen.tsx](file:///Users/adarshreddy/Projects/earned-app/src/screens/CollectionsScreen.tsx)**: Badges, achievements, and unlocked progression rewards view.
- **[ProfileScreen.tsx](file:///Users/adarshreddy/Projects/earned-app/src/screens/ProfileScreen.tsx)**: User profile, economic statistics, sync status, and account settings.

---

## 🎨 Components & Overlays (`src/components/`)

- **[TimerOverlay.tsx](file:///Users/adarshreddy/Projects/earned-app/src/components/TimerOverlay.tsx)**: Fullscreen focus lock timer overlay with session progress.
- **[CheckInModal.tsx](file:///Users/adarshreddy/Projects/earned-app/src/components/CheckInModal.tsx)**: Daily check-in bonus modal UI.
- **[AuthModal.tsx](file:///Users/adarshreddy/Projects/earned-app/src/components/AuthModal.tsx)**: Authentication modal for signing in via Supabase / Google OAuth.
- **[AnimatedMacroGoalCard.tsx](file:///Users/adarshreddy/Projects/earned-app/src/components/AnimatedMacroGoalCard.tsx)**: Macro goal progress card component.
- **[AnimatedTaskRow.tsx](file:///Users/adarshreddy/Projects/earned-app/src/components/AnimatedTaskRow.tsx)**: Animated list row component for tasks.

---

## 🗄️ Backend & Database (`supabase/`)

- **[schema.sql](file:///Users/adarshreddy/Projects/earned-app/supabase/schema.sql)**: Baseline Supabase PostgreSQL schema and Row-Level Security (RLS) policies.
- **[migrations/](file:///Users/adarshreddy/Projects/earned-app/supabase/migrations/)**: Incremental database schema migration scripts.
- **[lib/supabase.ts](file:///Users/adarshreddy/Projects/earned-app/src/lib/supabase.ts)**: Supabase client initialization.

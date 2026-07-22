# SDD: Focus Lock Timer & Economy System

## 1. Feature Overview
Strict discipline-first focus timer overlay. Rewards users with Keys based on uninterrupted focus time, featuring tiered multiplier rates (1.0x, 1.5x, 2.0x).

## 2. Economic Formula
- **1 - 30 mins**: 1.0x Key rate (1 min = 1 key)
- **30 - 60 mins**: 1.5x Key rate
- **60+ mins**: 2.0x Key rate

## 3. Storage & State Management
- `timerStore.ts`: Controls active countdown, bonus time, and session completion.
- `economyStore.ts`: Manages key balance, streaks, and penalties.
- `safeStorage.ts`: Zustand persistence with memory fallback.

## 4. Task Checklist
- [x] Create fullscreen focus lock modal overlay (`TimerOverlay.tsx`)
- [x] Implement countdown + count-up bonus timer state in `timerStore.ts`
- [x] Connect completed session rollup to `useEconomyStore` and `useTaskStore`
- [x] Implement `safeStorage` wrapper to handle storage exceptions

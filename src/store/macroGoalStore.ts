import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safeStorage';
import { useEconomyStore } from './economyStore';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export type UnlockedMilestoneInfo = {
  percentage: number;
  dollarsAwarded: number;
  goalTitle: string;
};

export type MacroGoalType = 'productive' | 'entertainment';

export type MacroGoal = {
  id: string;
  title: string;
  horizon: 'monthly' | 'yearly';
  targetMinutes: number; 
  completedMinutes: number; 
  unlockedMilestones: number[]; // e.g. [25, 50, 75, 100]
  type?: MacroGoalType;
};

export const getMilestoneDollars = (targetMinutes: number, milestone: number): number => {
  const totalBonusKeys = Math.max(1, Math.round(targetMinutes / 60));
  const keys25 = Math.round(totalBonusKeys * 0.2);
  const keys50 = Math.round(totalBonusKeys * 0.2);
  const keys75 = Math.round(totalBonusKeys * 0.2);
  const keys100 = totalBonusKeys - (keys25 + keys50 + keys75);

  let keys = 0;
  switch (milestone) {
    case 25: keys = keys25; break;
    case 50: keys = keys50; break;
    case 75: keys = keys75; break;
    case 100: keys = keys100; break;
  }

  // 1 Key = $0.02
  return Math.round((keys * 0.02) * 100) / 100;
};

interface MacroGoalState {
  macroGoals: MacroGoal[];
  addMacroGoal: (goal: Omit<MacroGoal, 'id' | 'completedMinutes' | 'unlockedMilestones'>) => void;
  addProgress: (id: string, minutes: number) => UnlockedMilestoneInfo[];
}

export const useMacroGoalStore = create<MacroGoalState>()(
  persist(
    (set, get) => ({
      macroGoals: [],
      addMacroGoal: (goal) => set((state) => ({
        macroGoals: [...state.macroGoals, { 
          ...goal, 
          id: uuidv4(),
          type: goal.type || 'productive',
          completedMinutes: 0,
          unlockedMilestones: [],
        }]
      })),
      addProgress: (id, minutes) => {
        // Block progress updates if currently in default
        if (useEconomyStore.getState().isInDefault) {
          return [];
        }

        const goal = get().macroGoals.find(g => g.id === id);
        if (!goal) return [];

        const oldMinutes = goal.completedMinutes;
        const newMinutes = oldMinutes + minutes;
        const target = goal.targetMinutes;
        const newPct = Math.min(100, Math.floor((newMinutes / target) * 100));

        const existingMilestones = goal.unlockedMilestones || [];
        const possibleMilestones = [25, 50, 75, 100];
        const newlyUnlocked: UnlockedMilestoneInfo[] = [];
        const updatedUnlocked = [...existingMilestones];

        possibleMilestones.forEach(m => {
          if (newPct >= m && !existingMilestones.includes(m)) {
            const dollars = getMilestoneDollars(target, m);
            newlyUnlocked.push({
              percentage: m,
              dollarsAwarded: dollars,
              goalTitle: goal.title,
            });
            updatedUnlocked.push(m);
            // Award bonus dollars immediately to balance (garnish-safe)
            useEconomyStore.getState().addBalance(dollars);

            // Increment Discipline Score booster if 100% milestone reached
            if (m === 100) {
              useEconomyStore.getState().incrementCompletedMacroGoals();
            }
          }
        });

        set((state) => ({
          macroGoals: state.macroGoals.map(g =>
            g.id === id
              ? {
                  ...g,
                  completedMinutes: newMinutes,
                  unlockedMilestones: updatedUnlocked,
                }
              : g
          ),
        }));

        return newlyUnlocked;
      },
    }),
    {
      name: 'earned-macro-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

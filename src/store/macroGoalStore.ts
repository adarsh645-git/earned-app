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
  targetMinutes: number; // legacy/fallback for economy math
  completedMinutes: number; // legacy/fallback
  metricType?: 'minutes' | 'units';
  targetMetric?: number;
  completedMetric?: number;
  unlockedMilestones: number[]; // e.g. [25, 50, 75, 100]
  type?: MacroGoalType;
  parentId?: string; // If set, this is a sub-project nested under a parent MacroGoal
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
  addMacroGoal: (goal: Omit<MacroGoal, 'id' | 'completedMinutes' | 'completedMetric' | 'unlockedMilestones'>) => void;
  updateMacroGoal: (id: string, updates: Partial<MacroGoal>) => void;
  deleteMacroGoal: (id: string) => void;
  addProgress: (id: string, amount: number) => UnlockedMilestoneInfo[];
  removeProgress: (id: string, amount: number) => void;
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
          parentId: goal.parentId,
          completedMinutes: 0,
          completedMetric: 0,
          metricType: goal.metricType || 'minutes',
          unlockedMilestones: [],
        }]
      })),
      updateMacroGoal: (id, updates) => set((state) => ({
        macroGoals: state.macroGoals.map(g => g.id === id ? { ...g, ...updates } : g)
      })),
      deleteMacroGoal: (id) => set((state) => ({
        macroGoals: state.macroGoals.filter(g => g.id !== id)
      })),
      addProgress: (id, amount) => {
        // Block progress updates if currently in default
        if (useEconomyStore.getState().isInDefault) {
          return [];
        }

        const goal = get().macroGoals.find(g => g.id === id);
        if (!goal) return [];

        const isUnits = goal.metricType === 'units';
        
        let newPct = 0;
        let newMinutes = goal.completedMinutes;
        let newMetric = goal.completedMetric || 0;
        let targetForPayout = goal.targetMinutes;

        if (isUnits) {
          newMetric = newMetric + amount;
          const target = goal.targetMetric || 1;
          newPct = Math.min(100, Math.floor((newMetric / target) * 100));
          targetForPayout = (goal.targetMetric || 1) * 60; // Approximate 1 hour per unit for economy math fallback
        } else {
          newMinutes = newMinutes + amount;
          const target = goal.targetMinutes;
          newPct = Math.min(100, Math.floor((newMinutes / target) * 100));
        }

        const existingMilestones = goal.unlockedMilestones || [];
        const possibleMilestones = [25, 50, 75, 100];
        const newlyUnlocked: UnlockedMilestoneInfo[] = [];
        const updatedUnlocked = [...existingMilestones];

        possibleMilestones.forEach(m => {
          if (newPct >= m && !existingMilestones.includes(m)) {
            const dollars = getMilestoneDollars(targetForPayout, m);
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
              ? { ...g, completedMinutes: newMinutes, completedMetric: newMetric, unlockedMilestones: updatedUnlocked }
              : g
          ),
        }));

        return newlyUnlocked;
      },
      removeProgress: (id, amount) => {
        const goal = get().macroGoals.find(g => g.id === id);
        if (!goal) return;

        const isUnits = goal.metricType === 'units';
        
        let newPct = 0;
        let newMinutes = goal.completedMinutes;
        let newMetric = goal.completedMetric || 0;
        let targetForPayout = goal.targetMinutes;

        if (isUnits) {
          newMetric = Math.max(0, newMetric - amount);
          const target = goal.targetMetric || 1;
          newPct = Math.min(100, Math.floor((newMetric / target) * 100));
          targetForPayout = (goal.targetMetric || 1) * 60; 
        } else {
          newMinutes = Math.max(0, newMinutes - amount);
          const target = goal.targetMinutes;
          newPct = Math.min(100, Math.floor((newMinutes / target) * 100));
        }

        const existingMilestones = goal.unlockedMilestones || [];
        const possibleMilestones = [25, 50, 75, 100];
        const updatedUnlocked = [...existingMilestones];

        possibleMilestones.forEach(m => {
          // If we had unlocked this milestone previously, but our new percentage has dropped below it...
          if (existingMilestones.includes(m) && newPct < m) {
            const dollars = getMilestoneDollars(targetForPayout, m);
            // Remove the milestone from the active array
            const idx = updatedUnlocked.indexOf(m);
            if (idx > -1) {
              updatedUnlocked.splice(idx, 1);
            }
            // Revoke the bonus dollars
            useEconomyStore.getState().removeBalance(dollars);
            
            // Wait, we can't easily revoke the discipline score increment for 100%, 
            // but we can just leave it or decrement it if we wanted. For now, just revoke money.
          }
        });

        set((state) => ({
          macroGoals: state.macroGoals.map(g =>
            g.id === id
              ? { ...g, completedMinutes: newMinutes, completedMetric: newMetric, unlockedMilestones: updatedUnlocked }
              : g
          ),
        }));
      },
    }),
    {
      name: 'earned-macro-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

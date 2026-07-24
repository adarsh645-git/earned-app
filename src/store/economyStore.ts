import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safeStorage';

export interface CheckInResult {
  rewarded: boolean;
  dollarsAwarded: number;
  streak: number;
  isWelcomeBack: boolean;
}

export interface TaskCreationRewardResult {
  rewarded: boolean;
  dollarsLeftToday: number;
  totalEarnedToday: number;
}

export interface ConversionRateInfo {
  ratioString: string;
  focusRatio: number;
  leisureRatio: number;
  multiplier: number; // Multiply focus minutes by this to get leisure minutes earned
}

export interface EconomyState {
  dollarBalance: number;
  hoursBalanceMinutes: number;
  streak: number;
  lastActiveDate: string | null;
  lastCheckInDate: string | null;
  gracePeriodUsed: boolean;

  // Interest-free IOU on Dollars only — a flat-capped tab, repaid automatically
  // from future earnings (garnishment in addBalance). No interest, no default/lockout.
  debt: number;
  debtTakenDate: string | null;
  completedTasksCount: number;
  completedMacroGoalsCount: number;
  entertainmentClawbackApplied: boolean;

  // Getters
  getDisciplineScore: () => number;
  getConversionRate: () => ConversionRateInfo;

  // Actions
  addBalance: (amount: number) => void;
  removeBalance: (amount: number) => void;
  spendBalance: (amount: number, allowDebt: boolean) => boolean;
  addHours: (minutes: number) => void;
  removeHours: (minutes: number) => void;
  spendHours: (minutes: number) => boolean;
  incrementCompletedTasks: () => void;
  decrementCompletedTasks: () => void;
  incrementCompletedMacroGoals: () => void;
  incrementStreak: () => void;
  checkInDaily: () => CheckInResult;
  clearDebtForTesting: () => void;
  applyEntertainmentClawback: () => void;
}

// Flat tab limit for the interest-free Dollar IOU. Deliberately not score-gated —
// the tab is a fixed, predictable ceiling, not a punishment lever.
export const IOU_CAP = 25.0;

// Historical payout formula, frozen as of the entertainment reward-asymmetry fix.
// Used only once, to claw back Dollars already paid out under the old (type-agnostic)
// milestone rule. Must NOT be updated if the live formula in macroGoalStore changes later.
const calculateLegacyEntertainmentMilestoneDollars = (targetMinutes: number, milestone: number): number => {
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

  return Math.round(keys * 0.02 * 100) / 100;
};

// Discipline score: pure positive feedback signal. Never gates anything (no borrow
// limit, no penalty) — it only ever goes up with real activity.
export const calculateDisciplineScore = (state: {
  streak: number;
  completedTasksCount: number;
  completedMacroGoalsCount: number;
}): number => {
  let score = 600; // Base score
  score += Math.min(150, state.streak * 10);
  score += Math.min(100, state.completedTasksCount * 5);
  score += Math.min(200, state.completedMacroGoalsCount * 50);

  return Math.max(300, Math.min(850, score));
};

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      dollarBalance: 0,
      hoursBalanceMinutes: 0,
      streak: 0,
      lastActiveDate: null,
      lastCheckInDate: null,
      gracePeriodUsed: false,

      // Interest-free Dollar IOU
      debt: 0,
      debtTakenDate: null,
      completedTasksCount: 0,
      completedMacroGoalsCount: 0,
      entertainmentClawbackApplied: false,

      getDisciplineScore: () => {
        const { streak, completedTasksCount, completedMacroGoalsCount } = get();
        return calculateDisciplineScore({ streak, completedTasksCount, completedMacroGoalsCount });
      },

      getConversionRate: () => {
        const streak = get().streak;
        if (streak >= 14) {
          return { ratioString: '1:1', focusRatio: 1, leisureRatio: 1, multiplier: 1.0 };
        }
        if (streak >= 7) {
          return { ratioString: '3:2', focusRatio: 3, leisureRatio: 2, multiplier: 2 / 3 };
        }
        return { ratioString: '2:1', focusRatio: 2, leisureRatio: 1, multiplier: 0.5 };
      },

      addBalance: (amount) => set((state) => {
        let payment = amount;
        let newDebt = state.debt;
        let newBalance = state.dollarBalance;

        // 100% Garnishment: pay off debt first
        if (newDebt > 0) {
          if (payment <= newDebt) {
            newDebt -= payment;
            payment = 0;
          } else {
            payment -= newDebt;
            newDebt = 0;
          }
        }

        newBalance += payment;

        // Round to 2 decimal places
        newBalance = Math.round(newBalance * 100) / 100;
        newDebt = Math.round(newDebt * 100) / 100;

        return {
          dollarBalance: newBalance,
          debt: newDebt,
          debtTakenDate: newDebt === 0 ? null : state.debtTakenDate,
        };
      }),

      removeBalance: (amount) => set((state) => {
        // Simple deduction from balance; could put them in debt theoretically,
        // but for now we just deduct to 0 to prevent negative cash if they spent it.
        // If they already spent it, they shouldn't be able to un-check, but we'll 
        // deduct as much as we can.
        let newBalance = state.dollarBalance - amount;
        if (newBalance < 0) newBalance = 0; // Prevent negative balance from revokes
        return { dollarBalance: Math.round(newBalance * 100) / 100 };
      }),

      spendBalance: (amount, allowDebt) => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];

        if (!allowDebt) {
          if (state.dollarBalance >= amount) {
            set({ dollarBalance: Math.round((state.dollarBalance - amount) * 100) / 100 });
            return true;
          }
          return false;
        }

        // Put the shortfall on the flat, interest-free tab
        const cashUsed = Math.min(state.dollarBalance, amount);
        const debtNeeded = amount - cashUsed;

        if (state.debt + debtNeeded <= IOU_CAP) {
          const isNewDebt = state.debt === 0 && debtNeeded > 0;
          set({
            dollarBalance: Math.round((state.dollarBalance - cashUsed) * 100) / 100,
            debt: Math.round((state.debt + debtNeeded) * 100) / 100,
            debtTakenDate: isNewDebt ? today : state.debtTakenDate,
          });
          return true;
        }

        return false;
      },

      addHours: (minutes) => set((state) => ({
        hoursBalanceMinutes: Math.max(0, state.hoursBalanceMinutes + Math.round(minutes))
      })),

      removeHours: (minutes) => set((state) => ({
        hoursBalanceMinutes: Math.max(0, state.hoursBalanceMinutes - Math.round(minutes))
      })),

      spendHours: (minutes) => {
        const state = get();
        if (state.hoursBalanceMinutes >= minutes) {
          set({ hoursBalanceMinutes: state.hoursBalanceMinutes - Math.round(minutes) });
          return true;
        }
        return false;
      },

      incrementCompletedTasks: () => set((state) => ({
        completedTasksCount: state.completedTasksCount + 1
      })),

      decrementCompletedTasks: () => set((state) => ({
        completedTasksCount: Math.max(0, state.completedTasksCount - 1)
      })),

      incrementCompletedMacroGoals: () => set((state) => ({
        completedMacroGoalsCount: state.completedMacroGoalsCount + 1
      })),

      clearDebtForTesting: () => set({
        debt: 0,
        debtTakenDate: null,
      }),

      applyEntertainmentClawback: () => {
        if (get().entertainmentClawbackApplied) return;

        // Required to avoid a circular import with macroGoalStore, which imports this store.
        const { useMacroGoalStore } = require('./macroGoalStore');
        const macroGoals = useMacroGoalStore.getState().macroGoals;

        let totalToClawBack = 0;
        macroGoals
          .filter((g: { type?: string }) => g.type === 'entertainment')
          .forEach((g: { targetMinutes: number; unlockedMilestones: number[] }) => {
            (g.unlockedMilestones || []).forEach((m: number) => {
              totalToClawBack += calculateLegacyEntertainmentMilestoneDollars(g.targetMinutes, m);
            });
          });

        if (totalToClawBack > 0) {
          get().removeBalance(Math.round(totalToClawBack * 100) / 100);
        }

        set({ entertainmentClawbackApplied: true });
      },

      incrementStreak: () => set((state) => {
        const today = new Date().toISOString().split('T')[0];
        if (state.lastActiveDate === today) return state;
        return {
          streak: state.streak + 1,
          lastActiveDate: today
        };
      }),

      checkInDaily: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];

        // Already checked in today
        if (state.lastCheckInDate === today) {
          return {
            rewarded: false,
            dollarsAwarded: 0,
            streak: state.streak,
            isWelcomeBack: false,
          };
        }

        let newStreak = state.streak;
        let isWelcomeBack = false;
        let graceUsed = state.gracePeriodUsed;

        if (state.lastCheckInDate) {
          const lastDate = new Date(state.lastCheckInDate);
          const currentDate = new Date(today);
          const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            newStreak += 1;
            graceUsed = false;
          } else if (diffDays === 2) {
            isWelcomeBack = true;
            graceUsed = true;
          } else {
            newStreak = 1;
            graceUsed = false;
          }
        } else {
          newStreak = 1;
        }

        const dollarsAwarded = 0.04; // $0.04 check-in reward

        set({
          streak: newStreak,
          lastActiveDate: today,
          lastCheckInDate: today,
          gracePeriodUsed: graceUsed,
        });

        // Add award (garnish-safe)
        get().addBalance(dollarsAwarded);

        return {
          rewarded: true,
          dollarsAwarded,
          streak: newStreak,
          isWelcomeBack,
        };
      },
    }),
    {
      name: 'earned-economy-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

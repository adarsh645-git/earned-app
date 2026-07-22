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

  // New Credit Economy Variables
  debt: number;
  historyOfDefaults: number;
  lastFocusDate: string | null;
  debtTakenDate: string | null;
  lastInterestAppliedDate: string | null;
  streakResetsCount: number;
  isInDefault: boolean;
  completedTasksCount: number;
  completedMacroGoalsCount: number;

  // Getters
  getCreditScore: () => number;
  getCreditLimit: (score: number) => number;
  getDailyInterestRate: (score: number) => number;
  getConversionRate: () => ConversionRateInfo;

  // Actions
  addBalance: (amount: number) => void;
  spendBalance: (amount: number, allowDebt: boolean) => boolean;
  addHours: (minutes: number) => void;
  spendHours: (minutes: number) => boolean;
  recordFocusSession: () => void;
  incrementCompletedTasks: () => void;
  incrementCompletedMacroGoals: () => void;
  applyPenalty: () => void;
  incrementStreak: () => void;
  checkInDaily: () => CheckInResult;
  applyDailyInterestAndCheckDefaults: () => void;
  clearDebtForTesting: () => void;
}

// Discipline score dynamic calculation
export const calculateCreditScore = (state: {
  streak: number;
  completedTasksCount: number;
  completedMacroGoalsCount: number;
  historyOfDefaults: number;
  streakResetsCount: number;
  isInDefault: boolean;
}): number => {
  if (state.isInDefault) return 300;

  let score = 600; // Base score
  score += Math.min(150, state.streak * 10);
  score += Math.min(100, state.completedTasksCount * 5);
  score += Math.min(200, state.completedMacroGoalsCount * 50);
  score -= state.historyOfDefaults * 100;
  score -= state.streakResetsCount * 20;

  return Math.max(300, Math.min(850, score));
};

export const getCreditLimitByScore = (score: number): number => {
  if (score >= 750) return 50.00; // Excellent
  if (score >= 650) return 25.00; // Good
  if (score >= 580) return 10.00; // Fair
  return 0.00;                    // Poor / Delinquent
};

export const getDailyInterestRateByScore = (score: number): number => {
  if (score >= 750) return 0.0005; // 0.05% daily (~18% APR)
  if (score >= 650) return 0.0010; // 0.10% daily (~36.5% APR)
  if (score >= 580) return 0.0020; // 0.20% daily (~73% APR)
  return 0.0030;                   // 0.30% daily (~109.5% APR)
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

      // New Credit variables
      debt: 0,
      historyOfDefaults: 0,
      lastFocusDate: null,
      debtTakenDate: null,
      lastInterestAppliedDate: null,
      streakResetsCount: 0,
      isInDefault: false,
      completedTasksCount: 0,
      completedMacroGoalsCount: 0,

      getCreditScore: () => {
        const { streak, completedTasksCount, completedMacroGoalsCount, historyOfDefaults, streakResetsCount, isInDefault } = get();
        return calculateCreditScore({ streak, completedTasksCount, completedMacroGoalsCount, historyOfDefaults, streakResetsCount, isInDefault });
      },

      getCreditLimit: (score) => getCreditLimitByScore(score),
      getDailyInterestRate: (score) => getDailyInterestRateByScore(score),

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

      spendBalance: (amount, allowDebt) => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];

        if (state.isInDefault) {
          // Blocked from any transaction if in default
          return false;
        }

        if (!allowDebt) {
          if (state.dollarBalance >= amount) {
            set({ dollarBalance: Math.round((state.dollarBalance - amount) * 100) / 100 });
            return true;
          }
          return false;
        }

        // Allow Debt accumulation
        const cashUsed = Math.min(state.dollarBalance, amount);
        const debtNeeded = amount - cashUsed;

        const currentScore = get().getCreditScore();
        const creditLimit = getCreditLimitByScore(currentScore);

        if (state.debt + debtNeeded <= creditLimit) {
          const isNewDebt = state.debt === 0 && debtNeeded > 0;
          set({
            dollarBalance: Math.round((state.dollarBalance - cashUsed) * 100) / 100,
            debt: Math.round((state.debt + debtNeeded) * 100) / 100,
            debtTakenDate: isNewDebt ? today : state.debtTakenDate,
            lastInterestAppliedDate: isNewDebt ? today : state.lastInterestAppliedDate,
          });
          return true;
        }

        return false;
      },

      addHours: (minutes) => set((state) => ({
        hoursBalanceMinutes: Math.max(0, state.hoursBalanceMinutes + Math.round(minutes))
      })),

      spendHours: (minutes) => {
        const state = get();
        if (state.hoursBalanceMinutes >= minutes) {
          set({ hoursBalanceMinutes: state.hoursBalanceMinutes - Math.round(minutes) });
          return true;
        }
        return false;
      },

      recordFocusSession: () => {
        const today = new Date().toISOString().split('T')[0];
        set({ lastFocusDate: today });
        // Trigger interest accrual and default check on activity
        get().applyDailyInterestAndCheckDefaults();
      },

      incrementCompletedTasks: () => set((state) => ({
        completedTasksCount: state.completedTasksCount + 1
      })),

      incrementCompletedMacroGoals: () => set((state) => ({
        completedMacroGoalsCount: state.completedMacroGoalsCount + 1
      })),

      clearDebtForTesting: () => set({
        debt: 0,
        isInDefault: false,
        debtTakenDate: null,
        lastInterestAppliedDate: null,
      }),

      applyPenalty: () => set((state) => ({ 
        dollarBalance: Math.round((state.dollarBalance * 0.9) * 100) / 100 
      })),

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

        // Ensure interest is applied daily on check-in
        get().applyDailyInterestAndCheckDefaults();

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
        let resetsCount = state.streakResetsCount;

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
            // Streak reset penalty
            newStreak = 1;
            graceUsed = false;
            resetsCount += 1;
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
          streakResetsCount: resetsCount,
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

      applyDailyInterestAndCheckDefaults: () => {
        const state = get();
        if (state.debt <= 0) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const lastInterestStr = state.lastInterestAppliedDate || todayStr;

        const today = new Date(todayStr);
        const lastInterest = new Date(lastInterestStr);
        
        const diffTime = today.getTime() - lastInterest.getTime();
        const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let currentDebt = state.debt;
        let lastInterestDate = lastInterestStr;

        // 1. Accrue Interest
        if (daysElapsed > 0) {
          const score = get().getCreditScore();
          const dailyRate = getDailyInterestRateByScore(score);
          currentDebt = currentDebt * Math.pow(1 + dailyRate, daysElapsed);
          currentDebt = Math.round(currentDebt * 100) / 100;
          lastInterestDate = todayStr;
        }

        // 2. Check Strict Default (7 days without focus/repayment)
        let inDefault = state.isInDefault;
        let resetsCount = state.streakResetsCount;
        let defaultsCount = state.historyOfDefaults;
        let currentStreak = state.streak;

        if (!inDefault) {
          const baseReferenceDateStr = state.lastFocusDate || state.debtTakenDate || todayStr;
          const baseReferenceDate = new Date(baseReferenceDateStr);
          const timeSinceActivity = today.getTime() - baseReferenceDate.getTime();
          const daysSinceActivity = Math.floor(timeSinceActivity / (1000 * 60 * 60 * 24));

          if (daysSinceActivity >= 7) {
            inDefault = true;
            currentStreak = 0; // Streak wiped to 0
            resetsCount += 1;
            defaultsCount += 1;
            currentDebt = Math.round((currentDebt * 1.20) * 100) / 100; // 20% penalty fee
          }
        }

        set({
          debt: currentDebt,
          lastInterestAppliedDate: lastInterestDate,
          isInDefault: inDefault,
          streak: currentStreak,
          streakResetsCount: resetsCount,
          historyOfDefaults: defaultsCount,
        });
      },
    }),
    {
      name: 'earned-economy-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

import { create } from 'zustand';
import { useEconomyStore } from './economyStore';
import { useTaskStore } from './taskStore';
import { useMacroGoalStore, UnlockedMilestoneInfo } from './macroGoalStore';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type SessionCompletionResult = {
  dollarsEarned: number;
  hoursEarnedMinutes: number;
  unlockedMilestones: UnlockedMilestoneInfo[];
  tagType: 'earner' | 'burner';
};

export type StartTimerResult = {
  success: boolean;
  reason?: 'insufficient_hours';
  missingMinutes?: number;
};

interface TimerState {
  activeTaskId: string | null;
  isActive: boolean;
  secondsRemaining: number; // For countdown
  secondsElapsed: number; // Total seconds focused
  targetSeconds: number; // Target session length
  isBonus: boolean; // True when counting up (Bonus Time)
  recentCompletionResult: SessionCompletionResult | null;
  startTime: number | null; // Start timestamp (ms)
  scheduledNotificationId: string | null;
  startTimer: (taskId: string, targetMinutes: number) => StartTimerResult;
  tick: () => void;
  completeSession: () => SessionCompletionResult;
  clearCompletionResult: () => void;
  cancelSession: () => void;
  syncTimerFromBackground: () => void;
}

export const calculateDollarsEarned = (totalSeconds: number): number => {
  const totalMinutes = totalSeconds / 60;
  let dollars = 0;

  // New Tighter economy: $0.02 per min baseline, multiplier for long sessions
  if (totalMinutes <= 30) {
    // 1x rate ($0.02/min)
    dollars = totalMinutes * 0.02;
  } else if (totalMinutes <= 60) {
    // 30 mins at 1x, rest at 1.5x ($0.03/min)
    dollars = 30 * 0.02 + (totalMinutes - 30) * 0.03;
  } else {
    // 30 mins at 1x, 30 mins at 1.5x, rest at 2x ($0.04/min)
    dollars = 30 * 0.02 + 30 * 0.03 + (totalMinutes - 60) * 0.04;
  }

  // Round to 2 decimal places
  return Math.round(dollars * 100) / 100;
};

export const useTimerStore = create<TimerState>((set, get) => ({
  activeTaskId: null,
  isActive: false,
  secondsRemaining: 0,
  secondsElapsed: 0,
  targetSeconds: 0,
  isBonus: false,
  recentCompletionResult: null,
  startTime: null,
  scheduledNotificationId: null,

  startTimer: (taskId, targetMinutes) => {
    const task = useTaskStore.getState().tasks.find(t => t.id === taskId);
    const tag = task ? useTaskStore.getState().tags.find(t => t.id === task.tagId) : null;
    const isBurner = tag?.type === 'burner';

    // Hard block for burner tasks if hours balance is insufficient
    if (isBurner) {
      const hoursBalanceMinutes = useEconomyStore.getState().hoursBalanceMinutes;
      if (hoursBalanceMinutes < targetMinutes) {
        const missing = targetMinutes - hoursBalanceMinutes;
        return {
          success: false,
          reason: 'insufficient_hours',
          missingMinutes: missing,
        };
      }
    }

    const seconds = targetMinutes * 60;
    const now = Date.now();

    // Schedule background notification asynchronously using async/await inside an IIFE
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        let finalStatus = status;
        if (status !== 'granted') {
          const { status: askStatus } = await Notifications.requestPermissionsAsync();
          finalStatus = askStatus;
        }
        if (finalStatus === 'granted') {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: isBurner ? "Entertainment Session Complete! 🎮" : "Focus Block Complete! 🏆",
              body: isBurner ? "Hope you enjoyed your earned leisure time!" : "You finished your focus block. Entertainment hours credited!",
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: seconds,
            } as any,
          });
          set({ scheduledNotificationId: id });
        }
      } catch (err) {
        console.warn("Failed to schedule background notification:", err);
      }
    })();

    set({
      activeTaskId: taskId,
      isActive: true,
      secondsRemaining: seconds,
      secondsElapsed: 0,
      targetSeconds: seconds,
      isBonus: false,
      recentCompletionResult: null,
      startTime: now,
      scheduledNotificationId: null,
    });

    return { success: true };
  },

  tick: () => {
    const { isActive, startTime, targetSeconds } = get();
    if (!isActive || !startTime) return;

    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    if (elapsed >= targetSeconds) {
      set({
        secondsRemaining: 0,
        secondsElapsed: elapsed,
        isBonus: true,
      });
    } else {
      set({
        secondsRemaining: targetSeconds - elapsed,
        secondsElapsed: elapsed,
        isBonus: false,
      });
    }
  },

  completeSession: () => {
    const { activeTaskId, secondsElapsed, scheduledNotificationId } = get();
    if (!activeTaskId) return { dollarsEarned: 0, hoursEarnedMinutes: 0, unlockedMilestones: [], tagType: 'earner' };

    // Cancel notification
    if (scheduledNotificationId) {
      Notifications.cancelScheduledNotificationAsync(scheduledNotificationId).catch(() => {});
    }

    const minutesElapsed = Math.round(secondsElapsed / 60);

    // Identify task and tag type
    const task = useTaskStore.getState().tasks.find(t => t.id === activeTaskId);
    const tag = task ? useTaskStore.getState().tags.find(t => t.id === task.tagId) : null;
    const tagType: 'earner' | 'burner' = tag?.type || 'earner';

    let hoursEarnedMinutes = 0;

    if (tagType === 'earner') {
      // Calculate leisure time earned based on streak conversion multiplier
      const conversionInfo = useEconomyStore.getState().getConversionRate();
      hoursEarnedMinutes = Math.round(minutesElapsed * conversionInfo.multiplier);
      useEconomyStore.getState().addHours(hoursEarnedMinutes);
      
      // Update streak, record focus activity & discipline score counters
      useEconomyStore.getState().incrementStreak();
      useEconomyStore.getState().recordFocusSession();
      useEconomyStore.getState().incrementCompletedTasks();
    } else {
      // Burner: Spend entertainment hours
      useEconomyStore.getState().spendHours(minutesElapsed);
    }

    // Mark task as completed (pass false to prevent manual payout logic)
    useTaskStore.getState().toggleTask(activeTaskId, false);

    // Roll up progress to Macro Goal if linked & capture milestone rewards (awards Dollars at milestones)
    let unlockedMilestones: UnlockedMilestoneInfo[] = [];
    if (task?.macroGoalId) {
      unlockedMilestones = useMacroGoalStore.getState().addProgress(task.macroGoalId, minutesElapsed);
    }

    const result: SessionCompletionResult = {
      dollarsEarned: 0, // Milestone rewards handled by addProgress
      hoursEarnedMinutes,
      unlockedMilestones,
      tagType,
    };

    // Reset timer and store completion result
    set({
      activeTaskId: null,
      isActive: false,
      secondsRemaining: 0,
      secondsElapsed: 0,
      targetSeconds: 0,
      isBonus: false,
      startTime: null,
      scheduledNotificationId: null,
      recentCompletionResult: result,
    });

    return result;
  },

  clearCompletionResult: () => {
    set({ recentCompletionResult: null });
  },

  cancelSession: () => {
    const { scheduledNotificationId } = get();
    if (scheduledNotificationId) {
      Notifications.cancelScheduledNotificationAsync(scheduledNotificationId).catch(() => {});
    }

    set({
      activeTaskId: null,
      isActive: false,
      secondsRemaining: 0,
      secondsElapsed: 0,
      targetSeconds: 0,
      isBonus: false,
      startTime: null,
      scheduledNotificationId: null,
    });
  },

  syncTimerFromBackground: () => {
    const { isActive, startTime, targetSeconds } = get();
    if (!isActive || !startTime) return;

    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    if (elapsed >= targetSeconds) {
      set({
        secondsRemaining: 0,
        secondsElapsed: elapsed,
        isBonus: true,
      });
    } else {
      set({
        secondsRemaining: targetSeconds - elapsed,
        secondsElapsed: elapsed,
        isBonus: false,
      });
    }
  },
}));

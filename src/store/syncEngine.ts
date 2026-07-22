import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useEconomyStore } from './economyStore';
import { useTaskStore, Task } from './taskStore';
import { useRewardStore, Reward } from './rewardStore';

export function useCloudSync() {
  const { user, initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialize Auth state on mount
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    // 1. Pull initial remote data on login
    pullCloudData(user.id);

    // 2. Subscribe to local store changes to push updates to Supabase
    const unsubEconomy = useEconomyStore.subscribe((state) => {
      pushEconomyToCloud(user.id, state);
    });

    const unsubTasks = useTaskStore.subscribe((state) => {
      pushAllTasksToCloud(user.id, state.tasks);
    });

    const unsubRewards = useRewardStore.subscribe((state) => {
      pushAllRewardsToCloud(user.id, state.rewards);
    });

    // 3. Subscribe to Realtime remote database changes
    const channel = supabase
      .channel(`user_sync_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', filter: `user_id=eq.${user.id}` },
        () => {
          pullCloudData(user.id);
        }
      )
      .subscribe();

    return () => {
      unsubEconomy();
      unsubTasks();
      unsubRewards();
      supabase.removeChannel(channel);
    };
  }, [user]);
}

export async function pullCloudData(userId: string) {
  try {
    // Fetch Profile Economy Data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      const localLastCheckIn = useEconomyStore.getState().lastCheckInDate;
      const cloudLastCheckIn = profile.last_check_in_date;
      const effectiveCheckInDate =
        cloudLastCheckIn && localLastCheckIn
          ? cloudLastCheckIn > localLastCheckIn
            ? cloudLastCheckIn
            : localLastCheckIn
          : cloudLastCheckIn || localLastCheckIn || null;

      useEconomyStore.setState({
        dollarBalance: parseFloat(profile.dollar_balance) || 0,
        hoursBalanceMinutes: parseInt(profile.hours_balance_minutes, 10) || 0,
        debt: parseFloat(profile.debt) || 0,
        streak: profile.streak ?? 1,
        lastCheckInDate: effectiveCheckInDate,
      });
    }

    // Fetch Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    if (tasks && tasks.length > 0) {
      const formattedTasks = tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        tagId: t.tag_id,
        macroGoalId: t.macro_goal_id,
        estimatedMinutes: t.estimated_minutes,
        completed: t.completed,
        isIcebox: t.is_icebox,
        dateCreated: t.date_created,
      }));
      useTaskStore.setState({ tasks: formattedTasks });
    }

    // Fetch Rewards
    const { data: rewards } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', userId);

    if (rewards && rewards.length > 0) {
      const formattedRewards = rewards.map((r: any) => ({
        id: r.id,
        title: r.title,
        cost: parseFloat(r.cost) || 0,
        dateCreated: r.date_created,
      }));
      useRewardStore.setState({ rewards: formattedRewards });
    }
  } catch (err) {
    console.log('Cloud sync info:', err);
  }
}

// ─── Cloud Write Push Methods ────────────────────────────────────────────────
export async function pushEconomyToCloud(userId: string, state: any) {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('profiles').upsert({
      id: userId,
      dollar_balance: state.dollarBalance,
      hours_balance_minutes: state.hoursBalanceMinutes,
      debt: state.debt,
      streak: state.streak,
      last_check_in_date: state.lastCheckInDate,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.log('Error pushing economy to cloud:', err);
  }
}

export async function pushAllTasksToCloud(userId: string, tasks: Task[]) {
  if (!isSupabaseConfigured() || tasks.length === 0) return;
  try {
    const payload = tasks.map((t) => ({
      id: t.id,
      user_id: userId,
      title: t.title,
      tag_id: t.tagId,
      macro_goal_id: t.macroGoalId || null,
      estimated_minutes: t.estimatedMinutes,
      completed: t.completed,
      is_icebox: t.isIcebox,
      date_created: t.dateCreated,
    }));
    await supabase.from('tasks').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.log('Error pushing tasks to cloud:', err);
  }
}

export async function pushAllRewardsToCloud(userId: string, rewards: Reward[]) {
  if (!isSupabaseConfigured() || rewards.length === 0) return;
  try {
    const payload = rewards.map((r) => ({
      id: r.id,
      user_id: userId,
      title: r.title,
      cost: r.cost,
      date_created: new Date().toISOString(),
    }));
    await supabase.from('rewards').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.log('Error pushing rewards to cloud:', err);
  }
}

import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useEconomyStore } from './economyStore';
import { useTaskStore, Task, Pillar, Tag } from './taskStore';
import { useRewardStore, Reward } from './rewardStore';
import { useMacroGoalStore, MacroGoal } from './macroGoalStore';
import { useCollectionStore, Collection, CollectionItem } from './collectionStore';

/**
 * Merges cloud rows into a local array by id instead of replacing it outright.
 * Cloud wins for ids present in both (it's the confirmed-synced source of
 * truth), but any local-only id (added but not yet reflected in this read)
 * is preserved rather than being wiped out by a stale snapshot.
 */
function mergeById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const merged = new Map(local.map((item) => [item.id, item]));
  for (const item of cloud) {
    merged.set(item.id, item);
  }
  return Array.from(merged.values());
}

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
      pushAllPillarsToCloud(user.id, state.pillars);
      pushAllTagsToCloud(user.id, state.tags);
    });

    const unsubRewards = useRewardStore.subscribe((state) => {
      pushAllRewardsToCloud(user.id, state.rewards);
    });

    const unsubMacroGoals = useMacroGoalStore.subscribe((state) => {
      pushAllMacroGoalsToCloud(user.id, state.macroGoals);
    });

    const unsubCollections = useCollectionStore.subscribe((state) => {
      pushAllCollectionsToCloud(user.id, state.collections, state.items);
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
      unsubMacroGoals();
      unsubCollections();
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
        collectionId: t.collection_id || undefined,
        estimatedMinutes: t.estimated_minutes,
        completed: t.completed,
        isIcebox: t.is_icebox,
        dateCreated: t.date_created,
      }));
      useTaskStore.setState((s) => ({ ...s, tasks: mergeById(s.tasks, formattedTasks) }));
    }

    // Fetch Pillars
    const { data: pillars } = await supabase
      .from('pillars')
      .select('*')
      .eq('user_id', userId);

    // Fetch Tags
    const { data: tags } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId);

    if ((pillars && pillars.length > 0) || (tags && tags.length > 0)) {
      useTaskStore.setState((s) => ({
        ...s,
        pillars: pillars && pillars.length > 0 ? mergeById(s.pillars, pillars.map((p: any) => ({
          id: p.id,
          name: p.name,
          isArchived: p.is_archived
        }))) : s.pillars,
        tags: tags && tags.length > 0 ? mergeById(s.tags, tags.map((t: any) => ({
          id: t.id,
          pillarId: t.pillar_id,
          name: t.name,
          type: t.type,
          isArchived: t.is_archived
        }))) : s.tags
      }));
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
      useRewardStore.setState((s) => ({ rewards: mergeById(s.rewards, formattedRewards) }));
    }

    // Fetch Macro Goals
    const { data: macroGoals } = await supabase
      .from('macro_goals')
      .select('*')
      .eq('user_id', userId);

    if (macroGoals && macroGoals.length > 0) {
      const formattedMacroGoals = macroGoals.map((g: any) => ({
        id: g.id,
        title: g.title,
        horizon: (g.horizon || 'monthly') as 'monthly' | 'yearly',
        targetMinutes: g.target_minutes || 0,
        completedMinutes: g.completed_minutes || 0,
        type: g.goal_type || 'productive',
        metricType: g.metric_type || 'minutes',
        targetMetric: g.target_metric || 0,
        completedMetric: g.completed_metric || 0,
        unlockedMilestones: g.unlocked_milestones || [],
        parentId: g.parent_id || undefined,
        paysCurrency: g.pays_currency !== false,
        category: g.category || undefined,
      }));
      useMacroGoalStore.setState((s) => ({ macroGoals: mergeById(s.macroGoals, formattedMacroGoals) }));
    }

    // Fetch Collections
    const { data: collections } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId);

    if (collections && collections.length > 0) {
      const formattedCollections = collections.map((c: any) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        macroGoalId: c.macro_goal_id,
        dateCreated: c.date_created,
      }));
      useCollectionStore.setState((s) => ({ ...s, collections: mergeById(s.collections, formattedCollections) }));

      // Fetch Journey Sub Goals
      const { data: subGoals } = await supabase
        .from('journey_sub_goals')
        .select('*')
        .in('collection_id', collections.map(c => c.id));

      if (subGoals && subGoals.length > 0) {
        const formattedSubGoals = subGoals.map((s: any) => ({
          id: s.id,
          collectionId: s.collection_id,
          title: s.title,
          targetMetric: s.target_metric,
          year: s.year,
          month: s.month,
          dateCreated: s.date_created,
        }));
        useCollectionStore.setState((s) => ({ ...s, subGoals: mergeById(s.subGoals, formattedSubGoals) }));
      }
    }

    // Fetch Collection Items
    if (collections && collections.length > 0) {
      const { data: items } = await supabase
        .from('collection_items')
        .select('*')
        .in('collection_id', collections.map(c => c.id));

      if (items && items.length > 0) {
        const formattedItems = items.map((i: any) => ({
          id: i.id,
          collectionId: i.collection_id,
          subGoalId: i.sub_goal_id || undefined,
          title: i.title,
          estimatedMinutes: i.estimated_minutes,
          completed: i.completed,
          isAddedLater: i.is_added_later,
          dateCreated: i.date_created,
        }));
        useCollectionStore.setState((s) => ({ ...s, items: mergeById(s.items, formattedItems) }));
      }
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
      collection_id: t.collectionId || null,
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

export async function pushAllPillarsToCloud(userId: string, pillars: Pillar[]) {
  if (!isSupabaseConfigured() || pillars.length === 0) return;
  try {
    const payload = pillars.map((p) => ({
      id: p.id,
      user_id: userId,
      name: p.name,
      is_archived: p.isArchived || false,
    }));
    await supabase.from('pillars').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.log('Error pushing pillars to cloud:', err);
  }
}

export async function pushAllTagsToCloud(userId: string, tags: Tag[]) {
  if (!isSupabaseConfigured() || tags.length === 0) return;
  try {
    const payload = tags.map((t) => ({
      id: t.id,
      user_id: userId,
      pillar_id: t.pillarId,
      name: t.name,
      type: t.type,
      is_archived: t.isArchived || false,
    }));
    await supabase.from('tags').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.log('Error pushing tags to cloud:', err);
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

export async function pushAllMacroGoalsToCloud(userId: string, goals: MacroGoal[]) {
  if (!isSupabaseConfigured() || goals.length === 0) return;
  try {
    const payload = goals.map((g) => ({
      id: g.id,
      user_id: userId,
      title: g.title,
      horizon: g.horizon || 'monthly',
      target_minutes: g.targetMinutes || 0,
      completed_minutes: g.completedMinutes || 0,
      goal_type: g.type || 'productive',
      metric_type: g.metricType || 'minutes',
      target_metric: g.targetMetric || 0,
      completed_metric: g.completedMetric || 0,
      unlocked_milestones: g.unlockedMilestones || [],
      parent_id: g.parentId || null,
      pays_currency: g.paysCurrency !== false,
      category: g.category || null,
    }));
    await supabase.from('macro_goals').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.log('Error pushing macro goals to cloud:', err);
  }
}

export async function pushAllCollectionsToCloud(userId: string, collections: Collection[], items: CollectionItem[], subGoals?: any[]) {
  if (!isSupabaseConfigured()) return;
  try {
    if (collections.length > 0) {
      const cPayload = collections.map((c) => ({
        id: c.id,
        user_id: userId,
        title: c.title,
        category: c.category,
        macro_goal_id: c.macroGoalId || null,
        date_created: c.dateCreated,
      }));
      await supabase.from('collections').upsert(cPayload, { onConflict: 'id' });
    }

    if (subGoals && subGoals.length > 0) {
      const sPayload = subGoals.map((s) => ({
        id: s.id,
        collection_id: s.collectionId,
        user_id: userId,
        title: s.title,
        target_metric: s.targetMetric || null,
        year: s.year || null,
        month: s.month || null,
        date_created: s.dateCreated,
      }));
      await supabase.from('journey_sub_goals').upsert(sPayload, { onConflict: 'id' });
    }

    if (items.length > 0) {
      const iPayload = items.map((i) => ({
        id: i.id,
        collection_id: i.collectionId,
        sub_goal_id: i.subGoalId || null,
        title: i.title,
        estimated_minutes: i.estimatedMinutes || null,
        completed: i.completed,
        is_added_later: i.isAddedLater,
        date_created: i.dateCreated,
      }));
      await supabase.from('collection_items').upsert(iPayload, { onConflict: 'id' });
    }
  } catch (err) {
    console.log('Error pushing collections to cloud:', err);
  }
}

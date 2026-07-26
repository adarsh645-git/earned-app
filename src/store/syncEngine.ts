import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useEconomyStore } from './economyStore';
import { useTaskStore, Task, Pillar, Tag } from './taskStore';
import { useRewardStore, Reward } from './rewardStore';
import { useSummitStore, Summit } from './summitStore';
import { useCollectionStore, Collection, CollectionItem } from './collectionStore';
import { useSyncStatusStore } from './syncStatusStore';

// Records a push/pull outcome against the shared sync-health signal (see
// syncStatusStore.ts) — only called around an actual network attempt, never
// on the early-return no-op guards each function below already has.
function reportResult(channel: string, ok: boolean, err?: unknown) {
  const { recordSuccess, recordFailure } = useSyncStatusStore.getState();
  if (ok) {
    recordSuccess(channel);
  } else {
    recordFailure(channel, err instanceof Error ? err.message : String(err));
  }
}

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

/** Ids present in `prevItems` but no longer in `currentItems` — i.e. locally deleted. */
function diffRemovedIds<T extends { id: string }>(prevItems: T[], currentItems: T[]): string[] {
  const currentIds = new Set(currentItems.map((item) => item.id));
  return prevItems.map((item) => item.id).filter((id) => !currentIds.has(id));
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

    const unsubTasks = useTaskStore.subscribe((state, prevState) => {
      const removedTaskIds = diffRemovedIds(prevState.tasks, state.tasks);
      if (removedTaskIds.length > 0) {
        deleteTasksFromCloud(user.id, removedTaskIds);
      }
      pushAllTasksToCloud(user.id, state.tasks);
      pushAllPillarsToCloud(user.id, state.pillars);
      pushAllTagsToCloud(user.id, state.tags);
    });

    const unsubRewards = useRewardStore.subscribe((state, prevState) => {
      const removedRewardIds = diffRemovedIds(prevState.rewards, state.rewards);
      if (removedRewardIds.length > 0) {
        deleteRewardsFromCloud(user.id, removedRewardIds);
      }
      pushAllRewardsToCloud(user.id, state.rewards);
    });

    const unsubSummits = useSummitStore.subscribe((state, prevState) => {
      const removedIds = diffRemovedIds(prevState.summits, state.summits);
      if (removedIds.length > 0) {
        deleteSummitsFromCloud(user.id, removedIds);
      }
      pushAllSummitsToCloud(user.id, state.summits);
    });

    const unsubCollections = useCollectionStore.subscribe((state, prevState) => {
      const removedCollectionIds = diffRemovedIds(prevState.collections, state.collections);
      const removedWaypointIds = diffRemovedIds(prevState.waypoints || [], state.waypoints || []);
      const removedItemIds = diffRemovedIds(prevState.items, state.items);

      if (removedCollectionIds.length > 0) {
        deleteCollectionsFromCloud(user.id, removedCollectionIds);
      }
      if (removedWaypointIds.length > 0) {
        deleteWaypointsFromCloud(user.id, removedWaypointIds);
      }
      if (removedItemIds.length > 0) {
        deleteItemsFromCloud(removedItemIds);
      }

      pushAllCollectionsToCloud(user.id, state.collections, state.items, state.waypoints);
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
      unsubSummits();
      unsubCollections();
      supabase.removeChannel(channel);
    };
  }, [user]);
}

export async function pullCloudData(userId: string) {
  try {
    // Fetch Profile Economy Data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    // PGRST116 = no row found, expected for a brand-new user who hasn't
    // pushed a profile yet — not a real failure.
    if (profileError && profileError.code !== 'PGRST116') throw profileError;

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
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);
    if (tasksError) throw tasksError;

    if (tasks && tasks.length > 0) {
      const formattedTasks = tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        tagId: t.tag_id,
        summitId: t.summit_id,
        collectionId: t.collection_id || undefined,
        parentId: t.parent_id || undefined,
        estimatedMinutes: t.estimated_minutes,
        completed: t.completed,
        isIcebox: t.is_icebox,
        dateCreated: t.date_created,
        sortOrder: t.sort_order ?? undefined,
        description: t.description ?? undefined,
      }));
      useTaskStore.setState((s) => ({ ...s, tasks: mergeById(s.tasks, formattedTasks) }));
    }

    // Fetch Pillars
    const { data: pillars, error: pillarsError } = await supabase
      .from('pillars')
      .select('*')
      .eq('user_id', userId);
    if (pillarsError) throw pillarsError;

    // Fetch Tags
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId);
    if (tagsError) throw tagsError;

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
    const { data: rewards, error: rewardsError } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', userId);
    if (rewardsError) throw rewardsError;

    if (rewards && rewards.length > 0) {
      const formattedRewards = rewards.map((r: any) => ({
        id: r.id,
        title: r.title,
        cost: parseFloat(r.cost) || 0,
        dateCreated: r.date_created,
      }));
      useRewardStore.setState((s) => ({ rewards: mergeById(s.rewards, formattedRewards) }));
    }

    // Fetch Summits
    const { data: summits, error: summitsError } = await supabase
      .from('summits')
      .select('*')
      .eq('user_id', userId);
    if (summitsError) throw summitsError;

    if (summits && summits.length > 0) {
      const formattedSummits = summits.map((g: any) => ({
        id: g.id,
        title: g.title,
        horizon: (g.horizon || 'monthly') as 'monthly' | 'yearly',
        targetMinutes: g.target_minutes || 0,
        completedMinutes: g.completed_minutes || 0,
        type: g.summit_type || 'productive',
        metricType: g.metric_type || 'minutes',
        targetMetric: g.target_metric || 0,
        completedMetric: g.completed_metric || 0,
        unlockedMilestones: g.unlocked_milestones || [],
        parentId: g.parent_id || undefined,
        paysCurrency: g.pays_currency !== false,
        category: g.category || undefined,
      }));
      useSummitStore.setState((s) => ({ summits: mergeById(s.summits, formattedSummits) }));
    }

    // Fetch Collections
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId);
    if (collectionsError) throw collectionsError;

    if (collections && collections.length > 0) {
      const formattedCollections = collections.map((c: any) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        summitId: c.summit_id,
        dateCreated: c.date_created,
      }));
      useCollectionStore.setState((s) => ({ ...s, collections: mergeById(s.collections, formattedCollections) }));

      // Fetch Waypoints
      const { data: waypoints, error: waypointsError } = await supabase
        .from('waypoints')
        .select('*')
        .in('collection_id', collections.map(c => c.id));
      if (waypointsError) throw waypointsError;

      if (waypoints && waypoints.length > 0) {
        const formattedWaypoints = waypoints.map((w: any) => ({
          id: w.id,
          collectionId: w.collection_id,
          title: w.title,
          targetMetric: w.target_metric,
          year: w.year,
          month: w.month,
          dateCreated: w.date_created,
        }));
        useCollectionStore.setState((s) => ({ ...s, waypoints: mergeById(s.waypoints, formattedWaypoints) }));
      }
    }

    // Fetch Collection Items
    if (collections && collections.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('collection_items')
        .select('*')
        .in('collection_id', collections.map(c => c.id));
      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        const formattedItems = items.map((i: any) => ({
          id: i.id,
          collectionId: i.collection_id,
          waypointId: i.waypoint_id || undefined,
          title: i.title,
          estimatedMinutes: i.estimated_minutes,
          completed: i.completed,
          isAddedLater: i.is_added_later,
          dateCreated: i.date_created,
        }));
        useCollectionStore.setState((s) => ({ ...s, items: mergeById(s.items, formattedItems) }));
      }
    }

    reportResult('pull', true);
  } catch (err) {
    reportResult('pull', false, err);
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
    reportResult('economy', true);
  } catch (err) {
    reportResult('economy', false, err);
    console.log('Error pushing economy to cloud:', err);
  }
}

export async function deleteTasksFromCloud(userId: string, ids: string[]) {
  if (!isSupabaseConfigured() || ids.length === 0) return;
  try {
    await supabase.from('tasks').delete().eq('user_id', userId).in('id', ids);
    reportResult('tasks', true);
  } catch (err) {
    reportResult('tasks', false, err);
    console.log('Error deleting tasks from cloud:', err);
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
      summit_id: t.summitId || null,
      collection_id: t.collectionId || null,
      parent_id: t.parentId || null,
      estimated_minutes: t.estimatedMinutes,
      completed: t.completed,
      is_icebox: t.isIcebox,
      date_created: t.dateCreated,
      // Push the resolved fallback (not just t.sortOrder) so even a legacy
      // local row that predates this field writes a usable value.
      sort_order: t.sortOrder ?? Date.parse(t.dateCreated),
      description: t.description || null,
    }));
    const { error } = await supabase.from('tasks').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    reportResult('tasks', true);
  } catch (err) {
    reportResult('tasks', false, err);
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
    const { error } = await supabase.from('pillars').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    reportResult('pillars', true);
  } catch (err) {
    reportResult('pillars', false, err);
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
    const { error } = await supabase.from('tags').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    reportResult('tags', true);
  } catch (err) {
    reportResult('tags', false, err);
    console.log('Error pushing tags to cloud:', err);
  }
}

export async function deleteRewardsFromCloud(userId: string, ids: string[]) {
  if (!isSupabaseConfigured() || ids.length === 0) return;
  try {
    await supabase.from('rewards').delete().eq('user_id', userId).in('id', ids);
    reportResult('rewards', true);
  } catch (err) {
    reportResult('rewards', false, err);
    console.log('Error deleting rewards from cloud:', err);
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
    const { error } = await supabase.from('rewards').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    reportResult('rewards', true);
  } catch (err) {
    reportResult('rewards', false, err);
    console.log('Error pushing rewards to cloud:', err);
  }
}

export async function deleteSummitsFromCloud(userId: string, ids: string[]) {
  if (!isSupabaseConfigured() || ids.length === 0) return;
  try {
    await supabase.from('summits').delete().eq('user_id', userId).in('id', ids);
    reportResult('summits', true);
  } catch (err) {
    reportResult('summits', false, err);
    console.log('Error deleting summits from cloud:', err);
  }
}

export async function pushAllSummitsToCloud(userId: string, summits: Summit[]) {
  if (!isSupabaseConfigured() || summits.length === 0) return;
  try {
    const payload = summits.map((g) => ({
      id: g.id,
      user_id: userId,
      title: g.title,
      horizon: g.horizon || 'monthly',
      target_minutes: g.targetMinutes || 0,
      completed_minutes: g.completedMinutes || 0,
      summit_type: g.type || 'productive',
      metric_type: g.metricType || 'minutes',
      target_metric: g.targetMetric || 0,
      completed_metric: g.completedMetric || 0,
      unlocked_milestones: g.unlockedMilestones || [],
      parent_id: g.parentId || null,
      pays_currency: g.paysCurrency !== false,
      category: g.category || null,
    }));
    const { error } = await supabase.from('summits').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    reportResult('summits', true);
  } catch (err) {
    reportResult('summits', false, err);
    console.log('Error pushing summits to cloud:', err);
  }
}

export async function deleteCollectionsFromCloud(userId: string, ids: string[]) {
  if (!isSupabaseConfigured() || ids.length === 0) return;
  try {
    await supabase.from('collections').delete().eq('user_id', userId).in('id', ids);
    reportResult('collections', true);
  } catch (err) {
    reportResult('collections', false, err);
    console.log('Error deleting collections from cloud:', err);
  }
}

export async function deleteWaypointsFromCloud(userId: string, ids: string[]) {
  if (!isSupabaseConfigured() || ids.length === 0) return;
  try {
    await supabase.from('waypoints').delete().eq('user_id', userId).in('id', ids);
    reportResult('collections', true);
  } catch (err) {
    reportResult('collections', false, err);
    console.log('Error deleting waypoints from cloud:', err);
  }
}

export async function deleteItemsFromCloud(ids: string[]) {
  // collection_items has no user_id column; ownership is enforced by RLS via
  // the parent collection, same as the upsert path for this table.
  if (!isSupabaseConfigured() || ids.length === 0) return;
  try {
    await supabase.from('collection_items').delete().in('id', ids);
    reportResult('collections', true);
  } catch (err) {
    reportResult('collections', false, err);
    console.log('Error deleting collection items from cloud:', err);
  }
}

export async function pushAllCollectionsToCloud(userId: string, collections: Collection[], items: CollectionItem[], waypoints?: any[]) {
  if (!isSupabaseConfigured()) return;
  try {
    if (collections.length > 0) {
      const cPayload = collections.map((c) => ({
        id: c.id,
        user_id: userId,
        title: c.title,
        category: c.category,
        summit_id: c.summitId || null,
        date_created: c.dateCreated,
      }));
      const { error } = await supabase.from('collections').upsert(cPayload, { onConflict: 'id' });
      if (error) throw error;
    }

    if (waypoints && waypoints.length > 0) {
      const wPayload = waypoints.map((w) => ({
        id: w.id,
        collection_id: w.collectionId,
        user_id: userId,
        title: w.title,
        target_metric: w.targetMetric || null,
        year: w.year || null,
        month: w.month || null,
        date_created: w.dateCreated,
      }));
      const { error } = await supabase.from('waypoints').upsert(wPayload, { onConflict: 'id' });
      if (error) throw error;
    }

    if (items.length > 0) {
      const iPayload = items.map((i) => ({
        id: i.id,
        collection_id: i.collectionId,
        waypoint_id: i.waypointId || null,
        title: i.title,
        estimated_minutes: i.estimatedMinutes || null,
        completed: i.completed,
        is_added_later: i.isAddedLater,
        date_created: i.dateCreated,
      }));
      const { error } = await supabase.from('collection_items').upsert(iPayload, { onConflict: 'id' });
      if (error) throw error;
    }
    reportResult('collections', true);
  } catch (err) {
    reportResult('collections', false, err);
    console.log('Error pushing collections to cloud:', err);
  }
}

// Manual "Retry Sync" entry point (AuthModal) for when sync has gone
// unhealthy and the user doesn't want to wait for the next passive
// retry-on-state-change / retry-on-realtime-event. Re-pulls, then re-pushes
// every store's current snapshot exactly like the subscribe callbacks in
// useCloudSync already do on every local change.
export async function retrySync(userId: string) {
  await pullCloudData(userId);

  const taskState = useTaskStore.getState();
  await pushAllTasksToCloud(userId, taskState.tasks);
  await pushAllPillarsToCloud(userId, taskState.pillars);
  await pushAllTagsToCloud(userId, taskState.tags);

  await pushEconomyToCloud(userId, useEconomyStore.getState());
  await pushAllRewardsToCloud(userId, useRewardStore.getState().rewards);
  await pushAllSummitsToCloud(userId, useSummitStore.getState().summits);

  const collectionState = useCollectionStore.getState();
  await pushAllCollectionsToCloud(userId, collectionState.collections, collectionState.items, collectionState.waypoints);
}

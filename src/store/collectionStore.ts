import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safeStorage';
import { useGoalStore } from './goalStore';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export type CollectionCategory = 'books' | 'games' | 'stocks' | 'fitness' | 'courses' | 'travel' | 'general';

export type Waypoint = {
  id: string;
  collectionId: string;
  title: string; // e.g. "Fiction", "Economics", "Hikes", "Running"
  targetMetric?: number;
  year?: number;
  month?: number; // 1-12
  dateCreated: string;
};

export type Collection = {
  id: string;
  title: string;
  category: CollectionCategory;
  goalId?: string; // Links to a Goal
  dateCreated: string;
};

export type CollectionItem = {
  id: string;
  collectionId: string;
  waypointId?: string;
  title: string;
  estimatedMinutes?: number;
  completed: boolean;
  isAddedLater: boolean;
  dateCreated: string;
};

interface CollectionState {
  collections: Collection[];
  waypoints: Waypoint[];
  items: CollectionItem[];
  journeyBackfillApplied: boolean;
  // category is required on the stored record, but optional here — quick-add
  // can create a Journey from just a title, defaulting category to 'general'.
  addCollection: (collection: { title: string; category?: CollectionCategory; goalId?: string }) => string;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  addWaypoint: (waypoint: Omit<Waypoint, 'id' | 'dateCreated'>) => string;
  updateWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  deleteWaypoint: (id: string) => void;
  addItem: (item: Omit<CollectionItem, 'id' | 'completed' | 'dateCreated'>) => string;
  updateItem: (id: string, updates: Partial<CollectionItem>) => void;
  toggleItemCompletion: (id: string) => void;
  deleteItem: (id: string) => void;
  // One-time: goals could previously be created without a Journey at all. Now
  // that goal creation is Journey-only, any pre-existing Journey-less Goal
  // gets an auto-created Journey wrapper so it stays reachable from task
  // creation's Journey-only LinkProgressPicker instead of going silently dark.
  backfillJourneysForOrphanGoals: () => void;
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      collections: [],
      waypoints: [],
      items: [],
      journeyBackfillApplied: false,

      addCollection: (collectionData) => {
        const id = uuidv4();
        set((state) => ({
          collections: [
            ...state.collections,
            {
              title: collectionData.title,
              category: collectionData.category ?? 'general',
              goalId: collectionData.goalId,
              id,
              dateCreated: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },

      updateCollection: (id, updates) => {
        set((state) => ({
          collections: state.collections.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
      },

      deleteCollection: (id) => {
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
          waypoints: (state.waypoints || []).filter((w) => w.collectionId !== id),
          items: state.items.filter((i) => i.collectionId !== id),
        }));
      },

      addWaypoint: (waypointData) => {
        const id = uuidv4();
        set((state) => ({
          waypoints: [
            ...(state.waypoints || []),
            { ...waypointData, id, dateCreated: new Date().toISOString() },
          ],
        }));
        return id;
      },

      updateWaypoint: (id, updates) => {
        set((state) => ({
          waypoints: (state.waypoints || []).map((w) => (w.id === id ? { ...w, ...updates } : w)),
        }));
      },

      deleteWaypoint: (id) => {
        set((state) => ({
          waypoints: (state.waypoints || []).filter((w) => w.id !== id),
          items: state.items.map((i) => (i.waypointId === id ? { ...i, waypointId: undefined } : i)),
        }));

        // Dynamic require avoids a circular import (taskStore doesn't import
        // this store, but this store is imported widely) — same pattern
        // goalStore.deleteGoal already uses to unlink Tasks elsewhere.
        const { useTaskStore } = require('./taskStore');
        useTaskStore.setState((s: any) => ({
          tasks: s.tasks.map((t: any) => (t.waypointId === id ? { ...t, waypointId: undefined } : t)),
        }));
      },

      addItem: (itemData) => {
        const id = uuidv4();
        set((state) => ({
          items: [
            ...state.items,
            { ...itemData, id, completed: false, dateCreated: new Date().toISOString() },
          ],
        }));
        return id;
      },

      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        }));
      },

      toggleItemCompletion: (id) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;

        const isCurrentlyCompleted = item.completed;
        // Only trigger progress logic if we are completing it (not un-completing)
        if (!isCurrentlyCompleted) {
          const collection = get().collections.find((c) => c.id === item.collectionId);
          if (collection && collection.goalId) {
            const goal = useGoalStore.getState().goals.find(g => g.id === collection.goalId);

            if (goal) {
              // Routes to +1 for a count chain or the item's minutes for a time
              // chain; cascades up the chain from there.
              useGoalStore.getState().applyLeafProgress(goal.id, item.estimatedMinutes || 60);
            }
          }
        }

        // Toggle state locally
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, completed: !isCurrentlyCompleted } : i)),
        }));
      },

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },

      backfillJourneysForOrphanGoals: () => {
        if (get().journeyBackfillApplied) return;

        const goals = useGoalStore.getState().goals;
        const referencedGoalIds = new Set(
          get().collections.map((c) => c.goalId).filter(Boolean)
        );
        const orphanGoals = goals.filter((s) => !referencedGoalIds.has(s.id));

        if (orphanGoals.length > 0) {
          const newCollections: Collection[] = orphanGoals.map((s) => ({
            id: uuidv4(),
            title: s.title,
            category: 'general',
            goalId: s.id,
            dateCreated: new Date().toISOString(),
          }));
          set((state) => ({
            collections: [...state.collections, ...newCollections],
          }));
        }

        set({ journeyBackfillApplied: true });
      },
    }),
    {
      name: 'earned-collections',
      storage: createJSONStorage(() => safeStorage),
      // v0 persisted collections have `summitId` per-collection
      // (pre-spec-022 field name). Carry it forward into `goalId` so
      // existing Journeys don't lose their linked-goal association.
      version: 1,
      migrate: (persistedState: any, version) => {
        if (version < 1 && persistedState?.collections) {
          persistedState.collections = persistedState.collections.map((c: any) => {
            if ('summitId' in c) {
              const { summitId, ...rest } = c;
              return { ...rest, goalId: summitId };
            }
            return c;
          });
        }
        return persistedState;
      },
    }
  )
);

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safeStorage';
import { useMacroGoalStore } from './macroGoalStore';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export type CollectionCategory = 'books' | 'games' | 'stocks' | 'fitness' | 'courses' | 'travel' | 'other';

export type Collection = {
  id: string;
  title: string;
  category: CollectionCategory;
  macroGoalId?: string; // Links to a Macro Goal
  dateCreated: string;
};

export type CollectionItem = {
  id: string;
  collectionId: string;
  title: string;
  estimatedMinutes?: number;
  completed: boolean;
  isAddedLater: boolean;
  dateCreated: string;
};

interface CollectionState {
  collections: Collection[];
  items: CollectionItem[];
  addCollection: (collection: Omit<Collection, 'id' | 'dateCreated'>) => string;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  addItem: (item: Omit<CollectionItem, 'id' | 'completed' | 'dateCreated'>) => string;
  updateItem: (id: string, updates: Partial<CollectionItem>) => void;
  toggleItemCompletion: (id: string) => void;
  deleteItem: (id: string) => void;
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      collections: [],
      items: [],

      addCollection: (collectionData) => {
        const id = uuidv4();
        set((state) => ({
          collections: [
            ...state.collections,
            { ...collectionData, id, dateCreated: new Date().toISOString() },
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
          items: state.items.filter((i) => i.collectionId !== id),
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
          if (collection && collection.macroGoalId) {
            const macroGoal = useMacroGoalStore.getState().macroGoals.find(g => g.id === collection.macroGoalId);
            
            if (macroGoal) {
              // Determine amount to progress based on metricType
              let progressAmount = 0;
              if (macroGoal.metricType === 'units') {
                progressAmount = 1; // 1 item completed = 1 unit
              } else {
                // If it's a minutes-based goal, use the estimated minutes or default to 60 (1 hour)
                progressAmount = item.estimatedMinutes || 60;
              }
              
              // Only add positive progress
              if (progressAmount > 0) {
                useMacroGoalStore.getState().addProgress(macroGoal.id, progressAmount);
              }
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
    }),
    {
      name: 'earned-collections',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

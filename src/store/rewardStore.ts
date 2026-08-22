import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safeStorage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export type Reward = {
  id: string;
  title: string;
  cost: number;
}

// Must match syncEngine.ts's DELETE_TOMBSTONE_GRACE_MS — duplicated rather
// than imported to avoid a circular import. See
// docs/sdd/030-delete-tombstones.md.
const DELETE_TOMBSTONE_GRACE_MS = 30_000;

function pruneExpiredPendingDeletes(pendingDeletes: Record<string, number>): Record<string, number> {
  const now = Date.now();
  const next: Record<string, number> = {};
  for (const [id, deletedAt] of Object.entries(pendingDeletes)) {
    if (now - deletedAt < DELETE_TOMBSTONE_GRACE_MS) next[id] = deletedAt;
  }
  return next;
}

interface RewardState {
  rewards: Reward[];
  // See taskStore.ts's pendingDeletes for why this exists — same
  // delete-then-cloud-pull-races-ahead resurrection bug, same fix. See
  // docs/sdd/030-delete-tombstones.md.
  pendingDeletes: Record<string, number>;
  addReward: (reward: Omit<Reward, 'id'>) => void;
  deleteReward: (id: string) => void;
}

export const useRewardStore = create<RewardState>()(
  persist(
    (set) => ({
      rewards: [
        { id: '1', title: '1 Hour of Video Games', cost: 60 },
        { id: '2', title: 'Dinner Out', cost: 150 },
        { id: '3', title: 'Buy New Tech / Gear', cost: 500 },
        { id: '4', title: 'Watch a Movie', cost: 90 },
      ],
      pendingDeletes: {},
      addReward: (reward) => set((state) => ({
        rewards: [...state.rewards, { ...reward, id: uuidv4() }]
      })),
      deleteReward: (id) => set((state) => ({
        rewards: state.rewards.filter(r => r.id !== id),
        pendingDeletes: { ...pruneExpiredPendingDeletes(state.pendingDeletes), [id]: Date.now() },
      }))
    }),
    {
      name: 'earned-reward-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

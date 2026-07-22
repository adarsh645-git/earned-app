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

interface RewardState {
  rewards: Reward[];
  addReward: (reward: Omit<Reward, 'id'>) => void;
  deleteReward: (id: string) => void;
}

export const useRewardStore = create<RewardState>()(
  persist(
    (set) => ({
      rewards: [
        { id: '1', title: '1 Hour of Video Games', cost: 60 },
        { id: '2', title: 'Cheat Meal / Pizza Night', cost: 150 },
        { id: '3', title: 'Buy New Tech / Gear', cost: 500 },
        { id: '4', title: 'Watch a Movie', cost: 90 },
      ],
      addReward: (reward) => set((state) => ({
        rewards: [...state.rewards, { ...reward, id: uuidv4() }]
      })),
      deleteReward: (id) => set((state) => ({
        rewards: state.rewards.filter(r => r.id !== id)
      }))
    }),
    {
      name: 'earned-reward-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

const memoryStore = new Map<string, string>();

export const safeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      return value;
    } catch (e) {
      console.warn(`[SafeStorage] AsyncStorage getItem error for key "${name}", falling back to memory store:`, e);
      return memoryStore.get(name) || null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      memoryStore.set(name, value);
      await AsyncStorage.setItem(name, value);
    } catch (e) {
      console.warn(`[SafeStorage] AsyncStorage setItem error for key "${name}":`, e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      memoryStore.delete(name);
      await AsyncStorage.removeItem(name);
    } catch (e) {
      console.warn(`[SafeStorage] AsyncStorage removeItem error for key "${name}":`, e);
    }
  },
};

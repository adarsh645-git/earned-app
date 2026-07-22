import { createClient } from '@supabase/supabase-js';
import { safeStorage } from '../store/safeStorage';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://lpzwsqcqyblxaopsttho.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_MZYZTJfaMtFnbLuiop2HXQ_BGYsrnOH';

export const isSupabaseConfigured = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
  return url !== undefined && !url.includes('xyzcompany');
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem: async (key) => await safeStorage.getItem(key),
      setItem: async (key, value) => { await safeStorage.setItem(key, value); },
      removeItem: async (key) => { await safeStorage.removeItem(key); },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

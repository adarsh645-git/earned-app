import { create } from 'zustand';

export type ChannelStatus = {
  consecutiveFailures: number;
  lastError: string | null;
  lastSuccessAt: number | null;
};

interface SyncStatusState {
  channels: Record<string, ChannelStatus>;
  recordSuccess: (channel: string) => void;
  recordFailure: (channel: string, error: string) => void;
}

// A channel only flips the global signal to "unhealthy" after this many
// consecutive failures — a single transient network blip shouldn't flash a
// sync-paused warning; a schema-drift-style failure (every attempt fails)
// will cross this within two state changes.
export const FAILURE_THRESHOLD = 2;

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  channels: {},
  recordSuccess: (channel) => set((state) => ({
    channels: {
      ...state.channels,
      [channel]: { consecutiveFailures: 0, lastError: null, lastSuccessAt: Date.now() },
    },
  })),
  recordFailure: (channel, error) => set((state) => {
    const prev = state.channels[channel];
    return {
      channels: {
        ...state.channels,
        [channel]: {
          consecutiveFailures: (prev?.consecutiveFailures ?? 0) + 1,
          lastError: error,
          lastSuccessAt: prev?.lastSuccessAt ?? null,
        },
      },
    };
  }),
}));

export function isSyncUnhealthy(channels: Record<string, ChannelStatus>): boolean {
  return Object.values(channels).some((c) => c.consecutiveFailures >= FAILURE_THRESHOLD);
}

// Human-readable labels for the channels tracked in syncEngine.ts.
const CHANNEL_LABELS: Record<string, string> = {
  pull: 'Cloud Refresh',
  economy: 'Balance',
  tasks: 'Tasks',
  pillars: 'Categories',
  tags: 'Journeys/Tags',
  rewards: 'Store Rewards',
  summits: 'Summits',
  collections: 'Journeys',
};

export function getFailingChannels(channels: Record<string, ChannelStatus>): { channel: string; label: string; error: string | null }[] {
  return Object.entries(channels)
    .filter(([, c]) => c.consecutiveFailures >= FAILURE_THRESHOLD)
    .map(([channel, c]) => ({ channel, label: CHANNEL_LABELS[channel] || channel, error: c.lastError }));
}

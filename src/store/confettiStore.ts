import { create } from 'zustand';

interface ConfettiState {
  isPlaying: boolean;
  triggerConfetti: () => void;
  stopConfetti: () => void;
}

export const useConfettiStore = create<ConfettiState>((set) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  
  return {
    isPlaying: false,
    triggerConfetti: () => {
      if (timer) clearTimeout(timer);
      set({ isPlaying: true });
      timer = setTimeout(() => {
        set({ isPlaying: false });
      }, 4000); // Runs for 4 seconds
    },
    stopConfetti: () => {
      if (timer) clearTimeout(timer);
      set({ isPlaying: false });
    },
  };
});

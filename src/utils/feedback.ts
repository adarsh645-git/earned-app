import {
  hapticSelection,
  hapticSuccess,
  hapticError,
  hapticLightImpact,
  hapticHeavyImpact,
} from './haptics';
import { playSound, SoundType } from './sound';

/**
 * Unified feedback: fires the matching haptic (native) AND synthesized sound
 * (web) for a semantic interaction, so call sites express intent once.
 *
 * Tiered by weight so celebration stays meaningful — a subtle tick for
 * routine toggles, a coin for currency, a full fanfare reserved for milestones.
 */
export type FeedbackType =
  | 'select' // toggles, nav, minor taps
  | 'taskComplete' // completing a task
  | 'sessionComplete' // finishing a focus/leisure session
  | 'milestone' // milestone / streak-up / journey completion
  | 'currency' // dollars / hours earned
  | 'expand' // accordion / sheet open
  | 'error'; // blocked / failed action

const map: Record<FeedbackType, { haptic: () => void; sound: SoundType }> = {
  select: { haptic: hapticSelection, sound: 'tick' },
  taskComplete: { haptic: hapticSuccess, sound: 'coin' },
  sessionComplete: { haptic: hapticSuccess, sound: 'success' },
  milestone: { haptic: hapticHeavyImpact, sound: 'fanfare' },
  currency: { haptic: hapticLightImpact, sound: 'coin' },
  expand: { haptic: hapticLightImpact, sound: 'whoosh' },
  error: { haptic: hapticError, sound: 'error' },
};

export const feedback = (type: FeedbackType): void => {
  const entry = map[type];
  if (!entry) return;
  entry.haptic();
  playSound(entry.sound);
};

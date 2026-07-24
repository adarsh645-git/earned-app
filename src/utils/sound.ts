import { Platform } from 'react-native';
import { usePreferencesStore } from '../store/preferencesStore';

/**
 * Dependency-free sound effects synthesized via the Web Audio API.
 *
 * Web-only by design: haptics are the tactile channel on native, and on web
 * they are hard no-ops, so synthesized audio is the web feedback channel.
 * Every path is guarded so importing or calling this on native is a safe no-op.
 *
 * Browsers block audio until a user gesture, so the AudioContext is lazily
 * created and resumed on the first playSound() call (which always originates
 * from a tap/press).
 */

export type SoundType = 'tick' | 'coin' | 'success' | 'fanfare' | 'whoosh' | 'error';

const isWebAudioAvailable = (): boolean =>
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof (window.AudioContext || (window as any).webkitAudioContext) !== 'undefined';

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (!isWebAudioAvailable()) return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  // Resume if the browser suspended it before a gesture.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
};

type ToneOptions = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  startAt?: number; // seconds offset from now
  glideTo?: number; // ramp frequency to this value over the tone
};

/** Play a single enveloped tone. Envelope prevents clicks (fast attack, smooth decay). */
const tone = (audio: AudioContext, opts: ToneOptions) => {
  const { freq, duration, type = 'sine', gain = 0.14, startAt = 0, glideTo } = opts;
  const now = audio.currentTime + startAt;

  const osc = audio.createOscillator();
  const amp = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (glideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), now + duration);
  }

  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.008); // fast attack
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration); // smooth decay

  osc.connect(amp);
  amp.connect(audio.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
};

const recipes: Record<SoundType, (audio: AudioContext) => void> = {
  // Subtle UI blip for toggles / selection.
  tick: (a) => tone(a, { freq: 660, duration: 0.06, type: 'sine', gain: 0.08 }),

  // Two quick ascending notes — currency earned.
  coin: (a) => {
    tone(a, { freq: 740, duration: 0.09, type: 'triangle', gain: 0.12 });
    tone(a, { freq: 988, duration: 0.12, type: 'triangle', gain: 0.12, startAt: 0.07 });
  },

  // Rising 3-note arpeggio — a session / meaningful action completed.
  success: (a) => {
    tone(a, { freq: 523.25, duration: 0.12, type: 'sine', gain: 0.13 }); // C5
    tone(a, { freq: 659.25, duration: 0.12, type: 'sine', gain: 0.13, startAt: 0.1 }); // E5
    tone(a, { freq: 783.99, duration: 0.2, type: 'sine', gain: 0.13, startAt: 0.2 }); // G5
  },

  // Bright major arpeggio with an octave shimmer — reserved for milestones.
  fanfare: (a) => {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((f, i) => {
      tone(a, { freq: f, duration: 0.22, type: 'triangle', gain: 0.13, startAt: i * 0.09 });
    });
    // High shimmer tail.
    tone(a, { freq: 1567.98, duration: 0.35, type: 'sine', gain: 0.07, startAt: 0.36 });
  },

  // Short descending pitch sweep — expand / navigate.
  whoosh: (a) => tone(a, { freq: 520, glideTo: 220, duration: 0.16, type: 'sine', gain: 0.07 }),

  // Low buzz — blocked / error.
  error: (a) => tone(a, { freq: 180, duration: 0.2, type: 'sawtooth', gain: 0.1 }),
};

export const playSound = (type: SoundType): void => {
  if (!usePreferencesStore.getState().soundEnabled) return;
  const audio = getCtx();
  if (!audio) return;
  try {
    recipes[type](audio);
  } catch {
    // Never let audio failures break the interaction.
  }
};

import { Pillar } from '../store/taskStore';

// Apple system colors not already claimed elsewhere in this app's palette
// (green #30D158 = earner, blue #5AC8FA = burner, purple #AF52DE/#BF5AF2 =
// accent/CTA, red #FF453A = debt/errors, orange #FF9F0A = streak/warnings).
export const PILLAR_PALETTE = [
  '#FFD60A', // yellow
  '#5E8CFF', // cornflower blue (replaces pink — reads more premium/professional for a default pillar like "Office")
  '#66D4CF', // mint
  '#6AC4DC', // teal
  '#7D7AFF', // indigo
  '#AC8E68', // brown
];

const FALLBACK_COLOR = '#8E8E93'; // pillarId not found (e.g. deleted pillar)

/**
 * Stable per-pillar color: sorts ALL pillars (including archived, so
 * archiving one never reshuffles the rest) by id and indexes into the fixed
 * palette. Derived from the pillar's own permanent id — never stored, never
 * synced — so it's automatically identical across every screen and device.
 */
export function getPillarColor(pillarId: string | undefined, pillars: Pillar[]): string {
  if (!pillarId) return FALLBACK_COLOR;
  const sorted = [...pillars].sort((a, b) => a.id.localeCompare(b.id));
  const index = sorted.findIndex(p => p.id === pillarId);
  if (index === -1) return FALLBACK_COLOR;
  return PILLAR_PALETTE[index % PILLAR_PALETTE.length];
}

# SDD: UI Juice (Motion + Sound) & Flow Redesign of Tasks / Store / Journeys

## 1. Feature Overview
Makes the app more engaging and seamless without changing its visual identity: adds a dependency-free sound layer, animates previously-static feedback (dashboard ring, currency pills, progress bars), and overhauls the flow/naming/motion of three screens (Tasks & Icebox, Store, Journeys). On web the haptic channel is a hard no-op, so synthesized audio becomes the primary non-visual feedback.

**Tiered feedback principle** (mirrors the economy's anti-inflation stance): routine toggles get a subtle tick; currency gets a coin; session completion gets a rising arpeggio; milestones / streak-ups / journey completion get the full fanfare. Over-celebrating trivial actions dilutes the reward, so celebration weight tracks the significance of the moment.

## 2. Shared Infrastructure (new)
- `src/utils/sound.ts` — Web Audio synthesizer. Lazy, gesture-initialized `AudioContext`; guarded to web (`Platform.OS === 'web'` + `window.AudioContext`) so it is a safe no-op on native. `playSound(type)` with oscillator/gain recipes: `tick`, `coin`, `success`, `fanfare`, `whoosh`, `error`. Respects `preferencesStore.soundEnabled`.
- `src/store/preferencesStore.ts` — persisted `soundEnabled` (default `true`) + `toggleSound`.
- `src/utils/feedback.ts` — `feedback(type)` fires the matching haptic (native) and sound (web) together. Intents: `select`, `taskComplete`, `sessionComplete`, `milestone`, `currency`, `expand`, `error`.
- `src/components/CountUpText.tsx` — tweens a displayed number to its new value.
- `src/components/AnimatedProgressRing.tsx` — SVG ring that sweeps (animated `strokeDashoffset`, JS-driver) with a count-up label.
- `src/components/AnimatedProgressBar.tsx` — width-animated fill bar.
- `src/components/CurrencyPill.tsx` — count-up pill that pulses when its value increases.

## 3. App-Wide Polish & Fixes
- **Dashboard**: static ring → `AnimatedProgressRing`; header streak/hours/cash/tab pills → `CurrencyPill`; check-in routed through `feedback('currency')`.
- **Shell** (`AppNavigator`): sidebar cash → `CountUpText`; stale nav label **"Profile & Credit" → "Profile"** (credit system removed in spec 009).
- **Feedback wiring**: `AnimatedTaskRow` completion, `TimerOverlay` complete/zen-claim, `MilestoneModal` + `CheckInModal` (fanfare on appear), Store redeem — all now fire `feedback()`.
- **Bug fix**: `TasksScreen` fires its previously-dead `RewardToast` on completion (hours earned / leisure spent).
- **Copy fix**: `TasksScreen` add button "+$0.02" removed (creation bounty was dropped in spec 004).

## 4. Screen Redesigns (identity preserved; flow/hierarchy/motion overhauled)
- **Tasks & Icebox**: cryptic "De-ice" / thunderstorm control → clear **"Move to Today"** with an intuitive icon; icebox move/activate animate via `LayoutAnimation` + tick; reward toast fires on completion.
- **Store**: naming unified — tabs **"Entertainment" / "Material"** (was "Media" / "Material Rewards"), material CTA "Add Reward" (was "Add Item"); both balance banners animate via `CountUpText`; redeem fires `feedback`.
- **Journeys**: journey progress bars → `AnimatedProgressBar`; sub-goal accordions expand/collapse via `LayoutAnimation` + `whoosh`; item completion → coin, sub-goal/journey 100% → fanfare, creation → tick.

## 5. Preferences UI
- `ProfileScreen` gains a **Preferences → Sound Effects** toggle bound to `preferencesStore`.

## 6. Task Checklist
- [x] Sound synthesizer, preferences store, unified feedback helper
- [x] Animated primitives (CountUpText, ProgressRing, ProgressBar, CurrencyPill)
- [x] App-wide polish + feedback wiring + toast/copy fixes
- [x] Tasks & Icebox flow redesign
- [x] Store naming + animated banners
- [x] Journeys animated bars/accordions + tiered celebration
- [x] Profile sound toggle
- [x] Typecheck (`npx tsc --noEmit`) + web export build

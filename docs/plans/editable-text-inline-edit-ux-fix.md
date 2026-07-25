# Plan: Fix `EditableText` inline-edit UX (cursor position, dynamic width, remove harsh focus styling)

This is a self-contained implementation plan for a single-file bug fix. No
prior conversation context is required to execute it.

## Context

This is an Expo (React Native for Web) app called `earned-app`. It has a
shared component at `src/components/EditableText.tsx` used for "click any
title to rename it" across the app — Task titles (`AnimatedTaskRow.tsx`),
Journey row titles, Waypoint row titles, and Item titles (both
waypoint-nested and root items), all in `src/screens/CollectionsScreen.tsx`.

The current implementation has four UX problems, confirmed via screenshots:

1. **A thick blue focus-ring box** appears around the whole input when
   editing — this is the browser's default `<input>` focus outline, not an
   intentional design choice.
2. **The entire text gets highlighted/selected** the moment you tap in
   (caused by `selectTextOnFocus`) — should not auto-select-all.
3. **The input box has a fixed width** computed once when editing starts, and
   does **not** grow or shrink as the user types more or fewer characters —
   it should dynamically resize to hug the content live, like a native text
   field.
4. **Clicking a specific character/word should place the cursor exactly
   there** (e.g. clicking in the middle of "before the back to back" should
   put the caret at that exact point) — currently the cursor does not land
   where clicked. Reference: TickTick's own inline title editor (a reference
   screenshot was provided during design) shows exactly the target feel — a
   barely-there input, cursor lands where clicked, no selection highlight,
   background just a hair lighter than the row it's on.

## Root cause

The current `EditableText.tsx` **conditionally mounts** either:
- a `<Pressable><Text>...</Text></Pressable>` (non-editing display state), or
- a `<TextInput>` (editing state) — swapped in only *after* the Pressable's
  `onPress` fires.

Because the actual `<input>` DOM element (react-native-web renders
`TextInput` as a real `<input>`) doesn't exist yet at the moment the user
clicks — they're clicking on a `Text`/`Pressable`, not an input — the browser
has no way to place the cursor at the exact click position. By the time the
`TextInput` mounts, the click is already over, and `autoFocus` +
`selectTextOnFocus` take over, forcing a default (select-all) state instead
of "wherever you clicked." This same component-swap is also why the width is
only computed once (from the pre-edit static `Text`'s measured width, not the
live draft) and why the abrupt full browser-default focus ring appears.

## Required approach: always render a real `TextInput`, never swap components

To get native "click lands exactly where the cursor should be" behavior, the
actual underlying `<input>` element must **already be the thing receiving the
click** — meaning `EditableText` must always render a `TextInput` (never a
`Pressable`+`Text` swapped in later). Toggle only its *appearance* based on a
local `isFocused` boolean driven by the input's own `onFocus`/`onBlur`, not by
mounting/unmounting different components.

Concretely, rewrite `src/components/EditableText.tsx` as follows:

1. **Always render `<TextInput>`.** Remove the `Pressable`+`Text` branch
   entirely. Its `value` is the live `draft` string, always — initialized
   from the `value` prop and re-synced via the existing `useEffect` when the
   prop changes externally (keep this sync logic as-is).

2. **Style it to look like a plain label when not focused**: no background
   tint, no border — visually indistinguishable from a plain `Text` until the
   user interacts with it. When focused, apply only a very subtle affordance
   (e.g. a faint `rgba(255,255,255,0.06)` background, or a barely-there 1px
   bottom border in the caller's accent color) — **not** a bright blue ring.
   On web, set `outlineStyle: 'none'` in the style (cast via `as any` since
   it's not in the official RN `TextInput` style TS surface) so the browser's
   native focus outline never shows. This exact technique already exists
   elsewhere in this codebase — see the local `PremiumInput` wrapper
   component defined near the top of `src/screens/CollectionsScreen.tsx`,
   which does `{ outlineStyle: 'none' } as any` for the identical reason. Use
   it as a direct reference for consistency.

3. **Remove `selectTextOnFocus` entirely.** Do not auto-select all text on
   focus. Once the always-mounted approach is in place, simply not fighting
   the browser's native behavior (no `selectTextOnFocus`, no manual
   `setSelection` call) is sufficient for the cursor to land wherever the
   user clicked — that's the browser's own default `<input>` behavior.

4. **Drop `autoFocus`.** It's no longer appropriate since the input is always
   present; it should only focus in response to the user's own tap on it, and
   a real `<input>` already both focuses *and* places the caret at the
   clicked x-position on tap, natively, with zero extra code. Do not
   programmatically call `.focus()` yourself.

5. **Track a local `isFocused` boolean** via `onFocus={() =>
   setIsFocused(true)}`. Keep the existing `onBlur={commit}` (the current
   `commit()` function — trim, no-op if empty/unchanged, else call the
   `onSave` prop — is correct and unchanged), and also reset `isFocused` to
   `false` there. `isFocused` is used purely for the subtle cosmetic styling
   in step 2 — there is no separate "display mode" state anymore, the input
   is always interactive.

6. **Dynamic width that grows/shrinks live as the user types.** React Native
   has no built-in "auto-width text input." Use the standard technique: keep
   an invisible/zero-opacity mirror `<Text>` elsewhere in the render tree
   containing the **current `draft` value** (not the original `value`
   prop!), measure its rendered width via its own `onLayout`, and apply that
   measured width (plus a small buffer, ~12–20px, for cursor breathing room)
   as the visible `TextInput`'s `width` style. Because the mirror `Text`
   re-renders — and re-fires `onLayout` — on every keystroke (since `draft`
   state changes on every `onChangeText`), the applied width updates live,
   character by character, growing and shrinking naturally as the user types
   or deletes. Keep a sensible `minWidth` (24–40) so a very short/empty field
   doesn't collapse to nothing, and cap with `maxWidth: '100%'` so it never
   overflows whatever `containerStyle` the caller passed in.

7. **Keep the existing outer wrapper `<View style={containerStyle}>` and
   `alignSelf: 'flex-start'` on the `TextInput` itself** — this part of the
   current implementation is correct (it was added in an earlier fix so the
   box hugs its content instead of stretching to fill its row) and should be
   preserved as-is; only the *source* of the width value changes, from "a
   one-time measurement of the old display `Text`" to "a live measurement of
   the mirror `Text` tracking `draft`."

8. **Commit/revert logic is unchanged.** `onBlur` and `onSubmitEditing` both
   call the same `commit()`. Keep the existing `useEffect` that syncs `draft`
   from the `value` prop when it changes externally (e.g. another surface
   edited the same record).

## Prop contract — must not change

`EditableText`'s public props today are:
```ts
interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  textStyle?: TextStyle;
  containerStyle?: ViewStyle; // e.g. { flex: 1 } for Item rows, to reserve row width
  numberOfLines?: number;
}
```
Keep this exact shape. It's used in 6 places today and none of those call
sites should need to change:
- `src/components/AnimatedTaskRow.tsx` — Task title (no `containerStyle`)
- `src/screens/CollectionsScreen.tsx` — Journey row title (no
  `containerStyle`), Waypoint row title (no `containerStyle`), Item title
  inside an expanded waypoint (`containerStyle={{ flex: 1 }}`), root-level
  Item title (`containerStyle={{ flex: 1 }}`)

## File(s) touched

- `src/components/EditableText.tsx` — the entire rewrite described above.
  This should be the **only** file that needs changes. Do not touch any call
  site unless you discover the prop contract genuinely cannot be preserved
  (flag this clearly if so, rather than silently changing call sites).

## Verification

1. `npx tsc --noEmit` must pass cleanly — this project has a pre-commit hook
   (`.claude/hooks/tsc-gate.sh`) that enforces this on every commit.
2. Manually test in the running web app (`npm run web`) across all 6 usages
   listed above:
   - Click in the **middle** of a long title's text (not at the very start)
     — the cursor must land exactly at that click position. No text should
     be auto-selected/highlighted.
   - No bright blue focus ring should appear — at most a very subtle
     background tint or faint underline while focused.
   - Type additional characters — the box should visibly grow wider in real
     time, character by character (and shrink again when deleting), not stay
     a fixed width.
   - Blur (click away) or press Enter still commits the rename via the
     existing store action (`updateTask` / `updateCollection` /
     `updateWaypoint` / `updateItem`, depending on which row); leaving it
     empty or unchanged still reverts to the original text without saving.
   - In the Item-row case (`containerStyle={{ flex: 1 }}`), confirm the
     checkbox and trash-icon buttons stay in their correct positions as the
     input grows — it should still respect the row's available space.
3. Do not use browser automation for this verification — the project owner
   prefers to test UI changes manually themselves in the running app.

## Notes for the implementing agent

- This is a refinement of a component introduced under
  `docs/sdd/017-quick-add-bar-and-pills.md` (a larger "quick-add bar and
  click-to-edit pills" feature). You do not need to read that spec to
  implement this fix — this document is fully self-contained — but it's
  there for historical context if useful.
- Per this repo's own `AGENTS.md` conventions, this qualifies as a
  **single-file bug fix** (fast-track path) — it does not need a new
  numbered SDD spec, a Phase-0 three-lens brainstorm, or a
  `docs/sdd/README.md` index entry. Just implement, verify with `tsc`, and
  (if asked) commit using Conventional Commits.

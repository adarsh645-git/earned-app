# Bug Backlog

A running log of bugs — captured as-is, with a screenshot when there is
one, whenever you spot one. This is a *capture* list first: bugs get
triaged and fixed only once you say the recording pass is done.

## How this works

1. **Report a bug any time, in any Claude Code session** — a sentence, a
   screenshot, or both. A clarifying question or two may come back right
   there (repro steps, expected vs actual) before it gets recorded.
2. It gets appended below as a new numbered entry: today's date, the
   report (lightly tightened, never changed in meaning), a link to its
   screenshot if one was given (saved to `docs/bugs/screenshots/NNN.png`),
   and status `🆕 New`. Committed immediately (fast-track) so nothing's
   lost mid-session — no waiting for the whole batch to finish.
3. Keep reporting more, in the same session or a later one — the list just
   grows.
4. Say **"that's all of them"** (or similarly explicit) to switch modes:
   recording stops, and every `🆕 New` entry gets triaged + fixed one by
   one, sized against `AGENTS.md`'s Trivial Changes / Feature Work split:
   - **Trivial** (1-2 file fix) → fixed directly, fast-track commit, entry
     marked `✅ Fixed` with the commit reference.
   - **Non-trivial** (economy rules, store shape, Supabase schema,
     user-facing behavior) → goes through the SDD loop
     (`.claude/skills/sdd-feature-loop/`), gets a `docs/sdd/NNN-*.md` spec
     if warranted, entry updated to `🚧 In Progress` with a link.
   Fixed **one at a time**, not in parallel — each fix gets verified before
   the next one starts.
5. Nothing here is committed to a timeline. Bugs can sit indefinitely,
   turn out to be duplicates of each other, or get marked `❌ Won't Fix` if
   we decide against acting on one.

## Status legend

| Symbol | Meaning |
|---|---|
| 🆕 New | Captured, not yet triaged |
| 🚧 In Progress | Being fixed (linked to a `docs/sdd/` spec if it needed one) |
| ✅ Fixed | Resolved and committed (commit ref included) |
| ❌ Won't Fix | Decided against, or turned out not to be a bug |

---

## Bugs

<!--
Entry template — copy this for each new bug:

### NNN — <short title>
- **Date**: YYYY-MM-DD
- **Status**: 🆕 New
- **Screenshot**: ./screenshots/NNN.png (omit if none given)
- **Report**: <what's wrong, expected vs actual, as given>
- **Notes**: <root cause / fix / commit ref — filled in during triage>
-->

### 001 — Manage Focus category/pillar dropdowns show duplicated entries
- **Date**: 2026-08-22
- **Status**: ✅ Fixed
- **Screenshot**: ./screenshots/001a.png, ./screenshots/001b.png, ./screenshots/001c.png
- **Report**: On the Tasks page ("Manage Focus"), the dropdowns show repeated
  entries — e.g. "Tag (last used)" lists "Deep Work" four times in a row.
  Also seen: the same repeated categories in the profile page. Separately,
  the first dropdown when creating a task is a pillar picker (Office/Health/
  Personal), but once the task exists, that same-position dropdown ("Gaming")
  instead shows a huge list of every category in the whole app rather than
  staying scoped to pillars.
- **Notes**: Two independent causes, both fixed:
  1. The 3 default tags were seeded with `uuidv4()` on every cold start (no
     local storage yet — fresh install, cleared storage, second device).
     `syncEngine.ts`'s `mergeById` only dedupes by id, so each cold start's
     lookalike defaults piled up next to the real ones instead of merging —
     same root cause behind the profile page's repeated categories, since it
     reads the same `tags` array. Fixed: default tags now use stable ids
     (`deep-work`/`fitness`/`gaming`, mirroring the pillars' own stable ids)
     so a fresh install always merges back into the same cloud rows; added
     `dedupeTags()` in `taskStore.ts` (wired into `App.tsx`'s startup chain)
     to collapse any tags already duplicated by Pillar+name, remapping
     affected tasks/`lastUsedTagId` to the surviving tag and archiving the
     rest.
  2. `AnimatedTaskRow.tsx`'s top-level (non-subtask) Tag pill listed every
     tag in the app instead of scoping to the task's own Pillar — the
     subtask variant already did this correctly. Fixed to filter by the
     task's current tag's `pillarId`, matching the subtask and
     `TaskDetailModal` behavior.

### 002 — "Inbox (skip tagging)" stays selectable after all category slots are filled
- **Date**: 2026-08-22
- **Status**: ✅ Fixed
- **Screenshot**: ./screenshots/002.png
- **Report**: "Skip tagging" can still be toggled on even after all the
  category dropdowns (pillar, tag, journey/waypoint) have values selected —
  it should presumably be disabled/hidden once tagging is already complete.
- **Notes**: Skip Tagging and an explicit Pillar/Category/Journey/Waypoint
  pick could both be "on" at once with no reconciliation between them.
  Made them mutually exclusive in `TasksScreen.tsx`'s quick-add bar: turning
  Skip Tagging on now clears any explicit pillar/tag/journey/waypoint
  selection, and picking any of those now turns Skip Tagging back off.

### 003 — No way to create a task that targets all remaining pages in a waypoint
- **Date**: 2026-08-22
- **Status**: ✅ Fixed
- **Report**: Forgot to log hours while reading, but finished the book. Wants
  to create a task that targets all the pages in the waypoint (retroactively
  cover the whole waypoint's unit target) — no way to do this currently.
- **Notes**: The mechanism already existed (any waypoint-linked task's
  completion prompt takes a free-typed quantity, and progress sums across
  all its tasks) — the gap was that the prompt always started blank, so
  logging "the whole thing" meant computing and typing the exact remaining
  amount yourself. Discussed two options with the user (prefill the prompt
  vs. a standalone "Mark Waypoint Complete" shortcut); went with the
  prefill. `ProgressPromptModal` now takes a `defaultValue` and pre-fills
  the input with the gating Waypoint/Journey/Goal's remaining target
  (`getRemainingUnitAmount` in `taskCompletionGate.ts`) — completing a task
  that covers everything left is now a single tap on the prefilled value,
  still freely editable for partial progress. Wired into both
  `TasksScreen.tsx` and `DashboardScreen.tsx`.

### 004 — Journey header shows two identical "Books" goal dropdowns
- **Date**: 2026-08-22
- **Status**: ✅ Fixed
- **Screenshot**: ./screenshots/004.png
- **Report**: On a journey's page (e.g. "Stormlight Archive"), two dropdowns
  next to each other both show "Books" — looks like a duplicated goal-picker
  control.
- **Notes**: Not actually duplicated — the first pill is the Journey's
  Category (a fixed genre, here "Books"), the second is its linked Goal's
  title, which the user had also named "Books" (matches the screenshot's
  "3/20 toward 'Books'" Linked Goal section below). A Goal's title is free
  text, so it can collide with any Category name and the two pills render
  identically with nothing to tell them apart. `JourneyDetailModal.tsx`'s
  Goal pill now prefixes its label with "Goal: " to disambiguate.

### 005 — Tasks created inside a journey/waypoint don't inherit the journey's pillar
- **Date**: 2026-08-22
- **Status**: ✅ Fixed — [docs/sdd/028-journey-pillar-lock.md](../sdd/028-journey-pillar-lock.md)
- **Screenshot**: ./screenshots/005.png
- **Report**: A journey should be tagged to a pillar, and tasks created
  within that journey (e.g. from a waypoint's "Add a task") should
  automatically be attached to that same pillar. Currently they aren't.
- **Notes**: Genuine data-model gap, not a rendering bug — `Collection` had
  no `pillarId` at all. Went through the SDD loop per AGENTS.md (store-shape
  change). Ran Phase 0 three-lens brainstorming with the user; confirmed:
  hard-lock (not just soft-default) once a Journey has a Pillar, required on
  every newly-created Journey going forward (existing ones stay unset, no
  guessed backfill), and setting/changing an existing Journey's Pillar
  auto-retags its existing Tasks to the new Pillar's first Tag. Implemented
  in full (see spec's checklist) — code committed and pushed.
  `20260822000001_collection_pillar_id.sql` confirmed run against the live
  Supabase project (user ran it, independently re-verified via an anon-key
  REST query — `collections.pillar_id` exists, no missing-column error).
  Full interactive browser click-through still wasn't possible in this
  environment (no headless-browser tool available) — worth a manual pass.

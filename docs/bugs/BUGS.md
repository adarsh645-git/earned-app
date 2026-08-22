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

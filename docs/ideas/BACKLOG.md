# Idea Backlog

A running log of raw, unrefined app ideas — captured as-is whenever one comes
up, so nothing gets lost between sessions. This is a *capture* list, not a
spec. Ideas sit here until you're ready to work one up.

## How this works

1. **Drop the idea, any time, in any Claude Code session** — a sentence or a
   paragraph, doesn't need to be polished. Just say "add this to the idea
   backlog: ...".
2. I append it below as a new numbered entry: today's date, your text kept
   close to verbatim (I may lightly tighten wording, never change meaning),
   and status `🆕 New`. I commit + push that one-file change immediately
   (fast-track, per `AGENTS.md`) so it's never lost mid-session.
3. When you want to work one up, say "let's work up idea #N" (or just
   describe it again). I'll size it against the `AGENTS.md` Feature Work /
   Trivial Changes split:
   - **Trivial** → fast-tracked directly, entry marked `✅ Shipped`.
   - **Non-trivial** (economy rules, store shape, new Supabase tables,
     user-facing behavior) → kicks off the SDD three-lens brainstorm
     (`.claude/skills/sdd-feature-loop/`), gets its own numbered spec in
     `docs/sdd/`, and this entry is updated to `🚧 In progress` with a link
     to that spec.
4. Nothing here is committed to — it's a parking lot, not a roadmap. Ideas
   can sit indefinitely, get merged into each other, or get parked
   (`❌ Parked`) if we decide against them.

## Status legend

| Symbol | Meaning |
|---|---|
| 🆕 New | Captured, not yet discussed |
| 🔍 Exploring | Talked about it, still shaping |
| 🚧 In progress | Promoted to a `docs/plans/` doc or `docs/sdd/NNN-*.md` spec (linked) |
| ✅ Shipped | Built and merged |
| ❌ Parked | Decided against, or shelved indefinitely |

---

## Ideas

<!--
Entry template — copy this for each new idea:

### NNN — <short title>
- **Date**: YYYY-MM-DD
- **Status**: 🆕 New
- **Idea**: <the raw text as given>
- **Notes**: <anything added during later discussion; leave blank until then>
-->

### 001 — Journal entry, Claude-formatted, stored securely
- **Date**: 2026-08-21
- **Status**: 🆕 New
- **Idea**: A way to add a daily journal — write it roughly, unstructured,
  and have Claude run over it, format it nicely, and store it somewhere
  secure.
- **Notes**: Open questions to resolve when this gets worked up: where
  "somewhere secure" means in this app's context (a new Supabase table with
  RLS vs. something outside the app entirely), what "formatted nicely"
  looks like (structure/sections vs. just cleanup), and whether this is a
  feature inside Krushi itself or a separate personal tool.

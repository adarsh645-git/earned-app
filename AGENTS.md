# AGENTS.md - Earned App Development Guide

> This file serves as the unified instruction guide for all AI coding agents (Gemini, Claude, Cursor, Copilot, Codex, etc.). It loads on every turn — keep it to things every agent needs on every turn. Feature-design workflow lives in a skill, not here (see "Feature Work" below).

## ⚠️ Important Framework Version Note
# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code. Strictly adhere to Expo SDK v57 standards and avoid deprecated APIs.

---

## Project Overview
**Earned** is a personal "Discipline Economy" web & mobile application built using **Expo (React Native for Web)** and **Supabase**. The core vision is a gamified productivity system rooted in behavioural psychology and economic incentives:
- **Productive Focus** earns **Cash Balance ($)** and progresses **Macro Goals / Journeys**.
- **Guilt-Free Consumption / Indulgence** costs **Hours Balance (or creates Debt)**.
- **Local-First Architecture**: App works fully offline with `Zustand` + `AsyncStorage`, syncing to `Supabase PostgreSQL` in the background when authenticated.

---

## Tech Stack & Architecture

- **Frontend**: Expo SDK 57 (React Native for Web), React 19, TypeScript
- **State Management**: Zustand v5 with `persist` middleware and custom `safeStorage` wrapper over `@react-native-async-storage/async-storage`
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security, Auth with Google OAuth, Realtime subscriptions)
- **Styling & UI**: Custom dark-mode design system with Apple-inspired aesthetics (`#000000` base, `#1C1C1E` cards, `#AF52DE` productive purple, `#5AC8FA` entertainment blue, `#FF453A` debt red)
- **Deployment**: Vercel (Static Web Export via `npx expo export -p web`)

---

## Command Reference

### Local Development
```bash
# Start local web development server
npm run web          # or npx expo start --web

# Start Expo dev client (Native / Mobile)
npm run start        # or npx expo start

# Type Checking
npx tsc --noEmit
```

### Build & Deployment
```bash
# Export static web bundle for Vercel deployment
npx expo export -p web
```

---

## Key Conventions & Guidelines

1. **Expo SDK Versioning**: Strictly adhere to Expo SDK v57 standards. Avoid deprecated APIs.
2. **Local-First State**:
   - State lives in Zustand stores (`src/store/`).
   - Store changes automatically sync to Supabase via `syncEngine.ts`.
   - Never block UI renders on remote API calls; operate optimistically.
3. **Database & Schema Updates**:
   - Baseline schema: `supabase/schema.sql`
   - Migrations & Patches: `supabase/migrations/*.sql`
   - CLI Config: `supabase/config.toml`
   - All tables MUST enforce Row Level Security (RLS) checked against `auth.uid()`.
   - **These migration files are not auto-applied** — this project has no
     `supabase db push`/CI step wired up, so a new `.sql` file sitting in
     `supabase/migrations/` has done nothing until someone pastes it into
     the Supabase SQL Editor. Whenever a task adds or changes a migration:
     1. Tell the user exactly which file needs to be run against the live
        project, and don't mark the feature done until they confirm it's
        been run (or you've verified it yourself — e.g. a quick anon-key
        REST query for the new column/table).
     2. Never assume a column/table exists in production just because its
        migration file exists in the repo. This exact gap caused a real
        incident: `20260725000003_task_sort_order.sql` shipped but was
        never run, so every task upsert silently failed with a Postgres
        `42703` (column does not exist) error — see
        `docs/sdd/018-sync-health-indicator.md`.
4. **Browser Caching Strategy**:
   - Static web deployments use aggressive cache revalidation configured in `vercel.json` (`Cache-Control: public, max-age=0, must-revalidate`) to prevent stale PWA states.

---

## Peer Communication Model

Treat the user as a **Senior IT Professional & Solution Architect** with deep systems engineering experience. Maintain peer-to-peer technical rigor — high-density architectural dialogue evaluating trade-offs (eventual consistency vs immediate state, DB indexing, token budget, behavioral incentive loops) — without hand-holding or elementary explanations.

---

## Feature Work

Non-trivial features (new economy rules, currency/reward math, store shape changes, new Supabase tables, or anything touching user-facing behavior) follow the SDD loop defined in `.claude/skills/sdd-feature-loop/SKILL.md`. Claude Code loads it automatically when the task matches; other agents should read it directly. Specs live in `docs/sdd/`, indexed in `docs/sdd/README.md`.

## Trivial Changes: Fast-Track

For trivial edits (documentation, typos, comments, minor formatting/typing fixes, or small 1-2 file bug fixes) — i.e. anything that does **not** match the Feature Work criteria above:
1. Skip the SDD loop entirely.
2. Verify typechecks (`npx tsc --noEmit`).
3. Stage the specific files, commit using Conventional Commits, and push to remote.
4. Give a short 1-line confirmation (e.g. `[Auto-Pushed] docs: fix typo (commit a1b2c3d)`).

---

## Git Commit Standards

1. **Format**: Conventional Commits with a concise bulleted body:
   ```gitcommit
   <type>(<scope>): <short summary line under 72 chars>

   - Concise bullet detailing the key change
   - Concise bullet detailing affected files/components
   ```
2. **Commit Types**: `feat`, `fix`, `docs`, `refactor`, `schema`, `perf`, `test`, `chore`.
3. **Commit Scopes**: `economy`, `store`, `ui`, `sync`, `sdd`, `deps`, `auth`.
4. **Fast-Track Auto-Commit & Push**: see "Trivial Changes: Fast-Track" above — a pre-commit hook (`.claude/hooks/tsc-gate.sh`) enforces the typecheck gate on every commit regardless of path.

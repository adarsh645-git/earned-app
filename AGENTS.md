# AGENTS.md - Earned App Development Guide

> This file serves as the unified instruction guide for all AI coding agents (Gemini, Claude, Cursor, Copilot, Codex, etc.).

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
4. **Browser Caching Strategy**:
   - Static web deployments use aggressive cache revalidation configured in `vercel.json` (`Cache-Control: public, max-age=0, must-revalidate`) to prevent stale PWA states.

---

## 🎭 Agent Triad Persona & Peer Interaction Model

### 1. Multidisciplinary Persona
All AI agents working on **Earned** adopt a **Triad Mindset**:
- **Behavioral Economist**: Analyzes dual-currency velocity, streak reward multipliers, indulgence pricing, inflation/deflation balance, and debt mechanics.
- **Behavioral Psychologist**: Analyzes habit loops, dopamine triggers, friction reduction for productive focus, and friction insertion for indulgences.
- **Lead Solution Architect**: Enforces clean local-first Zustand architecture, Supabase RLS security, Expo SDK 57 performance, and token efficiency.

### 2. Peer Communication Model (Senior IT Professional)
- Treat the user as a **Senior IT Professional & Solution Architect** with deep systems engineering experience.
- Maintain **Peer-to-Peer Technical Rigor**: High-density architectural dialogue evaluating trade-offs (e.g., eventual consistency vs immediate state, DB indexing, token budget, behavioral incentive loops) without hand-holding or elementary explanations.

---

## 📐 Specification-Driven Development (SDD) Workflow

### Phase 0: 3-Lens Peer Brainstorming & Alignment
- **Mandatory Interactive Brainstorming & Alignment**: Before generating an implementation plan artifact (`implementation_plan.md`), drafting specs, or writing code for ANY non-trivial feature:
  1. **DO NOT** create an `implementation_plan.md` artifact or write code on your first response turn.
  2. **MUST** present Phase 0 analysis directly in chat to the user evaluating the feature through 3 lenses (*Behavioral Psychology*, *Behavioral Economics*, *System Architecture*).
  3. **MUST** ask targeted questions regarding trade-offs, schemas, and user flow **1 by 1**, providing explicit multiple-choice options for selection, and WAIT for the user's response to each question before proceeding to the next or creating plans/code.

### Phase 1–4: Execution Loop
1. **Specs Directory**: Feature specifications reside in `docs/sdd/` (indexed in `docs/sdd/README.md`).
2. **Spec-First Context Scoping**: Before implementing any non-trivial feature or bug fix:
   - Read **only** the relevant feature spec in `docs/sdd/` and targeted code files.
   - Do NOT perform broad workspace file dumps.
3. **Spec Structure**: Each SDD document must define:
   - Feature Objectives & User Flow
   - Data Schema / Interface Contracts
   - Implementation Checklist (`- [ ] Task`)
4. **Incremental Checklists**: Agents update task checkboxes (`- [x]`) in `docs/sdd/<spec>.md` as sub-tasks are completed.

---

---

## 📦 Git Commit Standards

1. **Format**: Use Conventional Commits with a concise bulleted body:
   ```gitcommit
   <type>(<scope>): <short summary line under 72 chars>

   - Concise bullet detailing key architectural / state / schema change
   - Concise bullet detailing affected UI components or stores
   - Concise bullet noting SDD spec checklist updates in docs/sdd/
   ```
2. **Commit Types**: `feat`, `fix`, `docs`, `refactor`, `schema`, `perf`, `test`, `chore`.
3. **Commit Scopes**: `economy`, `store`, `ui`, `sync`, `sdd`, `deps`, `auth`.
5. **Fast-Track Auto-Commit & Push for Trivial Changes**:
   - For trivial edits (documentation, typos, comments, minor formatting/typing fixes, or small 1-2 file bug fixes):
     - Verify typechecks (`npx tsc --noEmit`).
     - Automatically stage, commit using Conventional Commits (`git commit -m "docs: ..."`), and push to remote (`git push`).
     - Provide a short 1-line confirmation to the user.







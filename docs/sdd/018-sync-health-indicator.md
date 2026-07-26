# SDD: Sync Health Indicator

## 1. Feature Overview
Surfaces cloud-sync push/pull failures that were previously silent (`console.log`
only). Prompted by a real incident: a manual-patch migration
(`20260725000003_task_sort_order.sql`) was never run against the production
Supabase project, so every `tasks` upsert failed with a Postgres `42703`
("column does not exist") error — invisibly. Tasks stayed correct on the
device that created them (local-first) but never reached other devices, and
nothing told the user or a future debugger that sync was broken.

## 2. Three-Lens Alignment (Phase 0 — resolved with user)
- **Granularity**: one global "sync health" signal, not per-entity indicators.
- **Trigger threshold**: sustained failure only (2 consecutive failed
  attempts on the same channel), not the very first hiccup — avoids
  flashing a scary signal on ordinary transient network blips.
- **Placement**: repurpose the existing Cloud Sync entry points (desktop
  sidebar pill in `AppNavigator.tsx`, Account Status card in
  `ProfileScreen.tsx`, and the header inside `AuthModal.tsx`) rather than
  introduce new banner UI.
- **Recovery**: passive — rely on the existing retry-on-next-state-change /
  retry-on-next-realtime-event behavior already in `syncEngine.ts`, plus a
  manual "Retry Sync" button in `AuthModal` for an immediate re-attempt. No
  new polling loop/timer.

## 3. Data Schema / Interface Contracts
New ephemeral (non-persisted) store `src/store/syncStatusStore.ts`:

```ts
type ChannelStatus = {
  consecutiveFailures: number;
  lastError: string | null;
  lastSuccessAt: number | null;
};

interface SyncStatusState {
  channels: Record<string, ChannelStatus>;
  recordSuccess: (channel: string) => void;
  recordFailure: (channel: string, error: string) => void;
}
```

Tracked channels mirror `syncEngine.ts`'s existing try/catch boundaries:
`pull`, `economy`, `tasks`, `pillars`, `tags`, `rewards`, `summits`,
`collections`. `FAILURE_THRESHOLD = 2`. Helper selectors
`isSyncUnhealthy(channels)` / `getFailingChannels(channels)` derive the
global boolean and the failing-channel list for display.

No Supabase schema change — this is a client-only observability feature.

## 4. Implementation Checklist
- [x] Add `src/store/syncStatusStore.ts` (channels map, record actions, threshold, selectors)
- [x] Wire `recordSuccess`/`recordFailure` into every push/pull/delete try-catch in `src/store/syncEngine.ts`
- [x] Add `retrySync(userId)` in `syncEngine.ts` — re-runs `pullCloudData` + re-pushes current state of every store
- [x] `AppNavigator.tsx` desktop sidebar pill: amber "sync paused" state when unhealthy
- [x] `ProfileScreen.tsx` Account Status card: same amber state
- [x] `AuthModal.tsx`: failing-channel list, last error, "Retry Sync" button when unhealthy
- [x] Typecheck (`npx tsc --noEmit`)

## 5. Implementation Notes (found during Phase 2)
- **The original push/delete calls never checked `{ error }`** on the
  Supabase response — `await supabase.from(...).upsert(...)` resolves
  normally even on a Postgres error (it doesn't throw), so the existing
  `catch` blocks — and even their `console.log`s — were never reached by
  the `sort_order` bug. Added `if (error) throw error` after every
  upsert/select so failures actually surface through the new
  `reportResult()` calls. This is a correctness fix in its own right, not
  just plumbing for the new feature.
- `pullCloudData`'s `profiles` select is expected to return `PGRST116` (no
  row) for a brand-new user who hasn't pushed a profile yet; that specific
  code is excluded from counting as a pull failure.

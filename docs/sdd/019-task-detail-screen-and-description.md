# SDD: Task Detail Screen & Description Field

## 1. Feature Overview
Mobile task rows carried the full desktop pill row (Tag/Duration/Journey/
created-time chips), which felt cluttered on a phone. This replaces that with
a minimal mobile row (title + a quiet plain-text caption) and moves all
secondary editing — plus a new free-text `description` field, subtask
management, and Start Timer/Icebox/Delete — into a single full-screen Task
Detail view, opened by tapping the row (or its pencil action) on any screen
and any platform (native app included — the gating hook is width-based, so it
applies identically there).

## 2. Three-Lens Alignment (Phase 0 — resolved with user)
- **Economics**: no currency/payout surface touched — `description` is purely
  informational, and subtask creation reuses the existing `addTask` action
  unchanged, so it inherits whatever bounty/economy safeguards already exist
  there. No new exploit surface.
- **Psychology**: pills moved behind a deliberate tap (progressive
  disclosure) so the daily list stays a fast glance-and-check surface; a
  plain-text caption (`Tag · Xm`, no chip chrome) was kept on mobile rows
  rather than going fully bare, so at-a-glance scanning survives the
  decluttering.
- **Architecture**: the new screen is a plain `<Modal>` driven by
  screen-local state (this app's only established "detail experience"
  pattern — no navigator-route screens exist anywhere), self-wrapped in
  `SafeAreaView`. It reuses `PillPicker`/`TimeSelectorModal` rather than
  rebuilding pickers, and reuses `AnimatedTaskRow variant="subtask"` for the
  subtask list rather than a bespoke row.
- **Decision**: the new screen **replaces** the old pencil → `EditTaskModal`
  popup entirely (one editing surface, not two) — both the pencil action and
  tapping the row now open the same `TaskDetailModal`.

## 3. Data Schema / Interface Contracts
`src/store/taskStore.ts` — `Task` gains one optional field:
```ts
description?: string;
```
New migration `supabase/migrations/20260726000001_task_description.sql`:
```sql
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT;
```
`supabase/schema.sql`'s baseline `tasks` table updated to match (documentation
parity with the patch-migration convention already used for `parent_id`/
`sort_order`). `src/store/syncEngine.ts` threaded `description` through both
the pull mapping and `pushAllTasksToCloud`'s upsert payload.

**⚠️ This migration is not auto-applied.** Per AGENTS.md's migration rule —
the exact gap that caused the `sort_order` sync-failure incident — this file
must be manually pasted into the Supabase SQL Editor and run against the live
project before cloud sync of `description` will work. Local-first behavior
(create/edit/read on-device) works immediately regardless.

New component `src/components/TaskDetailModal.tsx`:
```ts
interface TaskDetailModalProps {
  task: Task | null;
  visible: boolean;
  tasks: Task[]; // subtasks derived via tasks.filter(t => t.parentId === task.id)
  tags: Tag[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStartTimer?: (id: string, mins: number) => void;
  onMoveToIcebox?: (id: string) => void;
  onActivateFromIcebox?: (id: string) => void;
  addTask: (task: { title: string; parentId?: string }) => string;
}
```
Callers (`TasksScreen.tsx`, `DashboardScreen.tsx`) hold a `detailTaskId:
string | null` rather than a `Task` snapshot, deriving `detailTask =
tasks.find(t => t.id === detailTaskId)` fresh on every render — required so
the screen reflects its own autosaved edits (tag/duration/journey/title)
live while still open, instead of showing a stale snapshot until reopened.

## 4. Implementation Checklist
- [x] `Task.description?: string` in `taskStore.ts`
- [x] `supabase/migrations/20260726000001_task_description.sql` (not yet run against production — flag to user)
- [x] `supabase/schema.sql` baseline updated to match
- [x] `syncEngine.ts` pull mapping + `pushAllTasksToCloud` payload include `description`
- [x] `AnimatedTaskRow.tsx`: mobile branch renders a plain `Tag · Xm` caption instead of the interactive pill row; desktop (`!isMobile`) unchanged
- [x] `AnimatedTaskRow.tsx`: row `Pressable`'s `onPress` now calls `onEdit?.(task)` instead of `onToggleExpand` (the dedicated expand/collapse chevron action button is untouched and remains the sole subtask-expand control)
- [x] New `src/components/TaskDetailModal.tsx` — title (editable), completion checkbox, Tag/Duration/Journey pickers, description textarea, subtask list + inline add, Start Timer / Icebox / Delete actions
- [x] `TasksScreen.tsx` and `DashboardScreen.tsx` rewired from `editTask`/`EditTaskModal` to `detailTaskId`/`TaskDetailModal`
- [x] Retired `src/components/EditTaskModal.tsx` (no remaining importers)
- [x] Typecheck (`npx tsc --noEmit`)

## 5. Implementation Notes
- Reused `EditableText` for the title field (already proven for inline title
  editing on the row) rather than a plain `TextInput`, so title-edit
  semantics (commit on blur/submit, revert on empty) stay identical between
  the row and the detail screen.
- The pencil action button on the row was left in place (still calls
  `onEdit`) alongside the new whole-row tap target — both open the same
  screen now, so nothing is lost for anyone relying on the explicit icon.

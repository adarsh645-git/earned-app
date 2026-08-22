# Krushi

A personal "Discipline Economy" app. Productive focus earns Cash and progresses Journeys; guilt-free consumption costs Hours or creates Debt. This file tracks GTD-aligned vocabulary as the task/journey system is redesigned around GTD (Getting Things Done) principles — see `docs/ideas/BACKLOG.md` #002.

## Language

**Journey**:
The GTD "Project" equivalent — any desired outcome that takes more than one action to complete. Stored as `Collection` in code (`src/store/collectionStore.ts`); UI-facing name is "Journey," code type name stays as-is.
_Avoid_: Project (in UI copy), Collection (in product language)

**Waypoint**:
An optional sub-grouping of actions within a Journey. Not a distinct GTD structural tier — GTD has only Project → Next Action — but permitted as an informal grouping convenience for large Journeys, same way GTD practitioners informally cluster actions within a big project.
_Avoid_: Sub-project, milestone (implies a formal GTD tier that doesn't exist)

**Task**:
The GTD "Next Action" equivalent — a single, atomic, physical next step. Stored as `Task` in code (`src/store/taskStore.ts`); can nest one level via `parentId` for subtasks.
_Avoid_: Action item, to-do (as the canonical term — "Task" is the established name in code and UI)

**Inbox**:
The GTD "Capture" landing zone — any Task with no tag assigned yet (`tagId` unset). Not a stored status, just tasks in an unclarified state; a Task leaves the Inbox the moment it's tagged. Processed via the Clarify step, kept as a separate pass from Capture rather than resolved inline at creation.
_Avoid_: Unsorted, untagged (as the canonical term — "Inbox" is the GTD name and the one used in mocks/UI)

**Weekly Review**:
The GTD "Reflect" ritual — a periodic pass that empties the Inbox, confirms every active Journey has a Task, and skims the Icebox and the week's completed Tasks. Due on a rolling 7-day cadence from the last completed review (timestamp synced via Supabase). Tied to `streak`, not `debt` or `hoursBalanceMinutes` — completing on time protects/extends the streak, missing it breaks the streak, same continuity signal the rest of the app already uses. Presented as a single scrollable checklist, not a multi-step wizard.
_Avoid_: Retro, check-in

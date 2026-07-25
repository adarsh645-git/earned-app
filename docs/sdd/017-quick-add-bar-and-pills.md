# 017 — Quick-Add Bar & Click-to-Edit Row Pills

## Objective

Replace the four "+ X" button → full centered `Modal` creation flows (New
Task, New Journey, New Waypoint, Add Item) with a TickTick-style single-line
quick-add bar: type a title, press Enter, done. Secondary fields (Tag,
Duration, Journey link, Category, Goal, Target, Year, Month, Waypoint
assignment) no longer need to be set at creation time — they get safe,
visible defaults and become tappable **pills on the created row** for
in-place correction. Only *creation* changes; existing edit flows
(`EditTaskModal`, `EditSummitModal`, the Journey/Waypoint edit modals) are
untouched.

Decided via Phase 0 brainstorming (Behavioral Economist / Psychologist /
Architect) with the user, across five question rounds:

1. **Scope**: all four entities (Task, Journey, Waypoint, Item) get the
   quick-add treatment.
2. **Smart defaults, remember-last-used**: Tag defaults to the last tag used
   (persisted), Journey-link defaults to none, Category defaults to
   `'general'`, Goal defaults to none.
3. **Goal (Summit) linking**: the Goal picker lists existing Summits + "None"
   like a Tag picker; a "+ Create New Goal..." row expands the existing
   5-field inline Summit-creation sub-form in place rather than rebuilding it
   as a pill.
4. **Pill placement — row, not bar.** TickTick's own composer is a bare input
   with no pills; the Date/Priority/Tags UI shown in reference screenshots is
   a context menu on an *already-created* row. Cramming 3-4 pills into the
   composer risked overcrowding on narrow widths. So every bar is bare except
   for one confirmed exception (#5), and pills live on the row instead —
   which also gives the user an immediate, one-tap correction surface right
   after a silent default is applied, addressing the "hidden default breaks
   reward-toast trust" risk flagged by the Behavioral Psychologist lens.
5. **Exception — Duration stays in the Tasks bar.** `estimatedMinutes`
   directly scales the Hours payout on completion, so unlike every other
   field it is NOT fully silent-deferred: the Tasks quick-add bar keeps one
   visible Duration pill (default 25m, tap to change before saving).

**Refinement round** (post-implementation, real-world testing feedback):

6. **Tasks — optional pre-submit expand.** A chevron on the bar reveals
   Tag/Journey/Icebox pills so they can be set *before* saving, for anyone who
   wants to front-load the decision instead of fixing it via row pills after.
   Untouched, the bar behaves exactly as decisions 1-5 describe.
7. **Journeys — no modal at all, an inline accordion.** Replaced the top-right
   "New Journey" button with a collapsed `"+ New Journey"` trigger row;
   tapping it expands (via `LayoutAnimation`, the same idiom this screen
   already uses for its Journey/Waypoint row accordions) into a full inline
   form — Title, Category pill, Goal pill, explicit Cancel/Create — living in
   the page flow, not an overlay. Journeys get a fuller form (not a bare bar)
   since they're a bigger, less-frequent commitment than a task.

**Second refinement round** (post-implementation, UX bug report): `PillPicker`'s
dropdown was visibly pushing surrounding content down when opened (screenshot
showed the Journey accordion's Cancel/Create buttons sliding away). This was
`PillPicker` inheriting `EditTaskModal`'s in-flow dropdown idiom, which only
works inside an already-floating modal — wrong for a pill in the main page flow.

8. **`PillPicker`'s dropdown is now a floating, non-displacing popover** —
   the industry-standard pattern for a field-picker (shadcn Popover+Command,
   Notion property pickers, native `<select>`), as distinct from an
   **accordion** (correctly used for "+ New Journey" and Waypoint-row
   expansion, which legitimately push content and are unaffected by this
   fix). Scoped entirely to `PillPicker.tsx` — its prop contract is
   unchanged, so none of its six call sites needed updating.

## User Flow

1. **Task quick-add** (`TasksScreen.tsx`): a bar reading "Add a task..." with
   one trailing Duration pill ("25m" by default). Typing a title and pressing
   Enter (or tapping send) creates the task immediately with `tagId` = last
   used tag, `isIcebox = false`, `estimatedMinutes` = whatever the Duration
   pill currently shows. The row then displays Tag, Duration, and Journey-link
   as tappable pills for correction at any time (before or after completion).
2. **Journey quick-add** (`CollectionsScreen.tsx`): a bare bar at the top of
   the Journeys list. Enter creates the Journey with `category = 'general'`,
   no linked Goal. The row's category badge and linked-Goal badge become
   pills; the Goal pill's dropdown has a "+ Create New Goal..." row that
   expands the existing inline Summit sub-form (Title, Time-or-Count, Target,
   Horizon, Contributes-To) beneath the row.
3. **Waypoint quick-add**: a bare bar inside each expanded Journey's waypoints
   area, replacing the "+ Waypoint" footer chip. Enter creates the Waypoint
   with no target/year/month set. The row's timeframe/target display becomes
   Target/Year/Month pills.
4. **Item quick-add**: bare bars replacing both the per-waypoint "Add Task"
   chip and the journey-footer "+ Task" chip, pre-filling `waypointId` from
   context when launched inside an expanded waypoint. The row gets a
   Waypoint-reassignment pill and an optional Minutes pill (lowest priority of
   the four — smallest footprint, least frequently adjusted).
5. **Editing, unchanged**: the pencil-icon edit modals for Task/Journey/
   Waypoint/Summit remain exactly as they are today, alongside the new row
   pills — two ways to fix the same field, no regression for anyone who
   prefers the fuller form.
6. Existing celebration/reward feedback (`triggerConfetti`, `celebrationInfo`,
   `RewardToast`, `feedback('taskComplete')`) carries over into the new
   submit handlers unchanged.

## Data Schema / Interface Contracts

- `src/store/taskStore.ts`: add `lastUsedTagId: string` (persisted, initial
  `''`) + `setLastUsedTagId(id)`. Widen `addTask`'s parameter from
  `Omit<Task,'id'|'completed'|'dateCreated'>` to `{ title: string; tagId?:
  string; estimatedMinutes?: number; isIcebox?: boolean; summitId?: string;
  collectionId?: string }`, filling safe defaults inside the action (tagId ←
  `lastUsedTagId` → first non-archived tag → `''`; estimatedMinutes ← 25 if
  missing/invalid; isIcebox ← `false`) and updating `lastUsedTagId` on every
  call. Backward-compatible — existing full-object callers still typecheck
  and behave identically.
- `src/store/collectionStore.ts`: `addCollection` defaults `category` to
  `'general'` when omitted (reuses the value already proven safe by
  `backfillJourneysForOrphanSummits`). `addWaypoint`/`addItem` need no type
  changes — title + parent id was already sufficient.
- New components: `src/components/QuickAddBar.tsx` (`{placeholder, value,
  onChangeText, onSubmit, accentColor?, disabled?, trailingAccessory?,
  expandable?}`) and `src/components/PillPicker.tsx` (`{label, icon?,
  options: {id, label, sublabel?, icon?}[], selectedId, onSelect, open,
  onToggle, accentColor?, footerAction?}`). `PillPicker`'s dropdown renders
  as a floating popover — `measureInWindow` on the pill's anchor `View` ref,
  then a transparent `Modal` with a sibling full-screen backdrop `Pressable`
  (dismiss) and an absolutely-positioned option list (clamped to viewport
  edges, flips above the anchor if there's no room below, capped
  `maxHeight` with internal scroll for long lists) — not the in-flow
  always-expanding list it started as.
- `src/components/LinkProgressPicker.tsx`: extract its journey-eligibility
  filter into an exported helper `getEligibleJourneys(collections, summits,
  tagType)` for reuse by the new Task-row Journey pill; its always-expanded
  chip-row rendering is no longer used by the create path (still fine as-is
  for any other caller).

## Implementation Checklist

- [x] `taskStore.ts`: `lastUsedTagId` + `setLastUsedTagId`, widen `addTask` with default-fill
- [x] `collectionStore.ts`: `addCollection` defaults `category` to `'general'`
- [x] `LinkProgressPicker.tsx`: extract `getEligibleJourneys` helper
- [x] New `src/components/PillPicker.tsx`
- [x] New `src/components/QuickAddBar.tsx` (incl. `expandable` chevron slot, added in the refinement round)
- [x] `TasksScreen.tsx`: quick-add bar (+ Duration trailing pill) replaces "Add Task" button/modal
- [x] `TasksScreen.tsx`: chevron expand reveals Tag/Journey/Icebox pills pre-submit (refinement round)
- [x] `AnimatedTaskRow.tsx`: Tag/Duration/Journey pills on the row
- [x] `CollectionsScreen.tsx`: "New Journey" replaced with a collapsible inline accordion (Title, Category pill, Goal pill, Cancel/Create) — no modal (refinement round supersedes the original bare-bar plan for Journeys)
- [x] `CollectionsScreen.tsx`: Journey row Category/Goal pills (placed in the expanded accordion area, not the compact collapsed header, to avoid bloating that row)
- [x] `CollectionsScreen.tsx`: Waypoint quick-add bar replaces "+ Waypoint" chip/modal create path
- [x] `CollectionsScreen.tsx`: Waypoint row Target/Year/Month pills
- [x] `CollectionsScreen.tsx`: Item quick-add bar(s) replace "Add Task"/"+ Task" chips/modal create path
- [ ] `CollectionsScreen.tsx`: Item row Waypoint/Minutes pills — **skipped**, per the plan's own "lowest priority" call: Item rows show no metadata today, so adding pills here means new UI, not converting an existing badge; revisit if wanted later
- [x] Journey/Waypoint modals shrunk to edit-only (create branches removed, `if (editing…)` branches kept); the Item modal had no edit path at all and was deleted entirely
- [x] `PillPicker.tsx`: converted from in-flow expansion to a measured, viewport-clamped floating popover (second refinement round)
- [x] `npx tsc --noEmit` clean

## Notes

- No Supabase schema/migration changes — this is local store defaulting +
  UI, not a new persisted shape.
- `TimeSelectorModal.tsx` is reused verbatim (both from the Tasks bar's
  Duration pill and the row's Duration pill) — a two-axis wheel/manual picker
  doesn't fit a flat option list, so it's the one deliberate exception to the
  "everything is a flat-list pill" pattern, alongside the Target/Minutes
  numeric mini-popovers.
- `EditTaskModal.tsx`, `EditSummitModal.tsx`, and the Journey/Waypoint edit
  modals are explicitly out of scope for this pass beyond removing their
  now-redundant create branches — editing UX is unchanged.
- The Item Create Modal had no edit path at all (items are only ever edited by
  toggling/deleting), so once its create branch moved to the quick-add bars it
  was fully dead code and was deleted outright, along with its
  `isItemModalOpen`/`activeCollectionId`/`selectedWaypointId`/`itemTitle`/
  `itemEstimatedMinutes` state and `handleOpenNewItem`/`handleCreateItem`.
  `handleOpenNewWaypoint` was removed the same way once its only caller (the
  old "+ Waypoint" chip) was replaced.
- Journey and Waypoint rows are inline JSX inside `collections.map(...)`, not
  their own components (unlike `AnimatedTaskRow`), so their row-pill open
  state uses id-keyed `Record<string, ...>` maps
  (`journeyRowOpenPill`, `waypointRowOpenField`) rather than local `useState`
  — same idiom this screen already used for `expandedJourneys`/`expandedWaypoints`.
- The Goal PillPicker on an *existing* Journey's row intentionally has no
  "+ Create New Goal..." escape hatch (unlike the creation accordion's Goal
  pill) — editing a Journey's goal only ever offers existing Summits, matching
  the pre-existing constraint that new-Summit creation was already
  edit-modal-excluded (spec 016).

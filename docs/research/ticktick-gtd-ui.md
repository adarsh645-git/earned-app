# TickTick's GTD-Equivalent UI — Primary-Source Research

This is the first file in a new `docs/research/` folder; no prior convention existed in this repo before this task. It exists as design inspiration for a GTD-aligned redesign of a different app ("Krushi"), not as documentation of Krushi itself.

**Sourcing constraint used:** only TickTick-owned primary sources — `help.ticktick.com` (TickTick's current official help center; the older `support.ticktick.com` Zendesk domain now 301-redirects here) and `ticktick.com/resources` (TickTick's own official guide/blog content). No third-party listicles, Reddit, Medium, or review sites were used as sources for any claim below. Every article cited was fetched and read in full (not just seen in search-snippet form) before being cited. Where I could not find a primary TickTick source for a sub-claim, that is stated explicitly rather than filled in from a secondary source.

---

## 1. Inbox / quick-capture UX

TickTick ships a built-in **Inbox** smart list. TickTick's own help center defines it precisely: *"'Inbox' is a temporary task transfer station where all tasks that cannot be sorted temporarily can be placed. (Inbox cannot be hidden or deleted.)"* — it is one of five default smart lists (Today, Tomorrow, Next 7 Days, Inbox, Assigned to Me) [Manage Tasks with Lists](https://help.ticktick.com/articles/7055782283059396608).

A task lands in the Inbox whenever it is created without an explicit list assignment — this is the natural fallback of every quick-capture path, not a separate action. TickTick's own GTD guide confirms the capture→Inbox link directly: *"if you're already in the GTD process, swiftly capture any thoughts using TickTick's powerful inbox features"* [Getting Things Done (GTD): What It Is and How to Do It](https://ticktick.com/resources/article/7310132995229220864/getting-things-done-gtd).

Capture UI, per TickTick's own "Add Tasks" article [Add Tasks](https://help.ticktick.com/articles/7055782422935240704):
- **Mobile:** *"Click the '+' icon that is visible everywhere, enter the task, and click the icon to easily create the task."*
- **Desktop:** *"Enter the content in the 'task addition bar' at the top of the task list page, and press the Enter key to create it."*
- **Global desktop shortcut:** *"TickTick provides Windows and Mac users with a 'global add' shortcut (Shift + Alt + A). Whether you're replying to work messages or browsing courses, simply press the shortcut key to bring up the 'task add bar' with just one click."*
- **Natural-language date parsing ("Smart Recognition"):** *"TickTick supports recognizing dates and times in tasks. You only need to add dates and time in the task content, and we will automatically set the reminder time for you… For example, input 'Meeting at 9 tomorrow'."* This can be toggled off in Settings → General → Smart Recognition.
- **Other capture paths documented on the same page:** voice add (long-press the "+" to speak), widgets (Android/iOS/Windows home-screen "+"), email-to-task (a dedicated `todo@mail.ticktick.com` address plus a personalized per-user email address), iOS Siri ("Add 'Go to library tomorrow' to TickTick"), clipboard-detection ("Recognize information in clipboard" auto-prompts "you may want to add a task" when the clipboard contains time info), and pasting multiple lines to trigger a "Batch Add Tasks" prompt.

None of these quick-capture paths require picking a list at capture time — that is exactly what makes them "quick," and it is what routes the task to Inbox by default.

## 2. Moving an Inbox task into a List/Project

TickTick documents several distinct mechanisms, not just one:

- **Field/picker in task detail:** *"Right-click a task and choose Move to, or click the List field at the bottom of the task detail area to quickly move a task to another list. You can also type a list name to search."* (desktop); *"click on 'List' at the top of the details page to quickly move tasks to other lists. You can also enter the list name to quickly search for it."* (mobile) [Task Details and Editing](https://help.ticktick.com/articles/7055782408586526720).
- **Drag-and-drop (desktop):** *"To move a task from one list to another, hover over it and drag the hamburger icon on the left to the destination list in the sidebar."* The same article notes this also works to drag a task onto a Smart List (auto-sets its due date) or onto a tag (auto-applies it) [Desktop Interaction Tips](https://help.ticktick.com/articles/7351523697951244288).
- **Swipe action (mobile):** *"Swipe the task to the left to see three options appear on the right side of the task. They respectively represent 'Move Task', 'Delete Task', and 'Modify Date'."* Swipe actions are user-customizable in Settings → General → Swipe Actions [List View](https://help.ticktick.com/articles/7055782365863346176).
- **Batch/multi-select move:** on iOS/Android, "…" → Select → choose multiple tasks → edit new list; on desktop, Shift-click or box-select a range, which opens a batch-editing toolbar that includes list re-assignment [List View](https://help.ticktick.com/articles/7055782365863346176), [Desktop Interaction Tips](https://help.ticktick.com/articles/7351523697951244288).

So: picker, drag-and-drop, and swipe are all first-class, officially documented ways to do it — TickTick does not force one canonical interaction.

## 3. "Someday" or backlog-equivalent feature

TickTick has **no dedicated built-in "Someday" feature** (no special list type, no built-in smart list, no reserved tag). I confirmed this by fetching TickTick's full help-center article corpus (94 articles) directly and searching it for "Someday" — it does not appear in any help-center feature article (Lists, Tags, Folders, Filters, Smart Lists, etc. all omit it).

Instead, Someday/Maybe is a **convention TickTick itself recommends users build using an ordinary user-created list**, as part of its own official GTD guide: *"The core of the GTD system includes Inbox, Next Actions, Waiting For, Projects, and Someday."* [Getting Things Done (GTD)](https://ticktick.com/resources/article/7310132995229220864/getting-things-done-gtd). The same article's inbox-processing walkthrough tells the user explicitly when to route a task there: *"Does it have a specific deadline? If yes, establish a due date and transfer it to the 'Next Actions' list. If it's pending, move the task to the 'Someday' list."* — i.e. Someday is just a regular list the user creates and moves tasks into by hand, using the same "Move to List" mechanisms as item 2 above.

**No primary TickTick source found** for Someday being implemented as a tag, a folder, or a smart-list filter — TickTick's own guide frames it purely as a plain list.

## 4. Built-in review/reflection feature

**No primary TickTick source found for a dedicated "Review" screen or mode** in TickTick — I confirmed this the same way, by full-text search across all 94 fetched help-center articles for "review" and "GTD"; no article describes a standalone Review feature, and none names "Weekly Review" as a built-in mechanic. (Third-party sources surfaced in search results claim a "Weekly Review note template" exists, but this could not be verified in TickTick's own Notes/Summary documentation — see the FAQ note below — so it is not included as a claim.)

What TickTick's own content actually offers, and explicitly recommends for GTD-style reflection, is a combination of existing view/filter features rather than a purpose-built review flow:

- **TickTick's own GTD guide names "Reflect" as one of the 5 GTD steps** and tells the user how to do it with existing TickTick surfaces, not a dedicated tool: *"You can perform reflections twice a day, once in the morning and once in the evening. During these reflections, check the status of each list, mark completed tasks, reschedule overdue tasks, and mark tasks you're abandoning as 'canceled'… Additionally, review the 'Inbox' and 'Someday' lists to adjust your plans based on any changes."* [Getting Things Done (GTD)](https://ticktick.com/resources/article/7310132995229220864/getting-things-done-gtd). Note this guide frames reflection as a *twice-daily* habit, not specifically weekly — TickTick does not publish an official "Weekly Review" cadence or checklist under that name.
- **Month View is explicitly pitched as a review surface** — its own help article subtitle is "Monthly Review and Reflection": *"Summary and review is an important tool for self-growth… When you need to review what you have done in a month, just take a look at the Month View."* It documents filtering the view by list ("filter the list according to different aspects of life, such as work, life, and study") and toggling off "Show Completed" to isolate missed/incomplete tasks [Month View - Monthly Review and Reflection](https://help.ticktick.com/articles/7055782128335716352).
- **Filters** (Normal and Advanced, with AND/OR logic across list, tag, date, priority, keyword) are TickTick's general-purpose mechanism for building any custom saved view, including a "what's stale/overdue" view, but this requires the user to build it themselves — TickTick ships no default "stale" or "overdue" smart list out of the box (the only default smart lists are Today, Tomorrow, Next 7 Days, Inbox, Assigned to Me) [Filters - Choose What You Want to See](https://help.ticktick.com/articles/7055782240994721792), [Manage Tasks with Lists](https://help.ticktick.com/articles/7055782283059396608).
- **Notes + Summary** can assemble a written review: the Summary feature *"can help you understand and summarize the completion status of tasks over a period of time, and generate editable text that you can directly add to note pages,"* filterable by date range/list/tag/status, and Notes ships three preset templates (Meeting Note, Reading Note, and a third) — but I could not verify the third template's name or content from TickTick's own article text (the page only says *"We have prepared three preset templates for you: simply select one to automatically add it to your notes"* without naming all three), so I am not asserting a "Weekly Review" template exists. This is the one sub-claim in this research where third-party sources say something TickTick's own text does not confirm [📔 Notes and Summary](https://help.ticktick.com/articles/7055780476358754304).

## 5. Minimal vs. complex UI patterns

**Lightweight / minimal patterns** (documented above, TickTick-sourced):
- Single global Inbox as the automatic landing zone for anything captured without a list — no separate "send to inbox" step exists; it's just what happens by default [Manage Tasks with Lists](https://help.ticktick.com/articles/7055782283059396608).
- One-line quick-add bar with natural-language date parsing ("Meeting at 9 tomorrow" auto-sets the reminder) [Add Tasks](https://help.ticktick.com/articles/7055782422935240704).
- Swipe-to-move / swipe-to-delete / swipe-to-reschedule on mobile — three actions, no submenu [List View](https://help.ticktick.com/articles/7055782365863346176).
- Someday implemented as *just a plain list*, not a new data type — reuses the exact same "Move to List" affordance as every other list move [Getting Things Done (GTD)](https://ticktick.com/resources/article/7310132995229220864/getting-things-done-gtd).
- Reflection framed as reusing existing views (Month View, Inbox, Someday list) rather than a bespoke screen [Getting Things Done (GTD)](https://ticktick.com/resources/article/7310132995229220864/getting-things-done-gtd), [Month View](https://help.ticktick.com/articles/7055782128335716352).

**Complexity-adding patterns** (documented above, TickTick-sourced, explicitly not relevant to Krushi per the background brief):
- Advanced Filters with multi-statement AND/OR logic across list/tag/date/priority/keyword [Filters - Choose What You Want to See](https://help.ticktick.com/articles/7055782240994721792).
- Five-level task hierarchy: Folder → List → Section → Task → Subtask [How to Manage Numerous Tasks](https://help.ticktick.com/articles/7055782309420597248).
- Kanban view, Timeline view, Eisenhower Matrix, and a separate Notes+Summary+Template subsystem layered on top of the base task model [Beginner's Guide](https://help.ticktick.com/articles/7054286604315131904), [📔 Notes and Summary](https://help.ticktick.com/articles/7055780476358754304).
- Custom saved Filters as user-built objects (name, icon, AND/OR rule sets) sitting alongside Lists and Tags as a third parallel organizational axis [Filters - Choose What You Want to See](https://help.ticktick.com/articles/7055782240994721792).

---

## Relevance to Krushi

**Patterns worth stealing:**
- **Inbox section:** Model Krushi's Inbox exactly like TickTick's — the *default*, automatic landing spot for any task saved without a tag/category, not a separate capture destination the user chooses. This matches TickTick's core definition (*"a temporary task transfer station where all tasks that cannot be sorted temporarily can be placed"*) and requires no new capture UI, only a "no tag yet" fallback rule — directly reusable in Krushi's existing task-creation flow. [Manage Tasks with Lists](https://help.ticktick.com/articles/7055782283059396608)
- **Clarify → Journey conversion:** TickTick's "Move to List" pattern — a simple picker field plus drag/swipe as alternates — is the right level of complexity for Krushi's Clarify step: tag, send to Someday/Maybe, or convert to a Journey should all be exposed as flat one-tap actions inside the existing Inbox section, not a new screen, mirroring TickTick's task-detail "List field" and mobile swipe actions. [Task Details and Editing](https://help.ticktick.com/articles/7055782408586526720), [List View](https://help.ticktick.com/articles/7055782365863346176)
- **Someday/Maybe as a plain bucket, not a new data type:** TickTick's own GTD guide treats Someday as an ordinary list, reusing the same move mechanism as any other list. Krushi's Someday/Maybe should likewise reuse whatever primitive already holds "not-yet-a-Journey" tasks rather than introduce a new status enum or table. [Getting Things Done (GTD)](https://ticktick.com/resources/article/7310132995229220864/getting-things-done-gtd)
- **Weekly Review checklist content and cadence:** TickTick's own guide gives Krushi's Weekly Review checklist direct textual backing — *"check the status of each list, mark completed tasks, reschedule overdue tasks… review the 'Inbox' and 'Someday' lists"* is essentially the same four-item checklist Krushi's spec already proposes (empty Inbox, confirm every Journey has a Task, skim Someday/Maybe, skim completed tasks). Worth citing as external validation that this checklist content is GTD-orthodox, since TickTick — a GTD-branded competitor — arrived at the same set of checks. [Getting Things Done (GTD)](https://ticktick.com/resources/article/7310132995229220864/getting-things-done-gtd)
- **No dedicated Review screen needed:** the fact that TickTick — despite explicitly marketing GTD compatibility — ships *no* standalone Review feature and instead just repurposes its Month View / Inbox / Someday list for reflection is direct evidence that Krushi doesn't need a new screen either; a collapsible section/modal on the existing tasks screen (as already planned) is sufficient and matches how the closest GTD-branded competitor actually does it. [Getting Things Done (GTD)](https://ticktick.com/resources/article/7310132995229220864/getting-things-done-gtd)

**Patterns explicitly NOT worth copying (complexity Krushi doesn't want):**
- Advanced Filters with AND/OR multi-statement logic as a third parallel organizational axis alongside lists and tags — overkill for Krushi's flat Journey→Waypoint→Task model. [Filters - Choose What You Want to See](https://help.ticktick.com/articles/7055782240994721792)
- The five-level Folder → List → Section → Task → Subtask hierarchy — deeper nesting than Krushi's three-level Journey → Waypoint → Task needs. [How to Manage Numerous Tasks](https://help.ticktick.com/articles/7055782309420597248)
- Kanban/Timeline/Eisenhower-Matrix alternate views and a parallel Notes+Summary+Template subsystem — extra screens and a second content type (Notes vs. Tasks) that would directly contradict Krushi's stated goal of reusing existing minimal components and avoiding new screens. [Beginner's Guide](https://help.ticktick.com/articles/7054286604315131904), [📔 Notes and Summary](https://help.ticktick.com/articles/7055780476358754304)
- The sheer number of parallel capture channels (email-to-task, Siri, clipboard-detection, widgets, voice) — appropriate for a mature multi-platform product, but adds surface area Krushi has no stated need for right now.

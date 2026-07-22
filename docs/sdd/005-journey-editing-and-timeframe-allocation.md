# SDD: Editable & Deletable Journeys with 2-Tier Sub-Goal Buckets & Timeframe Allocation

## 1. Feature Overview
Enhances **Journeys (Collections)** in Earned to support:
- Full Edit and Delete operations for Journeys, Sub-Goal buckets, and child items.
- High-level 2-Tier Hierarchy: **Journey** (e.g., *Reading*, *Fitness*) -> **Sub-Goal Buckets** (e.g. *Fiction*, *Self-Help*, *Economics*; or *Hike*, *Walk*, *Running*, *Sports*) -> **Items**.
- Flexible Timeframe Allocation per Sub-Goal: Assignable to a **Specific Month & Year** (e.g. *July 2026*), an **Entire Year** (e.g. *2026*), or **Ongoing / No Time Limit**.
- Timeframe filter bar on `CollectionsScreen.tsx` for filtering by `All`, `This Year (2026)`, `This Month (July)`.
- Smart Deletion Dialog: When deleting a Journey linked to a Macro Goal, prompt user whether to also delete the linked Macro Goal or retain/unlink it, maintaining historical cash balances.

## 2. Technical Architecture & Data Schema
- **Collection Store (`src/store/collectionStore.ts`)**:
  - `JourneySubGoal`:
    - `id: string`
    - `collectionId: string`
    - `title: string` (e.g., `"Fiction"`, `"Economics"`, `"Hikes"`, `"Running"`)
    - `targetMetric?: number` (e.g., 3 books, 5 hikes)
    - `year?: number` (e.g., `2026`)
    - `month?: number` (1-12)
    - `dateCreated: string`
  - `Collection`:
    - `id: string`, `title: string`, `category: CollectionCategory`, `macroGoalId?: string`, `dateCreated: string`
  - `CollectionItem`:
    - `id: string`, `collectionId: string`, `subGoalId?: string`, `title: string`, `estimatedMinutes?: number`, `completed: boolean`, `isAddedLater: boolean`, `dateCreated: string`
  - Actions: `updateCollection`, `deleteCollection`, `addSubGoal`, `updateSubGoal`, `deleteSubGoal`, `addItem`, `updateItem`, `toggleItemCompletion`, `deleteItem`.
- **Database Migration (`supabase/migrations/20260722000003_journey_subgoals.sql`)**:
  - New table `journey_sub_goals` with RLS (`collection_id`, `title`, `target_metric`, `year`, `month`).
  - Extend `collection_items` with `sub_goal_id` foreign key.
- **Sync Engine (`src/store/syncEngine.ts`)**:
  - Bidirectional sync converters for `journey_sub_goals` and updated `collection_items`.

## 3. UI Components & Micro-Interactions
- `CollectionsScreen.tsx`:
  - **Timeframe Selector Bar**: `All`, `2026 (Year)`, `July 2026 (Month)`.
  - **Journey Header Controls**: Edit & Delete buttons on each Journey card.
  - **Sub-Goal Accordion / Bucket Cards**: Visual progress bar per Sub-Goal bucket (e.g., *Fiction: 2/3 books read in July 2026*).
  - **Add/Edit Sub-Goal Modal**: Title, Year/Month selection, Target metric.
  - **Add/Edit Journey Modal**: Edit title, category, linked Macro Goal.
  - **Delete Confirmation Modal**: Options to delete Journey with choice to delete or unlink associated Macro Goal.

## 4. Task Checklist
- [x] Create database migration `supabase/migrations/20260722000003_journey_subgoals.sql`
- [x] Update state interfaces & store actions in `src/store/collectionStore.ts`
- [x] Update `src/store/syncEngine.ts` push/pull converters for `journey_sub_goals`
- [x] Implement Edit Journey Modal and Delete Journey Confirmation Modal in `CollectionsScreen.tsx`
- [x] Implement Sub-Goal Bucket CRUD (Create, Edit, Delete) in `CollectionsScreen.tsx`
- [x] Implement Timeframe Filter Bar (`All`, `Year`, `Month`) in `CollectionsScreen.tsx`
- [x] Verify typechecking with `npx tsc --noEmit`



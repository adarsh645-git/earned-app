# Software Design Description (SDD) Index

This directory contains the feature specification documents and task checklists organized by feature name for Spec-Driven Development (SDD).

## SDD Documents

- **[001-long-term-milestone-rewards.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/001-long-term-milestone-rewards.md)**: Milestone reward scaling, auto-crediting, and milestone badges for Pyramid Goals.
- **[002-focus-lock-timer.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/002-focus-lock-timer.md)**: Focus timer overlay, economic multiplier rates, and session completion rollup.
- **[003-daily-checkin-and-planning-rewards.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/003-daily-checkin-and-planning-rewards.md)**: Daily launch check-in bonus, planning task creation bounties (+1 key, max 3/day), and streak grace period shield.
- **[004-dual-currency-reward-economy.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/004-dual-currency-reward-economy.md)**: Dual-currency economy (Hours + Dollars), streak-based focus conversion, entertainment macro goals, and hard-block timer enforcement.
- **[005-journey-editing-and-timeframe-allocation.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/005-journey-editing-and-timeframe-allocation.md)**: Editable and deletable Journeys, Year/Month timeframe allocation, and sub-category tag breakdown.
- **[006-journey-dopamine-and-gamification.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/006-journey-dopamine-and-gamification.md)**: Gamified Journey creation, anticipatory bounty calculation, confetti particle celebrations, RPG quest badges, and completion payout toasts.
- **[007-journeys-tab-redesign.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/007-journeys-tab-redesign.md)**: High-density RPG quest cards, glassmorphic executive summary header stats, collapsible sub-goal accordions, and quick-add task chips.
- **[008-entertainment-reward-asymmetry-fix.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/008-entertainment-reward-asymmetry-fix.md)**: Removes Dollar payouts from entertainment macro-goal milestones (acknowledgment-only), and one-time balance clawback for previously-paid entertainment milestones.
- **[009-blame-free-economy-iou.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/009-blame-free-economy-iou.md)**: Replaces the punitive credit/interest/default system with a flat-capped, interest-free Dollar IOU and a purely positive Discipline Score.
- **[010-ui-juice-and-screen-redesigns.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/010-ui-juice-and-screen-redesigns.md)**: Dependency-free Web Audio sound layer, animated ring/pills/bars, tiered haptic+sound feedback, and flow/naming/motion redesigns of Tasks, Store, and Journeys.
- **[011-cloud-sync-data-loss-fixes.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/011-cloud-sync-data-loss-fixes.md)**: Fixes dropped macro-goal `type` field on sync, destructive pull-overwrite races that erased newly-added tags/items, and an unfiltered Pyramid list on Profile.
- **[012-macro-goal-edit-delete.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/012-macro-goal-edit-delete.md)**: Edit (title/horizon/target) and cascade-safe delete (unlinks tasks/Journeys, removes sub-goals) for macro targets, wired into both `AnimatedMacroGoalCard` and Profile's Pyramid list.
- **[013-interlinked-goal-chains.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/013-interlinked-goal-chains.md)**: Cascade foundation (Phase 1+2) for single-chain goal interlinking — persists parent_id/pays_currency/category, gates currency to one designated level, and cascades time continuously vs count-on-completion. (Chain-building UI is Phase 3.)
- **[014-interlinked-goal-chains-ui.md](file:///Users/adarshreddy/Projects/earned-app/docs/sdd/014-interlinked-goal-chains-ui.md)**: Chain-building UI (Phase 3) and cascade-legibility toasts (Phase 4) — parent selectors, the "Rewards Paid Here" single-payer toggle, a Time/Count choice at creation (previously impossible to create count goals at all), and "Contributed to: X → Y" feedback across Tasks/Timer/Journeys completion paths.




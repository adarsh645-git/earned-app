# Next Work Items

## Meta
### Rename App: "Earned" → "Krushi" [DONE — display name only]
- ✅ Display name updated: app.json, web/manifest.json, web/index.html, README.md, AGENTS.md/CLAUDE.md, ARCHITECTURE.md, supabase docs
- ⏸️ package.json name, app.json slug, iOS bundleIdentifier, Android package left as `earned-app` / `com.adarshreddy.earnedapp` — deferred (breaks TestFlight/Play store identity, needs new provisioning if ever done)
- No splash/icon asset files exist to rename (app.json has no splash key under SDK 57)

---

## High Priority

### 1. Units & Waypoint Progress System
- Add units to waypoints
- Link task completion to waypoint progress updates
- Propagate completed task units up to waypoint progress tracking
- Ensure progress visibility across hierarchy

### 2. Journey Detailed Section — UX Review
- Rethink current options/UI
- Clarify user workflows
- Define what "detailed" section should expose vs. hide

### 3. Streak & Rewards System
- Fix streak not being added/tracked
- Expand rewards system implementation
- Integrate streaks with reward triggers
- Define reward unlock/progression logic

### 4. Daily Goals — Fitness Model
- Implement Apple-style fitness rings/progress for daily goals
- Visual feedback for daily goal completion
- Ring/circular progress representation
- Integration with existing goal tracking

---

## Notes
- Items 1 & 4 likely depend on architecture decisions (units propagation may affect daily goals display)
- Item 3 may require UI changes to display streak/rewards prominently
- Consider sequencing: foundation (units/propagation) before display layer (fitness rings)
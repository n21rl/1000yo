# Mobile Redesign Specification

This document captures design decisions for the mobile redesign of the Thousand Year Old Vampire game, based on mockups from Claude Design. Decisions here are pre-implementation; once implementation begins, load-bearing engine decisions move to AGENTS.md.

## Settled Decisions

### 1. Memory Titles
- Display: **`Memory N`** by default, where N is the **creation ordinal** (frozen when the memory is created, never renumbered when other memories are forgotten)
- The player can edit the title to something custom
- Engine change needed: add `title` field to memory objects (string, optional, defaults to generated "Memory N")

### 2. Experience Prompts
- Each Experience is stamped with the prompt that produced it: **prompt index + visit letter** (e.g., `14b`)
- Shown only when opening the Experience's detail view, not in list rows
- Engine change needed: add `prompt` field to experience objects (string, e.g. "14b")

### 3. Icons
- One default icon per trait **type**, distinguishing mortal and immortal for characters
- Player-chosen custom icons (game-icons.net style) are planned as a future phase
- Resolve icons through a single lookup rather than inlining SVGs
- Engine change needed: none (icon system already exists in `src/ui/icons.js`); UI will call icon resolver with trait type

### 4. Trait Order Tracking
- Store the **order a trait was created** (not timestamp, just sequence)
- Store the **order it was checked/used** (not timestamp, just sequence)
- This is what the "Recent" sorting reads
- Engine change needed: add `createdOrder` and `usedOrder` fields to all trait types (skills, resources, characters, marks)

### 5. All Four Trait Kinds Addable During Play
- Currently only Marks have an add button wired during play
- Extend to: Skills, Resources, Characters (both mortal and immortal)
- UI change needed: add "+" buttons for each trait type in the play view

### 6. Forget-a-Memory Button
- Every memory carries its own forget action on the memory row itself
- Striking out a memory to make room is the rulebook's central tension
- Should not be buried in a menu
- UI change needed: add explicit "forget" or "strike" button on each memory card

## Pending Decisions

The following questions must be answered before implementation begins:

### Branch Strategy
- Work on `main` (active development line) or create a new `mobile` branch?
- Should the desktop card UI be preserved alongside the mobile UI, or replaced?
- If both coexist, how does the user choose which to use?

### Forgotten Memories UI
- How should forgotten memories be displayed/accessed in the play view?
- Show a "Forgotten" tab or section?
- Allow viewing the strike-out reason (mind vs diary)?

### Navigation & Routing
- How does the player navigate to the character creation wizard from the play view?
- How do they return from the wizard to an existing game?
- Should there be a menu/home screen, or direct tabs?

### Diary Complexity
- Current engine: Diary is a resource that holds up to 4 memories
- Does the mobile redesign keep this mechanic?
- Or is "Diary" simply a view of play notes (separate from the memory/resource system)?

### Menu & Ellipsis Patterns
- What goes in an app-level menu (if any)?
- What goes in per-item ellipsis menus (edit, delete, duplicate)?
- Do ellipsis menus exist, or are actions always visible?

### Undesigned Screens
- Character creation wizard: fully specified in mockups
- Play/game view: partially specified (Memories/Traits tabs shown, Diary tab not shown)
- Character setup completion screen: not in mockups
- Post-game/settled records: not in mockups
- How pixel-perfect should the undesigned parts be?

### Fonts & Typography
- Which fonts should the mobile redesign use?
- What's the relationship to the existing desktop font choices?

### "Recent" Sorting
- How should "Recent" traits be determined?
- By `usedOrder` (most recently checked), or `createdOrder`?
- Should this be a sort option in the Traits tab?

### Checked State Visual Treatment
- How are checked/used traits displayed visually?
- Strikethrough, faded, moved to a "Used" section?

### Grid vs. List View
- Traits shown as cards in a grid, or as rows in a list?
- Same for skills, resources, characters?

### Stationary Resources
- The engine has a `stationary` flag on resources (e.g., a home base you don't carry)
- Should stationary resources be visually distinct in the play view?

### Pinned Prompt Card
- Should the current prompt stay visible while scrolling through traits/memories?
- Or does it hide, replaced by a minimal header?

### Collapse/Expand Settled Records
- Once a trait is checked/used, should it collapse by default, or stay expanded?
- Should there be a "show settled" / "show unsettled" filter?

## Design Artifacts
- Mockup export from Claude Design: `/home/claude/repo/` (design handoff bundle)
- Current codebase: `/home/claude/1000yo/`
- Two long-lived UI branches: `main` (card-based), `book-style` (frozen gothic-journal redesign)

## Related Documents
- AGENTS.md: Branch strategy, data policy, mobile redesign decisions (load-bearing codebase decisions)
- src/game.js: Character class, trait data structures
- refs/rules.txt: Thousand Year Old Vampire rulebook

# Mobile Redesign Specification

Design decisions for the mobile redesign of Thousand Year Old Vampire
(Memories / Traits / Diary tabs, eight-step creation wizard), based on
mockups handed off from Claude Design. Decisions here are
pre-implementation; once implementation begins, load-bearing engine
decisions move to AGENTS.md as they become codebase facts.

Mockup source: `/home/claude/repo/project/` (`Play Screen.dc.html`,
`Play Screen v1.dc.html`, `ios-frame.jsx`).

## Terminology & Core Mechanics

- **"Roll", not "Reroll".** The mockup's refresh-arrows icon suggested
  regenerating the same prompt, which isn't a real mechanic — the game
  always does a `d10 − d6` roll to move to a different (or, on a 0, the
  same) prompt entry. Keep the existing "Roll" terminology and mechanic.
- **Prompt state.** Show "Prompt unresolved" while the current prompt
  hasn't been acted on; after resolution, show "Prompt resolved" and a
  Roll button for the next prompt.
- **Marks have no strike-out/restore.** Only Remove is a gameplay action
  for Marks (matches the rulebook — only Skills get "checked"; the
  engine's existing Check extension to Characters/Resources is a
  deliberate house rule, not extended to Marks). Edit lives in the More
  menu, not as a gameplay action.

## Data Model Changes

- **Memory titles.** Optional player-supplied title; falls back to
  `Memory N`, where N is the memory's **creation ordinal** — frozen when
  created, never renumbered when other memories are forgotten. Add
  `title` field to memory objects.
- **Experience prompt attribution.** Each Experience is stamped with the
  prompt that produced it (index + visit letter, e.g. `Prompt 1a`,
  `Prompt 7b`). Shown only in the experience's own row/detail, not
  summarized elsewhere. Add `prompt` field to experience objects.
- **Trait creation/use order.** Store the order a trait was created and
  the order it was checked/used — sequence only, no timestamps. This is
  what "Recent" sorting reads. Add `createdOrder` and `usedOrder` fields
  to skills, resources, characters, marks.
- **Icons are type-derived for now.** One default icon per trait type
  (mortal/immortal distinguished for Characters). Custom game-icon
  selection and custom picture upload are later phases. Resolve icons
  through a single lookup (extend `src/ui/icons.js`) rather than
  inlining per-item SVGs. Icon set: Google Material icons (matches the
  existing icon system already in the app — no new icon library).

## Navigation

- **Home screen.** Superseded by the Continue/Saves/New Vampire split
  below — see AGENTS.md's "Mobile UI architecture" for the current
  screens list, which is the load-bearing source now that this has
  shipped.
- **Home screen actions.** Continue (jumps to the most recently updated
  save), Saves (a dedicated list screen for loading/renaming/deleting any
  save), New Vampire. Play → Home via the header's More menu; Home → New
  vampire → wizard; Home → Play or Saves.
- **Header "More" menu** (on the Play screen): Rename vampire / Home /
  Delete save / Add Memory slot.
- **Incomplete characters cannot enter Play.** A save that hasn't cleared
  `Character#isReadyForPromptOne()` is never routable to `#/play/<id>` —
  every entry point (Continue, a Saves row, a direct play URL) that loads
  such a save is redirected into the creation wizard instead, resuming at
  the first incomplete step. The save itself is untouched in storage
  either way ("held in memory"): it just isn't playable until finished.

## Memories

- Five memory slots are **always shown**, including empty ones.
- **Forgetting a memory**: available via a More menu on each memory row
  (forget / move to Diary) *and* as an affordance inside the opened
  memory detail. Not buried in a single hidden location.
- **Lost memories**: greyed out, grouped at the bottom by default
  (grouping may become configurable later).
- **Adding an experience**: the next-available-slot affordance and the
  input box are combined into one control, with a single Save button
  (the mockup's two separate patterns — dashed "Add experience" slot vs.
  standalone "New Experience" box — collapse into one).
- **Experience row actions**: a single "More" (⋮) control containing
  Edit only. No standalone edit pencil, and no per-experience delete —
  an experience can only be removed by forgetting its containing Memory.

## Traits (Characters, Skills, Resources, Marks)

- **Memories and Traits stay separate** top-level tabs (per the mockup's
  IA), not merged into the rulebook's flat five-sibling model.
- **All four trait kinds are addable during play**: an Add button on
  each Traits sub-tab, not just Marks.
- **Sorting**: implemented for real, by creation order (this is what
  "Recent" means — see Data Model above).
- **Grid/list toggle**: not implemented yet. Show the grid button in a
  disabled/greyed state — visible in the UI, non-functional.
- **Checked state**: show a tick when a trait is checked.
- **Trait "More" menu**: Edit / Delete / Icon. These are meta actions,
  not normal gameplay actions (gameplay actions are Check and Strike
  out, shown directly on the row).
- **Stationary Resources**: same treatment as Mortal/Immortal on
  Characters — an icon plus an inline type-label tag next to the name
  (reusing the mockup's existing `item.typeLabel` pattern, not a new tag
  style).
- **Struck-out / settled section**: struck-out traits collapse into a
  dedicated "struck out" section (greyed, ~40% opacity, name
  strikethrough) with a Restore action. No other automatic collapsing
  behavior anywhere in the app except the Prompt card.
- **Tagged-trait chips** (shown against an experience): one meaning
  only. Explicit states — tick for used/tagged, a cross/dash for
  untagged or lost — no colour double-duty (the mockup's border colour
  had been doing double work for both "tagged" and "selected"; drop
  that overload).

## Diary

- Kept as the existing engine model: a Resource-backed object
  (`character.diary = {resourceId, memoryIds}`, capped at 4 memories).
- The **Diary tab** creates the Diary resource if none exists yet.
- **Resource creation** also gets a "Create Diary" button as a shortcut
  into the same flow.
- Memories can be moved into the Diary ("out of the brain") from the
  memory's More menu / detail view.
- **Losing the Diary** (the backing Resource is struck) creates a
  greyed-out **"Lost Diary"** group containing the memories that were
  stored in it — visually distinct from memories lost directly from
  mind.

## Visual System

- **Fonts**: EB Garamond (serif, body/quotes), DM Sans (UI text), DM
  Mono (labels, numerals, meta text) — replacing the current
  Roboto/system stack.
- **Icons**: Google Material icons via the existing `src/ui/icons.js`
  lookup (Material-Symbols-style paths, Google Fonts fetch + local SVG
  fallback). No new icon dependency.
- **Prompt card**: collapsible, open by default.
- **Safe areas**: use `env(safe-area-inset-*)` for top/bottom spacing,
  not the mockup's literal iOS-frame padding values (54px/28px were
  frame compensation, not real spec numbers).

## Scope & Architecture

- **Branch**: build on `main` (full replacement of the traditional
  card UI, not a new permanent branch like `book-style`).
- **Desktop**: use the mobile design as a centered column on desktop for
  now. A dedicated desktop layout is a later phase.
- **Architecture**: vanilla ES modules, no build step (matches the
  existing app; the mockup's React/DCLogic structure is prototype
  scaffolding, not a target).
- **Tests**: update `tests/ui-elements.test.js` (and others) for the
  redesigned UI rather than preserving old element IDs.
- **Redesign scope**: extend the new visual language to the *entire*
  app, including screens, modals, and dialogs that weren't in the
  original mockup (menu/home, populated diary, add/edit modals,
  lost-memories view, confirmation dialogs).

## Related Documents

- AGENTS.md — branch strategy, data policy, pointer to this file
- `src/game.js` — Character class, trait data structures
- `refs/rules.txt` — Thousand Year Old Vampire rulebook
- `/home/claude/repo/project/` — mockup source files

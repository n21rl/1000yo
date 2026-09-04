# Desktop layout variations

Three interactive mockups of a dedicated desktop layout for the app,
derived from the shipped mobile UI. They exist to answer one question:
**what does the desktop version do with the horizontal space the phone
didn't have?** Everything else is held constant.

Open any of them in a browser (directly, or through `npm run dev` at
`/design/desktop/…`). A bar at the bottom switches between the three
layouts and between Home / Saves / Creation / Play.

- `variation-a-nav-rail.html` — the mobile IA, rotated
- `variation-b-master-detail.html` — browse pane beside a fixed work surface
- `variation-c-workbench.html` — the whole play loop on screen at once
- `variation-d-split-workbench.html` — between B and C: browse left, work
  centre, traits right

## What is and isn't being tested

Held constant on purpose, so the comparison is about layout only:

- **Copy.** Every label, hint and heading is the app's existing text.
  Nothing was reworded, and no new labels were invented. The one place
  existing copy appears somewhere new is the creation step names
  (`WIZARD_STEP_LABELS`), used as the step rail/stepper and as the
  headings in B and C's character-sheet pane.
- **Type and colour.** The mockups link the real `src/styles.css`, so
  every component — rows, buttons, prompt card, wizard fields — is styled
  by the app's own rules and tokens. Each file's `<style>` block contains
  only the layout delta for that variation. Two exceptions, both in
  `mockup-shared.css`: the composer's tagged-trait chips (rendered by
  `renderPlayComposer` but never styled in `styles.css` — given the
  plainest token-based treatment so the composer reads), and a selected-
  row state for the two layouts that show a list and a detail at once,
  which mobile has no equivalent of.
- **Content.** Identical sample vampire across all four
  (`mockup-shared.js`).

Home and Saves are deliberately the same in all four: a title screen and
a flat list gain nothing from a pane structure, and varying them would
add noise to the comparison. The layout question lives in Play and
Creation.

## The layouts

### A — Nav rail

The conservative translation. The bottom tab bar rotates to a left rail;
the header spans the window; the mobile column (prompt card pinned above
a scrolling tab body) is promoted to a centred ~46rem measure with the
side borders kept. One screen at a time, exactly as on mobile — opening a
memory still replaces the memory list and swaps the hamburger for
"← Back". Creation adds a step rail listing the eight steps.

- **For:** near-zero risk. It is the current UI with the nav moved and the
  measure widened, so nothing about the mental model changes between
  phone and desktop, and the render functions need no restructuring at
  all — the tab body still holds one panel at a time.
- **Against:** it spends desktop width on empty margin rather than on the
  play loop. Writing an experience while checking the traits it used is
  still two tab switches, the same as on the phone, on a screen with room
  to show both. The rail's three items are also thin justification for
  ~11rem of permanent chrome.
- **Open point:** Creation shows position twice — in the step rail and in
  the retained "Identity / 1 / 8" header with its progress bar. Kept here
  because A's brief is "lose nothing", but one of the two should go.

### B — Master–detail

The mobile push-navigation is unwound. A narrow icon rail keeps the three
tabs, but the tabs now switch only the **browse** pane on the left. The
right pane is a fixed work surface: prompt on top, open memory and its
composer below, never replaced by navigation. Switch to Traits to check
the traits you just used and the half-written experience is still there,
beside them. Creation applies the same shape: steps, form, and a running
character sheet of everything added so far.

- **For:** it fixes the actual friction of the loop — memory detail and
  trait list can be on screen together — while keeping the three tabs and
  the whole IA intact. Conventional and immediately legible; anyone who
  has used a mail client knows it.
- **Against:** it introduces a state mobile doesn't have (a selected row,
  and an empty work surface before any memory is opened), so the play
  render path grows a genuine branch rather than a CSS change. The 25rem
  browse pane is also too narrow for the trait row's vertical action
  column — the mockup wraps Check / Strike out / More onto their own row,
  which is a real change to how a trait row reads, not just where it sits.

### C — Workbench

The three tabs dissolve. The prompt becomes a permanent left column, the
memory list sits above the open memory in the middle, and traits stand
open on the right. Nothing needs switching to reach anything the loop
uses: read prompt → pick memory → check traits → write experience. Diary
becomes the middle column's second state, since it holds memories and
nothing else. Creation echoes it: horizontal stepper, form, and the
character sheet building up beside it.

- **For:** the strongest fit to how the game is actually played. The
  prompt — the thing every action responds to — stops being a collapsible
  strip and gets a permanent home; the trait list is always in view,
  which is where the interesting choices live. The bottom nav disappears
  entirely rather than being converted into desktop chrome nobody needs.
- **Against:** the biggest departure. Three independently scrolling
  regions is denser than anything the app does today, the middle column
  has to split its height between list and detail (currently 55/45, and
  five memory slots plus lost memories plus the Add button do not
  comfortably fit the top half), and Memories/Diary as one column's
  segmented control is a real IA decision, not just a layout one. It also
  needs the most width — below roughly 1100px the three columns stop
  working and it has to fall back to something else.

### D — Split workbench

Between B and C, and the strongest of the four. Three full-height
columns: the left browses what holds memories (Memories / Diary as one
segmented control), the middle is the work surface with the prompt card
on top and the open memory and its composer beneath it, the right keeps
traits permanently open. Creation uses the same frame — steps, form,
character sheet — at the same column widths, so nothing jumps when a
character finishes creation and enters play.

- **For:** it takes C's best idea (traits always in view, no tab bar) without
  C's worst structural problem. C had to split one column's height between
  the memory list and the open memory, and five slots plus lost memories
  plus the Add button do not fit that half; giving the list its own
  full-height column removes the constraint entirely. It also puts the
  prompt directly above the composer, which is the right reading order —
  the prompt is what the experience answers — and recovers the ~21rem C
  spent on a prompt column that was mostly empty. The prompt card stays
  exactly as it ships, chevron included, and collapsing it here buys the
  composer real vertical room, which it could not do in C.
- **Against:** it is still C's IA change, not B's — the three bottom tabs
  are gone and Memories/Diary is a new segmented control, so phone and
  desktop diverge in structure and would need to be reasoned about
  separately. It needs the same width as C (~1100px floor), and the middle
  column is empty below the composer whenever the open memory is short.
- **Note on the trait column:** D's traits column is 25rem — the same
  width as B's browse pane — and the trait row works there in its shipped
  shape, actions and all. So B's wrapped action row is a choice I made,
  not a width constraint, and B's cost below should be read accordingly.

## Choosing between them

Ranked by what the decision should turn on:

1. **Does it serve the play loop?** D, then C, then B, then A. D and C
   both put everything the loop touches on screen at once; D does it
   without cramming the memory list and the open memory into one column's
   height. A is the only variation where writing an experience while
   looking at your traits is still impossible.
2. **What does it cost to build?** A is a stylesheet change plus a markup
   reshuffle. B needs a selected-memory state and an empty work surface in
   the play render path. C and D need both of those plus the Memories/Diary
   merge and a real answer for narrow windows — D is not more expensive
   than C, it is the same work arranged better.
3. **Do the phone and the desktop stay one product?** A trivially. B yes —
   same tabs, same order, same rows. C and D keep the components but change
   the IA, so the two versions would need to be reasoned about separately
   from then on.

My read: **D is the one to build.** It was worth arriving at through C:
C proved the loop wants everything visible, and then failed on
proportions, which is exactly what D fixes — its middle column stops
being a compromise between a list and a document and becomes just the
document. The remaining objection to D is the same as C's and is a
product decision rather than a layout one: it is a different IA from the
phone. If keeping one IA across both form factors matters more than the
loop, **B** is the answer instead, and it is a good one. A stays the
fallback if the desktop layout has to ship before anyone wants to touch
the play render path.

## Implementation notes

- The rule these replace is the placeholder at the bottom of
  `src/styles.css`: `@media (min-width: 640px)` centring every screen in a
  26rem column. Each mockup neutralises it at the top of its `<style>`
  block; a real implementation would replace it.
- None of the four handles narrow windows — they assume desktop. A real
  implementation keeps the current mobile layout below a breakpoint
  (~900px for A and B, ~1100px for C and D) and switches to the desktop
  frame above it.
- `mockup-shared.js` (sample content, row builders) and
  `mockup-screens.js` (wiring) are shared by all four so the only
  difference between the files is layout. They are mockup scaffolding,
  not a proposal about how the app should be structured.

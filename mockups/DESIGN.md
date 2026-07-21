# The Desk — design specification

This document describes the intended design of the play screen as explored in
`mockups/desk2.html`. It is written for a developer implementing the design in
the real app. The mockup is the visual source of truth; this document explains
the *intent* behind it — what each object is, how it behaves, and which rules of
the game it encodes — so the implementation can differ in technique while
staying faithful to the design.

Pair this file with the mockup: open `desk2.html` in a browser, resize across
the ~880px breakpoint, and interact with every object as you read.

---

## 1. The concept

The whole screen is a **desk seen from directly above**. Everything on it is a
physical object, and the game's rules are expressed through what those objects
are and how they behave — not through labels, counters, or chrome. There is no
conventional UI: no toolbars, no tabs, no modal dialogs drawn as boxes. A player
should feel they are looking down at a vampire's writing desk.

The materials carry meaning:

- The **prompt** is a loose sheet of paper.
- The **notebook** is an open book; its sections are reached with **ribbon
  bookmarks**.
- **Memories** are paper slips held in photo-corner mounts; a full slip is
  physically full, a folded slip physically hides its overflow.
- **Lost memories** are crumpled into paper wads on the desk.
- The **diary** is a second, closed book tucked under the notebook — a different
  book because its rules differ (its entries are permanent).
- The **dice** are objects tossed on the desk / on the prompt.

The aesthetic is a gothic journal: dark walnut desk, aged paper, oxblood and
muted accents, a handwriting face (Caveat) for anything hand-written and a
serif (the `--print` stack) for anything printed/label-like.

The design is **responsive with two genuinely different layouts** at a ~880px
breakpoint — not a reflow of the same layout. Desktop shows an open two-page
spread; mobile shows one page with the spine at the screen's left edge. Several
objects are placed and behave differently per breakpoint; those differences are
called out explicitly below and are intentional, not incidental.

---

## 2. The desk & materials

- **Surface**: a single continuous slab of dark walnut (not planks — a desk is
  usually one piece). In the mockup it's a procedurally generated tile
  (`mockups/gen_wood_slab.py`) embedded as a JPEG data-URI, over-laid with a
  fine grain/fiber texture so it reads as wood up close rather than flat brown.
  In production, use any comparable seamless dark-wood texture; keep a subtle
  fiber grain over it so it doesn't look like a flat fill.
- **Paper**: warm off-white with a faint grain and torn/irregular edges
  (`clip-path` polygons in the mockup). Aged, not bright white.
- **Lighting**: a soft top-down key light. Objects cast **contact shadows** that
  sit under them and do not move when the object animates (see dice). Shadows
  are what make the objects sit *on* the desk rather than float.

Critical: an object that carries its own shadow while it moves reads as
floating. Cast shadows must be separate from the moving object and must touch
the object's real silhouette (see §8, dice, and the wads).

---

## 3. The identity header

A thin strip across the very top: a back-link ("← the shelf") on the left, the
character name (hand-written) centered, and the folio number (printed, small
caps) on the right. It sits on the bare desk above everything else. Unobtrusive.

---

## 4. The prompt

The current prompt (a rules instruction the player is acting on) is a **loose
sheet of paper**. Its placement is **different per breakpoint** — this is one of
the deliberate layout differences:

### Desktop — a sheet at the top of the desk
The prompt sheet lies at the top-left of the desk, always visible. It shows a
small printed header ("Prompt 7 · first visit") and the prompt text in
handwriting. The **dice are tossed on the sheet itself** (see §8), overlapping
its lower-right, casting their shadows on the paper. There is space up here, so
the prompt simply sits open.

### Mobile — filed in the gutter, pulled to read
There is no room for a top sheet on a phone, but the open book leaves a visible
strip of the facing page at the screen's left edge (the "gutter strip", see §5).
The prompt is **filed into that strip**: the sheet fills most of the strip's
width with its **text turned 90° on its side** (reads like a page shelved
sideways, or a document filed in a folder edge-on). The stitched spine shows to
its right.

Tapping the filed sheet **pulls it up into focus**: it animates (rotating from
its filed orientation up to square) into a **centered, upright card** over a
dimmed desk, now oriented the right way to read, with the **dice on the card**.
Tapping the dimmed area (or Escape / a close affordance) files it back into the
gutter.

Rationale: this reuses otherwise-dead strip space, and the "pull it out, it
turns upright" gesture is diegetic — it's how you'd read a paper filed on its
side. Do **not** reduce this to a small tab/button; the sheet should visibly
occupy the strip.

Both breakpoints roll the same dice and show the same prompt content; only the
placement/orientation differs.

---

## 5. The notebook (open book)

The notebook is the heart of the screen: an open book with a **two-page spread**
on desktop and a **single page** on mobile. It has five **sections**, in this
fixed order:

1. Memories
2. People
3. Skills
4. Resources
5. Marks

Only one section is open at a time. Each section is its own spread/page — moving
between them is a **page turn**, not a tab switch (see §6, ribbons).

### The spine / gutter
Down the center of the book runs the **stitched spine** (a sewn seam). On
desktop it's the center gutter between the two pages. On mobile, the book sits
**flush against the left edge of the screen** so that:

- a **strip of the facing (left) page** shows at the far left, cut off by the
  screen edge (no rounded corner — it runs off-screen, implying the rest of the
  book continues beyond the viewport),
- then the **stitched spine**,
- then the visible page.

This strip is the "gutter strip" the mobile prompt is filed into (§4). Keep the
spine stitching visible; nothing should fully cover it.

### Page content per section
- **Memories** (see §7): paper slips in photo-corner mounts. On desktop, slips
  fill the left page and continue onto the right; the right page also shows any
  empty mounts (remaining capacity). On mobile, Memories keeps **two pages** (it
  has enough content to warrant a page turn).
- **People / Skills / Resources / Marks**: a roster list on the (left) page —
  each entry a hand-written line with a checkbox/state and an "+ add" line at the
  end. The facing page is mostly empty (a faint "the rest of the page waits…"
  note). On mobile these sections are **single-page** (the empty facing page is
  suppressed — no page-turn corner, no page number) because there's nothing to
  turn to. Desktop always shows both pages (a physical spread has two).

The book's outer dimensions **must not change** when switching sections or when
a memory is focused (see §7) — the book is a fixed physical object. Use fixed
page dimensions and keep a placeholder for any element that lifts out of flow.

---

## 6. Ribbons (section navigation)

Sections are navigated with **ribbon bookmarks** — cloth strips sewn into the
spine, hanging out of the book. This replaces any tab/menu metaphor. There is
one ribbon per section, each a distinct muted color, with the **section name
written down the ribbon** and a small **section icon** below the name (see
§6.3).

Physical model (important — this drove several revisions):

- A ribbon is anchored at the **spine**, not to a page, so it doesn't "belong"
  to a page that could scroll it away.
- The **current section's** ribbon runs down the gutter/spine and dangles
  **lowest** of all — it's the one you're reading.
- Ribbons for sections **before** the current one and **after** it hang out of
  the book differently depending on breakpoint (below).
- Tapping any ribbon turns the book to that section (a direction-aware page-turn
  animation: forward if the target is later, backward if earlier).

### 6.1 Desktop — spread out
There is room, so ribbons **spread** along the book's bottom edge:

- **Passed** sections (before current) hang below the **left** page, spaced out.
- **Upcoming** sections (after current) hang below the **right** page, spaced
  out.
- **Current** runs down the center gutter and dangles lowest.

The center is reserved for the current ribbon, so passed/upcoming never collide
with it.

### 6.2 Mobile — stack only where space is tight
The single mobile page has one exposed edge (the spine is at the screen edge),
so ribbons can't split left/right the way they do on desktop. Rule of thumb:
**stack ribbons only where there isn't room to spread; otherwise spread.**

- **Passed** sections hang in the cramped **gutter strip** (left of the spine).
  There isn't room to spread there, so they **stack on top of each other** —
  same spot, layered, with **staggered tail lengths** so each ribbon's name +
  icon peeks out below the one in front. The icon is what makes a mostly-hidden
  ribbon identifiable (§6.3).
- **Upcoming** sections hang **below the page**, where there is room, so they
  **spread** across the width.
- **Current** runs down the spine and dangles lowest.

### 6.3 Section icons (universal)
Every ribbon — desktop and mobile, current and not — carries a small icon under
its name. These are the **Material Symbols icons the app used before the
redesign**, so the visual language stays consistent with the rest of the
product:

| Section   | Material Symbol name       |
|-----------|----------------------------|
| Memories  | `cognition`                |
| People    | `person`                   |
| Skills    | `bolt`                     |
| Resources | `deployed_code`            |
| Marks     | `local_fire_department`    |

(The mockup inlines these as SVG paths — copied from the app's own
`src/ui/icons.js` — tinted with `currentColor` so each icon takes the ribbon's
label color. In production, use the real Material Symbols. The icon matters most
in the mobile passed-ribbon stack, where names overlap and the icon is the
disambiguator, which is why it's required on *every* ribbon rather than just the
stacked ones.)

---

## 7. Memories (slips, mounts, folding)

Memories are the richest object. Each memory is a **paper slip** held in a
**photo-corner mount** — four little corner tabs, like an old photo album.

### Fixed mount, physical fold
- The mount is a **fixed size**. A slip does not grow to fit its content.
- A memory's text can be longer than the mount. When it is, the excess is
  **folded under**: the slip presents exactly one mount-height, and a **crease
  line** runs full-width across its **bottom edge** where the paper folds under.
  Text past the fold is simply hidden (not truncated with an ellipsis — there is
  no "…"; the paper physically hides it).
- The crease is a thin fold line at the very bottom edge, spanning the full
  width of the sheet (it is the folded edge of the paper, so it reaches the
  sides; it is not inset to the text margins). Keep it clear of the photo-corner
  mounts themselves.
- An **empty mount** (a memory slot with no memory) is just the four corner tabs
  with a faint hint — remaining capacity is shown **spatially** (visible empty
  mounts), never as a counter.

### Focus (read / edit)
Tapping a slip **lifts it**: it enlarges and moves to the **center of the
screen** over a dimmed desk, fully **unfolded** so all its text is readable and
editable. The **crease marks remain visible** at the old fold boundaries even
when unfolded — a real sheet keeps its creases after you smooth it out. Tapping
the dimmed area (or Escape) drops it back into its mount, re-folded.

The lifted slip must sit **above everything** — above the dim, above the ribbons.
(Implementation note, §10: a lifted, fixed-position slip is easily trapped in the
wrong stacking/containing context; the mockup neutralizes containing-block
sources on the book subtree while a slip is lifted.)

Per-slip actions ("write here · copy into the diary · rewrite · lose it") appear
on the focused slip. A slip that is full ("no line remains") offers only the
actions that still apply.

---

## 8. Dice

A d10 and a d6, used to resolve movement through the prompts. They are **objects
on the desk**, tossed — not a widget:

- They rest at slight, fixed angles (thrown, not placed in a neat row).
- Each casts a **static contact shadow** that does **not** rotate or translate
  when the die is rolled — only the die face tumbles. During a roll the shadow
  may soften/shrink slightly (the die lifts) but never spins with it. This is the
  difference between "die on a table" and "floating cutout".
- On a roll, the faces update to the rolled values. There is **no explanatory
  result text** — the rolled faces are the feedback. (A 3D dice library is
  expected to replace these later; keep the interface — click to roll, faces
  show the result — stable.)

Placement: on desktop the dice lie on the prompt sheet (§4); on mobile they lie
on the pulled/focused prompt card.

---

## 9. Lost memories (crumpled wads) & the diary

### Crumpled wads
Memories that are lost are **crumpled into paper wads** that lie on the desk
below the book (a small heap, capped at a visual stack of ~three). The heap
shares **one contact shadow** directly beneath it — not one shadow per wad, and
the shadow must reach the wads' real bottom edge so the pile sits on the wood
(no gap of visible desk between paper and shadow). Tapping the heap smooths one
out to read it; it can be smoothed back in or re-crumpled. No caption is needed —
the pile is its own affordance.

### The diary
The diary is a **second, separate book** — different because its rules differ:
its entries are written in ink and are **permanent** (a diary memory gains no
further experiences). It is a **closed book, tucked partly under the notebook**,
peeking from the top so only its head + label ("Diary") show; tapping it swaps
it into the notebook's place (and the closed **notebook** then peeks from the
same spot, tap to swap back). It should read as a real, substantial book (at
least roughly half the notebook's size), not a token.

Its internal pages use a cooler, ruled paper with a red margin line and a
ribbon, distinct from the notebook's warm unruled paper — reinforcing that it's a
different book with permanent ink.

---

## 10. Implementation notes & gotchas

These are technique-level notes from building the mockup. The production stack
will differ, but these traps are inherent to the design and worth flagging.

- **Fixed dimensions / no reflow.** The book must not resize when switching
  sections or lifting a slip. Anything that lifts out of flow (focused slip)
  needs a same-size placeholder so the layout doesn't jump.
- **Stacking + containing blocks for the focused slip.** A centered, lifted slip
  is `position: fixed` (or equivalent) so it escapes to the viewport. Beware: any
  ancestor with a `transform`, `filter`, `perspective`, `will-change` of those,
  `contain`, or — critically — an **active/filling CSS animation on `transform`**
  becomes the slip's containing block, which both **clips** it (inside the page's
  `overflow: hidden`) and **traps it below** an overlay backdrop (so it looks
  dimmed). The page-turn animation leaves its element a filling animation target
  even after it finishes, so this bites specifically *after navigating*. The
  mockup fixes it by stripping all containing-block sources (including
  `animation`) from the book subtree while any slip is lifted. Whatever the
  production framework, verify the focused slip renders full-size and above the
  dim **after a section change**, not just on first load.
- **Ribbon layering.** Ribbons must appear to emerge from **between the pages** —
  their tops hidden under the page edge, not painted on top of the paper like
  stickers. In the mockup the ribbon container out-ranks the pages in one
  stacking context, so per-ribbon z-index can't tuck them; it's solved by
  **clipping** each hanging ribbon at the page edge instead. Use whatever
  achieves "ribbon comes out from under the page".
- **Gutter must be opaque.** The mobile gutter strip (facing-page paper +
  stitching) must be fully opaque paper — no desk wood showing through between
  the strip and the page, and the stitching drawn over paper, never over wood.
- **Contact shadows are separate objects.** Reiterating §2/§8: cast shadows are
  not part of the moving object and must touch the object's true silhouette.
- **Artifact/host CSS resets.** The mockup declares its desk background on both
  `html` and `body` with `!important` because the artifact host injects a CSS
  reset that otherwise blanks the background. Not relevant to a normal app build,
  but noted in case the mockup is viewed somewhere that strips the `html`
  background.
- **Reduced motion.** All the animations (page turn, slip lift, prompt pull, dice
  tumble) are suppressed under `prefers-reduced-motion`.

---

## 11. What the mockup is / isn't

`desk2.html` is a **static, self-contained visual mockup** — one hard-coded
character state, no persistence, no real game logic, procedurally-generated or
embedded textures. It exists to pin down the *look and interaction feel*. It is
not architected for production (everything is one file). Read it for the visual
and behavioral target; build the real thing on the app's own data and component
model, referring back to this document for intent whenever the mockup's technique
doesn't translate.

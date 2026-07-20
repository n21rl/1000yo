# Visual redesign mockups

Static, self-contained HTML mockups exploring a redesign of the play experience.
Each file opens directly in a browser (no server or build step needed) — all
fonts and images are embedded as data URIs.

## The chosen direction

**`desk.html` — "The Desk."** The whole interface is a wooden table seen from
above. Everything on it is a physical object, and the game's rules map onto
materials:

- The **prompt** is a loose parchment sheet; the **d10 and d6** are rollable
  (click them) and report the real roll.
- The **notebook** lies open below (two-page spread on desktop, single page
  with a fold-corner page turn on mobile). Memories are paper slips held by
  photo corners — an empty slot is just four empty corner mounts, and each
  slip is pre-printed with three bullet lines, one per experience, so
  remaining capacity is visible without counters.
- **Lost memories are crumpled** into paper wads that lie on the table below
  the book (capped at a visual stack of three); click the pile to smooth one
  out and read it.
- The **diary is a different book** (cooler ruled paper, red margin line,
  ribbon) that swaps into the notebook's place, opened from the hanging
  bookmark or from the Iron Box entry in Resources. Its entries are written
  in ink — permanent, matching the game rule that diary memories gain no
  further experiences.
- Per-item actions use **select-to-reveal**: click a slip or entry and
  handwritten verbs appear ("write here · copy into the diary · lose it").
  The inkpot and quill are decorative props.

## Second iteration

**`desk2.html`** revises The Desk toward physical believability:

- The notebook is five double-page **spreads** (Memories, People, Skills,
  Resources, Marks) navigated by **ribbon bookmarks**: fabric strips with
  the section name written on the tail. The open section's ribbon runs from
  the top of the spine down the gutter and dangles lowest; passed sections
  hang below the left page (mobile: from the bottom of the visible
  facing-page strip), upcoming below the right. Navigation is a
  direction-aware page turn.
- Memory slips sit in **fixed-size photo-corner mounts**: overflowing text
  folds under a visible crease; clicking lifts the slip to center, fully
  unfolded (crease marks remain), for reading and editing.
- The **diary is a smaller closed book half-tucked under the open
  notebook's lower-right corner** (was: lying beside it in full view) — only
  a corner peeks out, enough to read a hint of the cover and tap it;
  clicking swaps books, and the notebook peeks from the same spot while the
  diary is open.
- The **dice sit tossed on the prompt parchment itself** (was: a separate
  desk-props column), overlapping its right portion with their contact
  shadows falling on the paper; rolling still tumbles the dice, but the
  rolled faces are now the only feedback (the "seven less three…" roll-note
  line was removed — a 3D dice library will replace these later).
- Wood is a single continuous slab (procedurally generated, see asset
  notes) rather than table-sized planks; dice cast a static contact shadow
  (only the die tumbles on a roll) and rest at slight angles; the crumpled
  wads share one contact shadow, tuned to actually touch the sprites' real
  (alpha-measured) bottom edge, and stack as a heap; the drawn inkpot prop
  was removed (see asset notes).
- Mobile: the book sits flush against the left viewport edge — a strip of
  the facing page (cut off by the screen) shows left of the stitching, the
  current ribbon runs down the gutter, passed ribbons hang from the strip's
  bottom, and sections whose right page is filler-only render as a single
  page.

## Earlier explorations (superseded)

- `ledger.html` — parchment commonplace book with rubricated marginalia.
- `dossier.html` — cold institutional case file with index-card memories.
- `broadsheet.html` — dark memento-mori newspaper sheet.

## Asset notes

- `gen_assets.py` regenerates the procedural textures embedded in `desk.html`
  (paper grain, crumpled wads via Voronoi facet shading, crease overlays) and
  the tinted wood. It expects `assets/hardwood.jpg` next to it; that wood
  photo comes from the three.js repository
  (`examples/textures/hardwood2_diffuse.jpg`) — confirm its license or swap
  in a verified-CC0 texture before production use.
- `desk2.html`'s wood is a **generated** texture instead (numpy + PIL:
  anisotropic horizontal grain via a domain-warped sine field, low-frequency
  luminance blotches, one faint knot, JPEG q55, ~18KB) — it replaces an
  earlier three.js-sourced photo and sidesteps that photo's license caveat
  entirely. Regenerate with the noise script kept alongside this file if the
  palette (`--wood-2` etc.) ever changes.
- The handwriting face is Caveat (SIL Open Font License), subsetted to
  latin and embedded as a data URI.
- `desk2.html` (realism pass): the decorative inkpot+quill `.prop` SVG was
  removed rather than replaced with a photo. The plan was to source a
  PD/CC0 inkwell image from Wikimedia Commons (`commons.wikimedia.org`
  search API + `Special:FilePath`/`imageinfo thumburl`), but every image
  host tried (commons.wikimedia.org, upload.wikimedia.org, en.wikipedia.org,
  openclipart.org, pixabay.com, publicdomainvectors.org, archive.org,
  freesvg.org, svgrepo.com, pexels.com, unsplash.com) returned a 403
  "policy denial" from the sandbox's egress proxy — general internet access
  is not permitted in that environment, only an allowlisted set of hosts
  (npm, PyPI, GitHub, anthropic.com, etc.). No image could be fetched, so
  per the task's own fallback the prop was deleted outright: an absent prop
  beats a fake-looking drawn one. Revisit if run somewhere with open egress.

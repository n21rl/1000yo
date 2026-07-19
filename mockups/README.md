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
  Resources, Marks). Index tabs sit in fixed slots down the fore-edge and
  physically migrate: a section behind the open page shows its tab on the
  left edge, sections ahead on the right; navigation is a direction-aware
  page turn.
- The **diary is a closed book lying on the desk** (was: a hanging
  bookmark); clicking it swaps books, and the notebook lies closed in its
  place while the diary is open.
- Wood is scaled to table-sized planks; dice cast a static contact shadow
  (only the die tumbles on a roll) and rest at slight angles; the crumpled
  wads share one contact shadow and stack as a heap; the drawn inkpot prop
  was removed (see asset notes).
- Mobile: a sliver of the facing page shows left of the stitching, and the
  tabs become compact fixed-slot tabs on the page's right edge (passed
  sections dim and press in).

## Earlier explorations (superseded)

- `ledger.html` — parchment commonplace book with rubricated marginalia.
- `dossier.html` — cold institutional case file with index-card memories.
- `broadsheet.html` — dark memento-mori newspaper sheet.

## Asset notes

- `gen_assets.py` regenerates the procedural textures embedded in `desk.html`
  (paper grain, crumpled wads via Voronoi facet shading, crease overlays) and
  the tinted wood. It expects `assets/hardwood.jpg` next to it; the mockup's
  wood photo comes from the three.js repository
  (`examples/textures/hardwood2_diffuse.jpg`) — confirm its license or swap
  in a verified-CC0 texture before production use.
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

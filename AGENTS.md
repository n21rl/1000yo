# Branch strategy

This repo carries two long-lived UI lines for the same underlying game
engine (`src/features/`, state/prompt/trait/memory logic):

- **`main`** — the traditional, card-based UI. This is the active
  development line; new features and fixes land here by default.
- **`book-style`** — the gothic-journal/desk redesign (ribbons, sliding
  book spread, peek-and-pull prompt sheet). Frozen at the point `main`
  was reverted back to the traditional UI. Kept as a permanent branch,
  not a tag, so it stays checkable and buildable on its own.

`main` was reset to its state as of commit `6c42b78` (the last commit
before the book-style redesign began) rather than rebuilt from scratch,
because that traditional UI already existed in history — no reason to
redesign it. `book-style` preserves everything from PRs #31–#33
(the gothic-journal reskin, the "desk2" book/ribbon rework, and "The
Desk" mobile layout) exactly as merged.

## Working with Claude Code on mobile/web

Git has no concept of "nested" branches — every branch is just a pointer
to a commit, and a new branch is identical regardless of what it was cut
from. So a Claude Code session started against either `main` or
`book-style` will create its own short-lived working branch off of
whichever one you opened the session from, do its work, and open a PR
back.

Two things to check on every such PR before merging:

1. **The PR base branch.** Claude Code sessions may default a PR's base
   to the repo's default branch. If you started a session from
   `book-style` to work on book-style-specific UI, confirm the resulting
   PR's base is `book-style`, not `main` — otherwise book-style work can
   land on the traditional line by accident.
2. **Which line the fix belongs on.** Bugfixes to the shared engine
   (state, prompts, traits, memory records) should generally be ported to
   *both* lines (cherry-pick or a second PR), since both UIs sit on the
   same underlying logic. UI-only changes (markup, `styles.css`,
   `desk.js`, ribbon/spread interaction) belong on one line only.

Don't try to keep the two lines merged into each other on an ongoing
basis — they diverge in `index.html`, `src/main.js`, `src/styles.css`,
and interaction code by design. Treat them as two UIs sharing one engine,
not one UI with a theme switch.

# Data policy

Saved data is disposable at this stage. The `1000yo.vampires` record in
`localStorage` has no real players behind it yet, so schema changes do
**not** need migrations, version fields, or back-compat shims — it is
fine for a change to invalidate or discard existing saves. Prefer the
clean model over the compatible one, and don't spend effort reading old
shapes. Revisit this once there are players whose games matter.

# Mobile redesign decisions

Decisions settled for the mobile/bottom-tab redesign handed off from
Claude Design (Memories / Traits / Diary tabs, eight-step creation
wizard). Recorded here because several of them change the engine rather
than just the markup, so they bear on both UI lines.

- **Memories get a title.** `Memory N` by default, N being the memory's
  position in order; the player can write their own. The engine had no
  name field at all before this — memories were labelled positionally at
  render time.
- **Experiences record their prompt.** Each Experience is stamped with
  the prompt that produced it (index plus visit letter, e.g. `14b`).
  Shown only when opening that Experience's detail, not in list rows.
- **Icons are type-derived for now.** One default icon per trait kind,
  with mortal and immortal distinguished. Player-chosen custom icons
  (game-icons.net style) are planned, so resolve icons through a single
  lookup rather than inlining an SVG per item.
- **Traits record creation and use order.** Store the order a trait was
  created in and the order it was checked in — sequence only, no
  timestamps. This is what "Recent" sorting reads.
- **All four trait kinds are addable during play**, not just Marks.
  Prompts routinely instruct the player to create a Character, Skill or
  Resource mid-game.
- **Every memory carries its own forget action.** Striking out a memory
  to make room is the rulebook's central tension, so it belongs on the
  memory itself rather than buried in a menu.

# Branch strategy

This repo carries two long-lived UI lines for the same underlying game
engine (`src/features/`, state/prompt/trait/memory logic):

- **`main`** — the mobile-first bottom-tab UI (Memories / Traits / Diary,
  eight-step creation wizard), replacing the earlier traditional
  card-based desktop UI. This is the active development line; new
  features and fixes land here by default. See "Mobile UI architecture"
  below for how it's built.
- **`book-style`** — the gothic-journal/desk redesign (ribbons, sliding
  book spread, peek-and-pull prompt sheet). Frozen from an earlier point
  in `main`'s history. Kept as a permanent branch, not a tag, so it stays
  checkable and buildable on its own.

`book-style` preserves everything from PRs #31–#33 (the gothic-journal
reskin, the "desk2" book/ribbon rework, and "The Desk" mobile layout)
exactly as merged, and predates the mobile bottom-tab redesign on `main`
— the two lines diverged before this redesign began.

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

# Mobile UI architecture

`main` implements the mobile bottom-tab redesign specified in
`design/MOBILE_REDESIGN_SPEC.md`. That file records the design rationale;
this section records the load-bearing facts the implementation settled on.

- **Screens**: `#menu-screen` (Home — Continue / Saves / New Vampire),
  `#saves-screen` (Saves — every stored vampire, load/rename/delete),
  `#creation-screen` (8-step wizard, unchanged step order/gating logic
  from before the redesign — only the visual language changed),
  `#play-screen` (bottom-tab shell: header, collapsible prompt card,
  Memories/Traits/Diary tabs, bottom nav). All four are full-bleed on
  mobile; a centered column with side borders applies above 640px
  (`@media (min-width: 640px)` in `styles.css`) as a placeholder desktop
  treatment, not a dedicated desktop redesign. Routes: `#/menu`,
  `#/saves`, `#/create`, `#/play/<id>` (`src/router.js`,
  `src/navigation.js`).
- **Home screen**: Continue only targets a vampire that has finished
  character creation (`isComplete`, via `getLatestCompleteVampire` in
  `vampire-storage.js`) — it jumps to the newest `updatedAt` among those.
  A save still mid-creation is never a Continue target — resume it via
  Saves or the New Vampire continue-vs-fresh prompt instead. Saves lists
  every stored vampire (including the always-present
  preset Test Vampire, non-renameable/non-deletable) with a per-row More
  menu for rename/delete, reusing the existing action-sheet + prompt/
  confirm-dialog pattern from the Play screen's More menu — not a new
  dialog system. New Vampire checks for an in-progress save
  (`getLatestIncompleteVampire`, excluding the preset) and asks
  Continue-vs-fresh before creating a new blank character; the old
  unfinished save is left in Saves either way, never auto-deleted.
- **Completion gate**: `startPlay()` (`src/main.js`) is the single choke
  point — it checks `character.isReadyForPromptOne()` itself and routes
  to creation (resuming at the first incomplete step) instead of Play
  when unmet. Every entry point that opens a stored vampire (Continue,
  a Saves row, the direct `#/play/<id>` route) must call `startPlay()`
  and let it decide; nothing upstream may skip that check to force entry
  into Play. A save's completeness never affects whether it's kept in
  storage — only whether it's playable.
- **Design tokens**: `--color-*`/`--font-*`/`--radius`/`--safe-*` custom
  properties in `styles.css`'s `:root`. New UI should read these, not
  hardcode hex/font values — the pre-redesign palette (`#f6eddc`,
  `#725145`, etc.) only survives in a few reused shared-modal fallbacks.
- **Icons**: `src/ui/icons.js` exports `createMaterialFallbackIcon`
  (inline SVG, `stroke=currentColor`) — use this for anything in the
  redesigned UI, not `createMaterialIcon` (CDN `<img>` + a hardcoded
  recolor filter that can't express per-element token colors).
  `hydrateStaticIcons`/`createMaterialIcon` still exist for the one
  remaining static `data-material-icon` spot (the prompt card's chevron).
- **Dialogs**: `src/ui/dialog.js` — `openConfirmDialog`, `openPromptDialog`,
  `openActionSheet`, `openAlertDialog`. Every `window.confirm`/`prompt`/
  `alert` in the play/menu UI goes through these instead.
- **Engine fields added for the redesign** (`src/game.js`): memory
  `title`/`createdOrder` (creation ordinal, frozen at creation — memory
  labels must never be derived from array position, since hard-delete is
  a real, reachable action); experience `prompt` (stamp like `"14b"`,
  set via `Character#addMemory`'s 4th argument); trait `createdOrder`/
  `usedOrder` on skills/resources/characters/marks (`usedOrder` stamps
  only on the false→true check transition). `Character#renameMemory` is
  new. A prompt counts as "resolved" (gates the Roll button) once a
  stamped experience exists for the current prompt+visit —
  `isPromptResolved`/`formatPromptStamp` in `src/features/prompt-flow.js`.
- **Play screen module split**: `src/main.js` still owns state and
  wiring (same pattern as menu/creation), but the play-screen render
  functions are organized by tab (memories/traits/diary rendering
  helpers, `renderPlayHeader`, `renderBottomTabs`) rather than as one
  flat card grid. `src/features/play/events.js` binds every static
  control once; per-row interactions (row clicks, More menus, Check/
  Strike-out) are bound fresh on each render, matching the existing
  `renderRecords`/`renderMenu` pattern.
- **No per-record auto-collapse.** The old `collapsedRecords` system is
  gone. Struck-out traits and lost memories live in a permanent,
  always-expanded section instead of collapsing in place. The prompt
  card is the only surface that still collapses (`collapsedCards`).

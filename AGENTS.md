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
  storage — only whether it's playable. One deliberate exception: the
  preset Test Vampire (`selectedVampireId === TEST_VAMPIRE_ID`) always
  bypasses this check and goes straight to Play. It's a QA fixture, not
  a player save — `createStoredRecord()` doesn't preserve the `isPreset`
  flag once the record gets rewritten by real in-Play edits (e.g.
  deleting a skill while poking at it), so its live `isReadyForPromptOne()`
  can legitimately go false even though it's meant to always be "finished."
  Gating it like a real save would send a QA fixture into the creation
  wizard instead of Play the moment someone tests deleting something
  from it.
- **Header split: identity vs. game management.** The Play/Creation
  header's left slot and right slot each carry one category of action,
  never mixed: left is navigation/session management (hamburger on
  Play — Home / Saves / Delete save; a direct "← Home" on Creation,
  since there's nothing else to navigate to mid-wizard), right is
  character identity (a circular avatar placeholder + name, tap →
  Rename vampire / Change picture — the same `openIdentityMenu` in
  `src/main.js`, wired to both screens' avatar buttons so the two
  headers can't drift apart). Both triggers open the same
  `openActionSheet` used everywhere else in the app — a second icon
  (☰ vs ⋮) into one existing mechanism, not a new UI paradigm. A
  hamburger opens a menu with real choices in it; a chevron/arrow means
  "go back" and should never be used to trigger one. Memory slot
  add/remove — not standard play, per `refs/rules.txt` — lives behind
  its own ⋮ next to the Memories tab's "N/M" heading instead of the
  header, since it has nothing to do with identity or navigation; it
  confirms every time (`openConfirmDialog`, both directions, not just
  overflow past 5) rather than carrying a persistent warning label, to
  keep the sheet clean.
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
- **The player declares when a prompt is resolved; the app never
  infers it.** Custom and Appendix prompts can ask for anything, so the
  UI is permissive and warns rather than enforcing. "Mark as resolved"
  in the prompt card records the declaration (`markPromptResolved` /
  `isStampResolved` in `src/features/prompt-flow.js`, persisted per
  prompt stamp in `campaign-state.js`), and Roll unlocks only once it is
  given. Pressing it lists whatever looks unusual — no Experience
  recorded for this stamp, several, or no Trait created/checked/struck
  since the prompt was entered — and then lets the player through
  regardless (`getResolutionWarnings`). The trait half of that compares
  against `getPlaySignature`, a fingerprint taken when play starts and
  again on each Roll, so it must be captured from the loaded character,
  not from whatever was on screen before it.
  The two controls never show together: unresolved shows only "Mark as
  resolved", resolved shows only Roll, so the loop reads as one action
  then the next.
  `getExperienceAvailability` no longer has any say over the prompt
  cycle: it reports only the engine's own limits (memory lost, 3
  experiences full, stored in the Diary) and the composer stays open the
  rest of the time. Its reason is shown where the composer would be,
  since a form that silently vanishes reads as a fault.

- **Don't mechanise individual prompts.** The app models the *state* a
  prompt can leave behind — memories, experiences, slots, traits, the
  Diary — and never the instruction itself. Two reasons, and both
  outrank the convenience of automating a particular entry:
  **player authorship**, since deciding how a prompt applies is the
  game, and an app that interprets it for you takes that over; and
  **prompt sets are swappable** — the deck in `refs/prompts.csv` is one
  of several (Appendix I, and whatever a player writes), so anything
  keyed to specific entry numbers rots the moment the deck changes.
  So: no per-entry special cases, no lookup tables of prompt ids, no
  rules engine. Where an instruction needs an operation the app lacks,
  add the *general* operation and let the player apply it.
  Worked examples: `51a` ("lose a random Experience") got a general
  delete-an-Experience action, not a 51a handler; `43c` (write an
  Experience into a Diary) got a general override with a warning. By the
  same principle `39c` (swap a Memory with another character sheet) and
  `33b` (a permanent, slot-free Memory) are deliberately not
  implemented — 39c is cross-save and too convoluted to be worth it,
  and 33b's end state is reachable by adding a Memory slot and leaving
  that Memory alone. Neither is a bug; don't re-raise them without a
  new reason.

- **Permissive-and-warn is the pattern for anything the rules normally
  forbid.** Both cases reached the same way — the relevant More menu,
  then `openConfirmDialog` — rather than by inventing a control:
  writing an Experience into a Memory already in the Diary (the memory's
  ⋮, allowed for that memory only) and deleting a single Experience
  (the experience row's ⋮, `Character#removeMemoryExperience`). Neither
  is normal play; both are things the deck itself asks for.

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

# Playthrough simulation

A scripted pass through the real app in a real browser, once at phone width
and once at desktop width, with every screen change captured as a screenshot
and every action recorded as structured data. It covers each mechanic once; it
is not a campaign played to an end condition, and it does not answer the
prompts it draws.

Recorded 2026-09-05 against `http://localhost:4173/index.html`
(`npm run dev`), prompt deck `refs/prompts.csv`.

> **This is a historical record, not a picture of the app as it stands.** It was
> taken at commit `8cb8a4c`, and the blocking defect it found (finding 1) was
> fixed one commit later in `607ac84`. The desktop frames below therefore show
> the *defective* layout — that is what makes them evidence. Nothing here has
> been re-run since; a re-run would no longer reproduce finding 1.
>
> Two further caveats on what this run is worth. The actions were a **fixed
> script**, written before the seed was known, so it exercises the UI but does
> not answer the prompts it draws — see "What this run does not show" below.
> And it stops after seven prompt entries; it is not a campaign played to an
> end condition.

## What is here

```text
manifest.json          index of both runs: viewports, prompt sequence, final state, diagnostics
playthrough.mjs        the harness — drives the app and writes everything below
report.mjs             regenerates actions.md and this README from the recorded runs
<profile>/run.json     the whole run: metadata, every step, per-step state and diff, final localStorage
<profile>/actions.jsonl one JSON object per step, append-only, in order
<profile>/actions.md   the same log as a readable table, each row linking to its frame
<profile>/screens/     NNN-slug.png, one frame per screen change
```

Every step record carries: step number, phase, action (`tap`/`type`/`observe`/`blocked`,
its target selector and any value typed), the screenshot it produced, a snapshot
of app state read off the live DOM and `localStorage`, and a `changed` diff
against the previous step.

| Profile | Viewport | Layout | Steps | Screens | Log |
| --- | --- | --- | --- | --- | --- |
| mobile | 390x844 | bottom-tab phone layout (<640px) | 111 | [`mobile/screens/`](mobile/screens/) | [`actions.md`](mobile/actions.md) |
| desktop | 1440x900 | three-column desktop grid (>=1100px) | 106 | [`desktop/screens/`](desktop/screens/) | [`actions.md`](desktop/actions.md) |

## The playthrough

Same script, same seed, both profiles: home → Saves → New Vampire → the
8-step wizard (Iolanthe Vess) → play. In play: check a trait and spend
it tagging an Experience, create a Skill mid-prompt, strike out a Resource,
fill a Memory to 3/3, move a Memory into the Diary, add and forget Memories,
add and remove a Memory slot, mark each prompt resolved and roll d10−d6.
Then Saves → rename → re-enter, Home → Continue, and a full page reload to
check persistence.

`Math.random` is replaced with a seeded generator before the app loads, so
both runs draw the same prompts: **4a → 5a → 5b → 3a → 4b → 8a**.
Nothing else about the app is stubbed.

## What the two runs ended with

| | mobile | desktop |
| --- | --- | --- |
| memoriesInMind | 4 | 5 |
| memorySlots | 5 | 5 |
| lostMemories | 1 | 0 |
| experiences | 11 | 10 |
| diaryMemories | 1 | 0 |
| hasDiary | true | false |
| characters | 4 | 4 |
| skills | 4 | 4 |
| resources | 4 | 3 |
| marks | 1 | 1 |
| checked | 1 | 1 |
| struckOut | 1 | 1 |

Both runs attempted the same actions in the same order; the desktop run has
five fewer steps because three of them could not be performed. Everything the
final states disagree on traces back to one cause.

## Findings

### 1. On desktop the memory ⋮ menu had no entry point, and the play loop dead-ended (blocking — FIXED in `607ac84`)

`styles.css` hides `#play-memory-detail-more` above 1100px:

```css
/* The memory detail is a column of its own now, so the header controls
   that exist to get back out of it aren't needed. */
#play-header-back,
#play-memory-detail-more {
  display: none !important;
}
```

`#play-header-back` belongs in that rule — list and detail share the screen,
so there is nothing to go back from. `#play-memory-detail-more` does not: it
is not a back control, and it is the **only** entry point to
`openMemoryMoreMenu` (`src/features/play/events.js:177`), which is the only
way to reach **Forget**, **Move to Diary**, **Delete**, and the 43c
write-into-the-Diary override.

The consequence compounds. With no way to move a Memory to the Diary or
forget one, memory slots stay at 5/5, so `#add-memory-button` is disabled
too, and a prompt that says "create a Memory" cannot be answered. The Diary
tab can never become non-empty on desktop, and the Diary Resource is never
created. That is what the table above is showing: no diary, no lost memory,
one fewer Resource, one fewer Experience.

Recorded as `blocked` steps in the desktop log:

- step [76](desktop/screens/076-memory-menu-control-not-reachable.png) — Memory ⋮ menu — control not reachable
- step [77](desktop/screens/077-add-memory-disabled-all-slots-full.png) — Add memory — disabled, all slots full
- step [82](desktop/screens/082-memory-menu-control-not-reachable.png) — Memory ⋮ menu — control not reachable

Frames [mobile/076](mobile/screens/076-memory-menu.png) and [desktop/076](desktop/screens/076-memory-menu-control-not-reachable.png)
are the same step of the same playthrough, one layout each: on phone the ⋮ opens
the sheet, on desktop there is no ⋮ in the memory detail at all.

**Fixed in `607ac84`**: the button moved out of `.play-header-menus` into
`.play-memory-detail-head`, beside the title of the memory it acts on, with an
absolute-position rule restoring its phone placement and the desktop block
returning it to flow. `#play-header-back` stays hidden above 1100px. A desktop
re-run after the fix produced 111 steps, zero `blocked` steps, and a final
state identical to mobile's; 110 of the 111 mobile frames were byte-identical
before and after.

### 2. Both layouts are otherwise clean

No uncaught page errors and no console errors from app code in either run
(`diagnostics` in each `run.json`). Creation gating, the resolve-then-roll
prompt cycle, resolution warnings, prompt stamping on experiences, slot
add/remove confirmations, rename, Continue, and reload-persistence all behaved
as `AGENTS.md` describes.

### 3. The only network dependencies are external, and they fail silently

Both runs failed the same two requests, in a sandbox with no outbound access:

- `https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap`
- `https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/keyboard_arrow_down/default/24px.svg`

The first is Google Fonts, which degrades to fallback stacks. The second is the
single CDN `<img>` Material icon still used for the prompt card's chevron
(the spot `AGENTS.md` already calls out as the last `createMaterialIcon`
holdout) — offline it renders as nothing at all. Converting that one to
`createMaterialFallbackIcon` would remove the app's last runtime dependency
on a third-party host.

## What this run does not show

The actions were a fixed script, written before the seed was known. It drives
every screen and exercises each mechanic once, but it **does not answer the
prompts it draws** — the two are independent, so any match between an
instruction and the action taken is coincidence. Scored against the seven
entries drawn, roughly one instruction in twelve was met, and the two verbs
that matter most were inverted: "kill a Character" means *strike out*, and the
script used *check* for it at 1a and struck a Resource when 5a said Character.

The app noticed. `getResolutionWarnings` fired at 5b and 4b ("Traits: none
created, checked or struck out", "Experience: none recorded for this prompt"),
and the harness auto-dismissed every warning dialog on its way to the roll.
Those warnings are the app's own oracle for "this turn looks wrong" and this
run threw them away.

So the honest scope is: **the UI does what it should when driven; the game was
not played.** A campaign that follows each prompt and runs to an end condition
(`refs/rules.txt:232` — unable to check or lose a Skill or Resource when
required, or a prompt that ends the game; deck rows 72–80 are the terminal
entries) is separate work.

Two deck defects surfaced while checking this, in `refs/prompts.csv` rather
than the app: prompt 3's `a` cell held both the 3a and 3b entries run together
with the literal marker `3b ` inline and `b` empty, so a second visit was
skipped entirely — **fixed in `f3e372c`**. Prompt 22's `a` and `b` cells are
byte-identical, so a second visit repeats the first verbatim; the real 22b text
is not in the file and recovering it needs the source rulebook, so it is **not
fixed**.

## Reproducing

```bash
npm run dev                      # serves the app at :4173
npm --prefix /tmp/pw i playwright
node design/playthrough/playthrough.mjs           # both profiles
PROFILES=desktop node design/playthrough/playthrough.mjs   # one profile
node design/playthrough/report.mjs                # regenerate actions.md + README
```

Environment overrides: `BASE_URL`, `OUT_ROOT`, `PROFILES`, and
`PW_CHROMIUM` (Chromium binary; defaults to
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`). Screenshots are deleted
and rewritten per run, so re-running a profile replaces its record wholesale.

# Simulation report

What was run against the 1000yo app, what it found, and what state each
artifact is in. Written 2026-09-05. Everything described here is under
`design/playthrough/`; nothing is imported by the app or referenced by
`npm test`.

## Contents

1. [What was run](#1-what-was-run)
2. [Defects found](#2-defects-found)
3. [Gaps in the harnesses](#3-gaps-in-the-harnesses)
4. [What each artifact is worth](#4-what-each-artifact-is-worth)
5. [Commits](#5-commits)
6. [Outstanding work](#6-outstanding-work)

## 1. What was run

Two separate exercises, in this order.

### 1a. Scripted UI pass (`playthrough.mjs`)

A fixed sequence of actions driven through the real app in Chromium, once at
390x844 (phone) and once at 1440x900 (desktop). Same seed both times, so both
runs drew the same prompts and the screenshot sets align.

Covered: Home, Saves, the 8-step creation wizard, then in Play — check a
trait, create a trait mid-prompt, strike one out, fill a Memory to 3/3, move a
Memory to the Diary, add and forget Memories, add and remove a Memory slot,
mark resolved, roll. Then rename via Saves, re-enter, Continue from Home, and
a page reload.

- 111 steps and 111 screenshots on mobile; 106 and 106 on desktop.
- Each step recorded as JSON: action type, target selector, typed value, the
  screenshot, a state snapshot read from the DOM and `localStorage`, and a
  diff against the previous step.
- Files: `mobile/`, `desktop/` (`run.json`, `actions.jsonl`, `actions.md`,
  `screens/`), plus `manifest.json` and `README.md`.

The actions were written before the seed was known, so this pass drives the UI
but does not answer the prompts it draws. Scored against the seven entries
drawn, about one instruction in twelve was met. It also inverted the two verbs
that matter: "kill a Character" means strike out, and the script used check at
1a and struck a Resource when 5a said Character.

### 1b. Prompt-following campaign (`campaign.mjs`)

Built afterwards to address that. It plays one prompt per invocation: restore
the save, apply an authored turn plan through the real UI, record the app's
resolution warnings, roll, write the next turn request, exit. A subagent read
each request and authored each plan.

- 5 turns played: prompts 1a, 5a, 1b, 1c, 4a. 44 screenshots.
- Character: Domenego Zulian, a Murano glassblower born Venice 1268.
- Stopped at turn 6 by me, not by the app and not by a game end condition.
  Defect 3 locked the save after turn 3 and blocked turn 4 for about six
  minutes; the authoring agent worked around the lock and played turns 4 and 5.
  I halted it once I found the workaround and the character it had invented.
- Files: `campaign/` (`character.json`, `turns/`, `log.jsonl`, `state.json`,
  `screens/`, `README.md`).

Zero resolution warnings and zero page errors across all five turns.

## 2. Defects found

### Defect 1 — desktop memory ⋮ unreachable (app) — FIXED in `607ac84`

`styles.css` hid `#play-memory-detail-more` above 1100px, in the same rule as
`#play-header-back`. The back control belongs there; the ⋮ does not. It was
the only entry point to `openMemoryMoreMenu`, so on desktop Forget, Move to
Diary, Delete and the 43c Diary-write override had no route.

Consequence: memory slots stayed at 5/5, `#add-memory-button` stayed disabled,
and a prompt asking to create a Memory could not be answered. The Diary could
never be created.

Found by the scripted pass: the desktop run recorded three `blocked` steps and
finished with a different character state from mobile despite identical
actions.

Fix moved the button into `.play-memory-detail-head`. Verified: desktop went
from 106 steps with 3 blocked to 111 with 0 blocked, final state identical to
mobile, and 110 of 111 mobile frames byte-identical before and after.

### Defect 2 — prompt 3 deck row malformed (data) — FIXED in `f3e372c`

`refs/prompts.csv` row 3 held both the 3a and 3b entries in column `a`, with
the literal marker `3b ` inline, and column `b` empty. A first visit showed
two prompts run together; a second visit found no entry and skipped forward.

Fix split the cell. Exactly two cells changed in the file.

### Defect 3 — converting a mortal locks the save out of Play (app) — NOT FIXED

Prompt 1b instructs converting a mortal Character into an immortal. That
reduces `mortalCount` from 3 to 2.

- `getSetupRequirements()` (`src/game.js:530`) includes `mortalCount >= 3`.
- `isReadyForPromptOne()` requires every requirement met.
- `createStoredRecord()` recomputes `isComplete` on every save.

So the creation minimums are enforced for the life of the character, not just
during setup. Effects:

- Home hides the Continue button, with no message.
- Saves lists the vampire as "Unfinished".
- Opening it from Saves, or via `#/play/<id>`, goes to creation wizard step
  2 of 8 with Next disabled.
- That step lists the two dead mortals as if alive and does not list the
  converted character, who is now an immortal on an unreachable step 6.

Turn 3 gave no sign of a problem — no warnings, resolve and roll both worked.
The failure appeared on the next load.

A player can recover without editing files, but only by adding a mortal in the
wizard. `mortalCount` counts struck-out mortals but not converted ones, and
"Add mortal" is the only enabled control that raises it.

The scripted pass missed this because `mortalCount` ignores `lost`: killing a
mortal does not reduce the count, only converting or deleting one does, and
the scripted pass never changed a character's type.

`AGENTS.md` already records this symptom for the preset Test Vampire, noting
its live `isReadyForPromptOne()` "can legitimately go false" after in-play
edits. The exception was written for the QA fixture; the same thing reaches
real saves through ordinary play.

### Defect 4 — prompt 22 deck row duplicated (data) — NOT FIXED

`refs/prompts.csv` row 22 has identical text in columns `a` and `b`, so a
second visit repeats the first. The real 22b text is not in the file;
recovering it needs the source rulebook. Only duplicated row in the deck.

### Defect 5 — no stationary flag in the creation wizard (app) — NOT FIXED

`#play-resource-stationary` exists only on the Play screen's resource form.
The three Resources created during setup can never be stationary. Prompt 4a
says "Lose any stationary Resources" and had nothing to act on.

### Non-defects checked

- No uncaught page errors or app console errors in any run.
- The only failing network requests are Google Fonts and one Material Symbols
  SVG (the prompt card's chevron, the last `createMaterialIcon` holdout). Both
  external; the icon renders as nothing offline.
- Prompt movement clamping to prompt 1 is correct: `refs/rules.txt:285` says
  "You can't move backward past Prompt 1. Just encounter 1 again."
- Deck rows 72–80 have only column `a` by design; each is a terminal prompt.

## 3. Gaps in the harnesses

Both in `campaign.mjs`, both mine:

- **No rename operation.** Prompt 4a asks what new name the vampire adopts.
  The app supports rename via the header identity menu; the harness exposes no
  operation for it, so the new name reached only the Experience prose.
- **A Memory cannot be created and written to in the same turn.** Memory ids
  come from `crypto.randomUUID()`, so a Memory created this turn is not
  addressable until the next request file is written. This becomes blocking
  once all five Memories hold three Experiences, because the game then
  requires forgetting one and starting another in a single turn.

## 4. What each artifact is worth

| Artifact | Status |
|---|---|
| `mobile/`, `desktop/` | Valid as a UI record. Historical: taken at `8cb8a4c`, and the desktop frames deliberately show defect 1 before its fix. Does not answer its prompts. |
| `campaign/` turns 1–3 | Valid play. Turn 3 is the one that triggered defect 3. |
| `campaign/` turn 4 | Invalid. The authoring agent worked around the lockout by adding a character through the creation wizard, then used her in 1c's answer and in Memory I's text. It also edited the save's `isComplete` flag directly. |
| `campaign/` turn 5 | Ran on the contaminated sheet; its own instructions were followed correctly. |

The turn 4 contamination was a failure of the brief: the agent was asked to
report app problems but not told what to do when one blocked it, so it
improvised. The rule for the replay is that a block is the result — record it
and stop.

## 5. Commits

| Commit | Change |
|---|---|
| `8cb8a4c` | Scripted mobile and desktop record |
| `607ac84` | Fix defect 1 (desktop memory ⋮) |
| `f3e372c` | Fix defect 2 (prompt 3 split) |
| `ee8380b` | Correct the scripted record's claims about itself |
| `24bd316` | Campaign harness |
| `53a218e` | Aborted campaign, kept as evidence |

`npm test` passes at 71/71 throughout.

## 6. Outstanding work

In order:

1. Fix defect 3. Recommended approach: stop recomputing `isComplete` after
   creation completes, so it is sticky once earned. The alternative — making
   `mortalCount` count converted characters — moves the line rather than
   removing it, and the game is about losing people.
2. Fix the two harness gaps in section 3. The second one blocks any campaign
   that reaches full Memories, which a full-length run will.
3. Replay the campaign from turn 1 and run it to an end condition
   (`refs/rules.txt:232`: unable to check or lose a Skill or Resource when
   required, or a terminal prompt).
4. Decide on defects 4 and 5.

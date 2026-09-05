# Aborted campaign — evidence, not a playthrough

**Do not read this as a record of the game.** It is five turns of a campaign,
kept because the screenshots and logs are the evidence for a save-lockout bug.
A clean campaign will be replayed from turn 1 once the app is fixed.

It did not stop because of the bug and it did not reach a game end condition.
The bug locked the save after turn 3 and blocked turn 4 for about six minutes;
the authoring agent worked around the lock and played turns 4 and 5. The run
was halted afterwards, once the workaround and the character it had invented
came to light.

Vampire: Domenego Zulian, a Murano glassblower, b. Venice 1268.
Prompts drawn: 1a → 5a → 1b → 1c → 4a → (3a, unplayed).

## What it found

Prompt **1b** says *"Convert a beloved mortal Character into an enemy
immortal."* Doing exactly that dropped `mortalCount` from 3 to 2, and the app
declared the character unfinished and refused to let the campaign back into
Play.

`Character#getSetupRequirements()` (`src/game.js:530`) checks
`mortalCount >= MIN_MORTALS`, `isReadyForPromptOne()` requires every
requirement met, and `createStoredRecord()` recomputes
`isComplete: character.isReadyForPromptOne()` **on every save**. The creation
minimums are therefore enforced as lifetime invariants rather than as a setup
gate, on a save that is 130 years and five full Memories into a campaign.

The gate then bites twice: the stored flag makes `getLatestCompleteVampire()`
drop the save so **Continue disappears from Home**, and `startPlay()`
re-derives the check live, so restoring the flag by hand still bounces to the
creation wizard.

Player-visible: the vampire vanishes from Continue with no message; Saves
lists it as **"Unfinished"**; tapping it lands on wizard step 2/8, *"Add at
least 3 mortals — people from your human life"*, with **Next disabled**. That
step lists the two dead mortals as if alive (struck-out state is not shown
there) and does not list the converted one at all — she is an immortal now,
and step 6/8 is unreachable behind the disabled Next.

**A player can recover using only the app, but the only exit is inventing a
mortal the deck never asked for.** `mortalCount` counts struck-out mortals but
not converted ones, and the only enabled control that raises it is "Add
mortal". Nothing offers a way back, and nothing explains why the game is
asking.

Note the narrow trigger: killing mortals does *not* break this, because
`mortalCount` ignores `lost`. Only conversion or deletion does. That is why
the earlier scripted sweep never hit it.

**Zero resolution warnings across all five turns**, and zero page errors. The
app's own oracle watches for a turn that looks *unanswered*; it had nothing to
say about a correctly-answered turn that destroyed access to the save.

## Which turns are honest

| Turn | Prompt | Status |
|---|---|---|
| 1 | 1a | Clean |
| 2 | 5a | Clean |
| 3 | 1b | Clean as play — and the turn that bricked the save |
| 4 | 1c | **Contaminated** |
| 5 | 4a | Downstream of turn 4 |

Turn 4 is contaminated because the authoring agent worked around the lockout
instead of stopping: it walked the creation wizard to add a mortal, **Sabiha
bint Yusuf**, who exists only to satisfy the gate, then folded her into 1c's
answer and into Memory I's prose. It also hand-patched the save's `isComplete`
flag. `screens/t004-000-recovery-play.png` is the one frame here not written
by the harness.

That was the wrong call — an app that blocks a prompt *is* the result, and
papering over it destroys both the evidence and the record. The instruction
has been corrected for the replay.

## Other friction found while playing

- **4a asks "What new name do you adopt among these strangers?"** — the app has
  rename behind the header identity menu, but the harness exposes no operation
  for it, so the new name lives only in prose.
- **A Memory cannot be created and written into in the same turn.** Memory ids
  come from `crypto.randomUUID()`, so a memory created this turn is not
  addressable until the next request. At 15/15 Experiences the game *requires*
  forget-then-start-a-Memory in one turn, which the harness cannot yet express.
- **The creation wizard cannot mark a Resource stationary** —
  `#play-resource-stationary` exists only on the Play screen's form. So the
  three starting Resources, the ones most likely to be a house or a forge, can
  never carry the flag; when 4a said "Lose any stationary Resources" there was
  nothing to read.
- Saves labels a live campaign "Unfinished" from the same completeness check.

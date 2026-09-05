# Campaign: Ismenia Foscari / Jelena Vranić / Xene Drakos / Katelijne Vos

A full solo playthrough of *Thousand Year Old Vampire*, played straight through
the `campaign.mjs` harness from a brand-new character to a genuine
deck-declared ending. 20 turns, zero app or harness failures, zero fabricated
content, zero workarounds.

## The vampire

Born **Ismenia Foscari** in Ragusa (Dubrovnik) in 1358, daughter of a coral
merchant who taught her to weigh honestly and, when the harvest was thin, to
falsify the ledger so no household on their street went hungry. Betrothed to
**Beatriz Gundulić** since childhood. Confessed to, unwittingly, by the family
friend **Fra Anzelmo**. Turned on the Customs House stair by **the Voivode of
Ash**, a hollow, cinder-grey noble who had already outlived seven names for
his own title — and who left her with a Mark, **A Throat That Does Not
Close**, and a taste of ash that never left her mouth.

She never stopped fleeing and renaming herself across the game: exposed in
Ragusa she fled inland to Trebinje as **Jelena Vranić**; exposed there she
fled to the Srebrenica silver mines; exposed again she crossed the
Mediterranean to Alexandria as **Xene Drakos**; exposed a third time (a
silvered Murano mirror that gave back no reflection) she fled to Bruges as
**Katelijne Vos**, where she finally stopped running — not because she was
safe, but because she'd built a life so self-sustaining it needed nothing
further from her: a vast clockwork that marked centuries instead of hours, a
letter of credit, a warehouse share, and no mortal left alive who could name
what she'd once been.

## Turn count and prompt sequence

**20 turns.** The very first roll (new since the last attempt: a fresh
character now rolls d10-d6 before Prompt 1 too) landed on **4a**, not 1a.

```
4a → 3a → 7a → 14a → 22a → 25a → 29a → 28a → 35a → 43a →
42a → 40a → 46a → 51a → 56a → 60a → 65a → 68a → 70a → 73a
```

## How it ended

**Prompt 73a**, a terminal prompt (deck rows 72–80, `terminalPrompt: true`):
*"You achieve a position of absolute stability that might sustain you,
unchanging, until the Sun dies... The game is over."* This is the deck
declaring the end outright (`refs/rules.txt:232`), not the
unable-to-check-or-lose condition — the vampire never actually ran out of
both Skills and Resources at once (closest approach: all 6 Skills were
checked from turn 12 onward, but 2 Resources always remained unlost, so the
substitution rule always had something to substitute *to*). The closing
Experience ties the ending back to the curse memory that opened the game: she
becomes as fixed and still as the Voivode of Ash was to her on the night he
turned her.

Final `sheet.remaining`:
```json
{
  "uncheckedSkills": 0,
  "unlostSkills": 6,
  "uncheckedResources": 2,
  "unlostResources": 2,
  "freeMemorySlots": 0
}
```

## Resolution warnings: 4 turns, 5 warnings total

All four are explained by the prompt's own text having no applicable
mechanical clause left to trigger — not misreads:

- **Turn 7 (29a)**, *"Lose any stationary Resources... What new name do you
  take?"* — no Resource was ever flagged stationary, so the loss clause had
  no target; the turn's only content was a rename and an Experience, neither
  of which the app's trait-signature check counts. Warning: *"Traits: none
  created, checked or struck out."*
- **Turn 13 (46a)**, *"Convert any stationary Resources to a new Resource...
  What name do you travel under?"* — same situation, same warning.
- **Turn 14 (51a)**, *"Lose a random Experience from a Memory somewhere in
  the middle... "* — a pure-loss prompt (per `AGENTS.md`'s own framing of
  this entry, it maps to the general delete-Experience action, not a new
  Experience). Deleting an Experience doesn't touch a trait and isn't itself
  a new Experience, so both warnings fired: *"Experience: none recorded for
  this prompt."* and *"Traits: none created, checked or struck out."*
- **Turn 20 (73a)**, the terminal prompt — it asks only "What does this
  mean?", answered with a closing Experience; no trait change was instructed
  or appropriate for an ending. Warning: *"Traits: none created, checked or
  struck out."*

In every case the alternative — inventing a stationary Resource that was
never created, or a trait touch the prompt never asked for, just to silence
the warning — would have been the actual misread. These are read as a
correct 4-in-20 rate of "nothing mechanical applies here," not a conformance
failure.

## App and harness problems encountered

**One confirmed harness gap, no app bugs.** The fixed save-lockout bug from
the prior attempt (commit `3d09e63`) never recurred — Beatriz was struck from
mortal to lost, and Fra Anzelmo, Ilya, and others were created, struck, and
edited across 20 turns with no lockout, no forced detour through the creation
wizard, and no corrupted save.

- **No way to un-forget a Memory or restore a struck Character through the
  harness**, even though the app itself supports both (the memory-detail
  menu's "Forget" control relabels to "Restore" once a Memory is lost; a
  struck trait's row shows a "Restore" button in place of Check/Strike out).
  `campaign.mjs`'s `forget_memory` operation is hard-coded to click an
  action-sheet item labelled exactly `"Forget"`, and there is no operation at
  all for a struck Character's `"Restore"` button. This came up twice:
  - **Turn 8 (28a)**, *"A long-dead mortal Character returns... You only
    recognize them if you still have a related Memory."* Fra Anzelmo (struck
    in turn 4) was the only long-dead Character with a live Memory. Rather
    than risk a failed turn on an operation that doesn't exist, he returned
    as an unquiet revenant rather than a Character restored to active play —
    a legitimate reading the rules explicitly permit ("survived death" can be
    answered narratively), so no turn was lost, but the choice was shaped by
    the harness gap rather than by what felt most true to the prompt.
  - **Turn 18 (68a)**, *"...then regain one of your earliest Memories."*
    This clause could not be honored at all: Beatriz's forgotten Memory III
    stayed forgotten, recorded as `no_mechanical_change` with the reasoning
    inline in the turn's plan. Everything else the prompt asked for (losing
    a Resource, gaining the antiquity, recording the Experience) was still
    done in full.

  Both are real, reachable app features (visible in `src/main.js`'s
  `openMemoryMoreMenu` and the trait-row rendering) that this harness simply
  has no operation for yet — worth closing the same way `rename` and `$new`
  were closed for this attempt.

No other gaps: `rename`, the `"$new"` memory sentinel, `create_resource`'s
`stationary` flag, and every check/strike/create/edit/delete operation used
here worked exactly as documented on every one of the 20 turns.

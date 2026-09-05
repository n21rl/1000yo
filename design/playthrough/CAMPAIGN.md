# Campaign harness

`campaign.mjs` plays 1000yo one prompt at a time through the real UI, pausing
between prompts so an author decides what the drawn prompt actually instructs.
Unlike `playthrough.mjs` — a fixed script that drives every screen without
answering anything — this one plays the game.

## Why it is file-mediated

This environment has no Anthropic API credentials, so the harness cannot call a
model itself. Each invocation restores the campaign, applies one authored turn,
rolls, writes the next request, and exits. The author's loop is:

```bash
cat campaign/turns/007-request.json     # what the game is asking
$EDITOR campaign/turns/007-plan.json    # what you do about it
node campaign.mjs step                  # apply it, roll, emit the next request
```

## Running

```bash
npm run dev                             # app on :4173
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright/index.js \
  node design/playthrough/campaign.mjs init    # build the character
node design/playthrough/campaign.mjs step      # one turn
node design/playthrough/campaign.mjs status    # where things stand
```

`PLAYWRIGHT_MODULE` is only needed when `playwright` is not resolvable from
this directory — it is deliberately not a dependency of this repo, which has no
build step and ships nothing from here. `PW_CHROMIUM`, `BASE_URL` and
`CAMPAIGN_ROOT` also override.

## State and determinism

Resumption uses the app's own `localStorage` save rather than a snapshot format
of its own, so a turn costs one browser launch regardless of how long the
campaign has run. Rolls are seeded per turn (`SEED + turn`), so a turn replays
identically without carrying PRNG state between processes.

A failed operation aborts the turn without advancing state and writes
`turns/NNN-error.json`; fix the plan and re-run.

## Renaming and writing into a Memory you just created

`rename` opens the header identity menu and renames the vampire — for prompts
that ask what name you go by now (4a's "what new name do you adopt").

`add_memory` creates a Memory whose id doesn't exist until the app assigns it
at runtime, so a plan can't know it in advance. Use the literal string
`"$new"` as `memoryId` in a later operation in the *same* plan (`add_experience`,
`forget_memory`, `move_memory_to_diary`, ...) to target the Memory that
`add_memory` just created — this resolves against the freshly re-fetched sheet
each operation reads, so it always means "whichever Memory was created most
recently in this turn." Each `turns/NNN-request.json` restates this in its
`notes` field.

## Files

```text
campaign/character.json      authored: the vampire, for the creation wizard
campaign/turns/NNN-request.json  emitted: prompt text, full character sheet, legal ops
campaign/turns/NNN-plan.json     authored: typed operations + the Experience prose
campaign/log.jsonl               one record per completed turn, with the app's warnings
campaign/screens/                every screen change, t<turn>-<n>-<label>.png
campaign/state.json              resume point (turn number + localStorage)
```

## The warnings are the score

`getResolutionWarnings` is the app's own signal that a turn looks unanswered —
no Experience recorded, no trait touched, memories unchanged. The harness
**records** every warning into `log.jsonl` instead of clicking through it. A
turn that produces warnings is a turn that probably misread its prompt, so the
warning count across a campaign is a conformance score.

## Scope

This is a record, not a fixture. Nothing under `design/playthrough/` is
imported by the app or referenced by `npm test`, and nothing here ships.

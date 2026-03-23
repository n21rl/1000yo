# 1000yo

Browser app for playing a *Thousand Year Old Vampire*-style solo campaign with persistent characters, guided setup, and prompt-driven play.

This is an unofficial fan project and is not affiliated with Tim Hutchings or the official game publication.

## Features

- Multi-character save menu backed by browser `localStorage`
- 8-step character creation wizard with validation and step autofill
- Prompt play screen that loads `refs/prompts.csv` (`a`, `b`, `c` entries per prompt)
- Memory model: `5` active memory slots, up to `3` experiences per memory, and optional diary storage for up to `4` preserved memories
- Trait tracking for characters, skills, resources, and marks (used/lost states)
- Hash routes for direct navigation: `#/menu`, `#/create`, `#/play/<vampire-id>`

## Tech Stack

- Vanilla HTML/CSS/JavaScript (ES modules)
- No frontend framework or build step
- Node test runner (`node --test`)

## Requirements

- Node.js 18+ (recommended)
- Python 3 (used by `npm run dev` to serve static files)

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:4173`.

Run tests:

```bash
npm test
```

## Gameplay Flow

1. Create or select a vampire from the start menu.
2. Complete setup requirements in the wizard: 5 memories, 3 skills, 3 resources, 3 mortals, 1 immortal, and 1 mark.
3. Enter play mode and resolve prompts.
4. Use `Next prompt` to roll `d10 - d6` and move through the prompt deck.
5. Add new memories or experiences, mark traits used/lost, and move memories into the diary when needed.

## Data Files

- `refs/prompts.csv`: Prompt deck used by the play screen.
- `refs/rules.txt`: Local reference text used during development.

Prompt CSV expectations:

- First row may be a header (`a,b,c`)
- Each row maps to one prompt index
- Columns represent first, second, and third visits to that prompt

## Persistence

- Save key: `1000yo.vampires` in browser `localStorage`
- Stored record includes character data, completion state, and campaign state (`currentPrompt` + visit counts)

## Project Structure

```text
index.html                  # App shell and UI sections
src/main.js                 # UI rendering, routing, events, persistence, prompt flow
src/game.js                 # Character domain logic and limits
src/campaign-state.js       # Prompt position/visit serialization helpers
src/styles.css              # Styling
tests/game.test.js          # Character behavior tests
tests/campaign-state.test.js# Campaign state tests
refs/prompts.csv            # Prompt data
refs/rules.txt              # Rules reference text
```

## Scripts

- `npm run dev` - serves the app at port `4173` via Python's HTTP server
- `npm test` - runs unit tests with Node's built-in test runner

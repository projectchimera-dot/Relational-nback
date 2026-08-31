# Relational Four-Stream N-Back

A client-only n-back trainer where every response is relational rather than a fixed same/different match.

The four concurrent streams are:

- **Position** — 3×3 in 2D or 3×3×3 in static/rotating 3D.
- **Sound** — spoken digits 0–9 with Before / After / ±x prompts.
- **Shape** — Circle, Triangle, Square, Pentagon, Hexagon with More / Fewer / ±x-side prompts.
- **Relation** — abstract symbols that must be decoded semantically, with Same / Inverse / Same-family prompts.

The comparison direction is always:

```text
remembered N-back stimulus = relation(current stimulus)
```

Example: current digit `9`, prompt `-3` → press Sound only if the digit N trials ago was `6`.

## Features

- 2D 3×3 grid.
- Static 3D 3×3×3 cube.
- Continuously rotating 3D 3×3×3 cube.
- Cube-local spatial logic: camera rotation never changes the answer.
- Four independent response buttons and keyboard controls (`A`, `S`, `D`, `F`).
- Trial-by-trial changing relational prompts with immediate repetition avoidance.
- Generator-built target/non-target truth; accidental matches are rejected during generation.
- Multiple surface variants for every abstract relation symbol.
- Spoken number stream using the browser Web Speech API.
- Optional per-trial HIT/MISS/FALSE ALARM/CORRECT REJECTION feedback.
- Per-stream and combined accuracy.
- Local browser session history (`localStorage`).
- In-app rule and symbol Wiki.
- No backend, accounts, tracking, analytics, or runtime dependencies.

## Run locally

### VS Code Live Server

Open this folder in VS Code and launch `index.html` with Live Server.

### Built-in local server

```bash
npm run serve
```

Then open `http://localhost:4173`.

No `npm install` is required. The project uses Node only for the test command.

## Tests

Requires Node 20+.

```bash
npm test
```

The tests cover relation direction, 2D/3D spatial rules, digit/shape offsets, semantic inverses/families, trial truth, prompt diversity, scoring, lure bookkeeping, projection math, and static UI wiring.

## Deploy to GitHub Pages

A no-build Pages workflow is included at `.github/workflows/pages.yml`.

1. Create a GitHub repository.
2. Upload/push this project.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.
4. Push to `main` (or run the workflow manually).

The workflow uploads the static repository files and deploys them directly.

## Project structure

```text
.
├── .github/workflows/pages.yml
├── assets/
│   └── favicon.svg
├── docs/
│   ├── Relational_4_Stream_NBack_Specification.pdf
│   └── superpowers/
│       ├── plans/
│       └── specs/
├── src/
│   ├── app.js
│   ├── audio.js
│   ├── constants.js
│   ├── projection.js
│   ├── relations.js
│   ├── renderers.js
│   ├── session.js
│   ├── storage.js
│   ├── symbols.js
│   ├── trialGenerator.js
│   └── wiki.js
├── tests/
├── index.html
├── styles.css
├── package.json
└── README.md
```

## Relation-symbol design

The relation stream deliberately separates **semantic relation** from **surface symbol**. Each semantic relation has multiple variants with different endpoint shapes, while the relational operator remains the meaningful feature. The initial bank is:

- Same
- Opposite
- Contains ↔ Inside
- Leads to ↔ Follows
- Greater ↔ Less

This project was informed by the idea of abstract relational n-back in [GOATED Relational n-Back](https://find-1-bug.github.io/goated-relational-nback-2/), but this repository is an independent, much narrower four-stream implementation built around the specification included in `docs/`.

## Notes

- Speech synthesis voice quality depends on the browser/OS. If speech is unavailable, the rest of the app still works.
- 3D relations are evaluated in logical cube coordinates, not screen coordinates.
- The PDF in `docs/` is the full design/specification document for the app.

## License

MIT — see `LICENSE`.

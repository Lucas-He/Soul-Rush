# Soul Rush

A browser game with boss fights built in TypeScript using React + Canvas. Soul Rush is developed inside a pnpm workspace and includes a Vite-based frontend (the playable game) and an optional API server artifact.

## Demo / Screenshots
Open the Vite dev server after running the steps below and point your browser to the printed URL (typically http://localhost:5173).

## Key features
- Canvas-based real-time game loop implemented in React
- Boss waves and wave validation (fairness checks)
- In-browser UI for controls, leaderboards, and debug tools
- Workspace layout that supports a separate API server (Express / Drizzle) if you need backend features

## Quickstart (developer)
Requirements:
- Node.js (recommended current LTS)
- pnpm (the repo enforces pnpm in the workspace)

Install workspace dependencies:

```bash
pnpm install
```

Run the frontend (play locally):

```bash
cd artifacts/soul-rush
pnpm dev
# open the Vite URL in your browser (e.g. http://localhost:5173)
```

Build the frontend for production:

```bash
cd artifacts/soul-rush
pnpm run build
# preview the production build:
pnpm run serve
```

Run the optional API server (if you need server-side features):

```bash
cd artifacts/api-server
pnpm install
pnpm run dev
# API server dev script runs build then start; check package.json for details
```

Type-check the whole workspace:

```bash
pnpm run typecheck
```

## Project structure (top-level highlights)
- artifacts/
  - soul-rush/ — Vite + React frontend (playable game)
    - src/
      - game/SoulRush.tsx — main game implementation (game loop, rendering, state)
      - main.tsx, App.tsx — app bootstrap
      - index.css, public/ — styles and static assets
    - package.json, vite.config.ts, tsconfig.json
  - api-server/ — Express-based API artifact (routes, DB bindings)
  - mockup-sandbox/ — sandbox / prototypes
- attached_assets/ — repository-level media/assets (possible sprites / audio)
- package.json — workspace root, enforces pnpm
- pnpm-workspace.yaml, pnpm-lock.yaml, tsconfig.base.json

The game logic lives primarily in artifacts/soul-rush/src/game/SoulRush.tsx — that's a large, self-contained implementation of the canvas render loop, input handling, wave definitions, and UI.

## Development notes & tips
- Use pnpm for installing and running scripts; the root preinstall rejects non-pnpm installs.
- SoulRush.tsx contains both core logic and UI. For easier maintenance, consider splitting long components or game subsystems into separate modules (entities, rendering, input, levels).
- Assets may be referenced from artifacts/soul-rush/public/ or attached_assets/. If you add large media, prefer placing them under public/ to keep Vite asset handling straightforward.

## Tests
There are no automated tests detected in the repository root. Add a test runner (Vitest / Jest) inside the artifact packages if you want CI test coverage.

## Contributing
- Fork the repository and open a PR against the main branch.
- Follow TypeScript conventions and run `pnpm run typecheck`.
- Keep changes scoped within the artifact/package you modify (e.g., artifacts/soul-rush).

## License
MIT (see repository root license file if present).

## Troubleshooting
- If the dev server doesn't start, ensure pnpm is used (`pnpm -v`).
- If you see TypeScript errors, run `pnpm run typecheck` in the package that triggered the error (or at repo root for full check).
- For missing assets, check artifacts/soul-rush/public/ and attached_assets/.

## Where to look in the code
- Main game implementation and rendering: artifacts/soul-rush/src/game/SoulRush.tsx
- App bootstrap and routing: artifacts/soul-rush/src/main.tsx and App.tsx
- Frontend build and dev scripts: artifacts/soul-rush/package.json
- API server (optional): artifacts/api-server/package.json

## Questions to consider next
- Do you want me to split SoulRush.tsx into smaller modules for readability and testability?
- Should we add a small backend API (scores/leaderboard) using artifacts/api-server and an example DB config?
- Want me to commit this README.md into the repository for you?

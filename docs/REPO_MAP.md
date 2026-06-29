# Soul Rush — repo map (simple guide)

This short guide explains the repository structure in plain terms for a student.

## Main areas

1. Frontend game
   - Path: `artifacts/soul-rush`
   - What it is: The playable game built with Vite + React + Canvas. Look for `src/game/SoulRush.tsx`, `main.tsx`, and the `public/` folder for static assets.

2. Backend API
   - Path: `artifacts/api-server`
   - What it is: An optional Express API server used for server-side features (routes, middleware, logging). It depends on the database package for persistence.

3. Database package
   - Path: `lib/db`
   - What it is: The database layer using Postgres + Drizzle ORM. Contains the schema (example: `schema/leaderboard.ts`) and scripts to push the schema to a running database.

4. Shared libraries
   - Paths: `lib/api-zod`, `lib/api-spec`, `lib/api-client-react`
   - What they are: Workspace packages shared between frontend and backend (type-safe API schemas, client code and API specs).

5. Replit-related files
   - Files: `.replit`, `replit.md`
   - What they are: Notes and configuration to help run the project in Replit.

6. Root workspace files
   - Files: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`
   - What they are: Workspace configuration and dependency lockfile. The root package enforces using pnpm.

---

## How to test safely

- Make changes on a branch, not `main`.
- Test in Codespaces (or a local dev environment) first.
- Push the branch to GitHub.
- Checkout the same branch in Replit and test again there.
- Open a Pull Request (PR) for review.
- Merge only after both environments (Codespaces/local and Replit) work.
- After merging, pull `main` in Replit to get the merged changes.

---

Notes

- This document is documentation-only and does not modify any game code.
- Frontend and backend are separated so the game can run without the API if you don't need server features like leaderboards.

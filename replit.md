# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## SOUL RUSH Game (`artifacts/soul-rush`)

Single-file React + Vite + Canvas bullet-hell boss-fight game.  
Main file: `artifacts/soul-rush/src/game/SoulRush.tsx` (~5800 lines)

### Bosses
All 20 bosses have unique graphics, wave attacks, and color themes:
- Bosses 1–10: Mortivore → Axiom (original roster, draw functions `drawBoss1`–`drawBoss10`)
- Bosses 11–20: Vyrial → Soulvex (draw functions `drawBoss11`–`drawBoss20` added)
- Switch statement at `renderPlaying` covers cases 0–19

### Admin System
- **Password**: `Orcas@0112` → enables Admin Mode + opens Admin Panel
- **Boss Guide code**: `solution0112` → opens strategy tips overlay
- Admin Panel features (all behind password):
  - Difficulty select (Easy 0.75× → Nightmare 2.0×)
  - Boss Select (jump to any of 20 bosses with clean state)
  - Wave Jump (jump to specific wave within selected boss)
  - Invincibility toggle (`🛡 INV: ON/off` button + `I` key)
  - Clear Bullets button + `C` key
  - Next Wave button + `N` key
  - Restart Wave button + `B` key
  - HP Setter (numeric input + Set HP button)
  - Bullet Speed Mult (½×, 1×, 2× buttons)
- In-game admin HUD shows difficulty, keyboard cheat sheet, and current wave name/type
- Keyboard shortcuts during gameplay (admin mode only): `1–9`, `0`, `Shift+1–0` (bosses), `E/F` (difficulty), `I/C/H/N/B` (live controls)

### Public Leaderboard System
Live leaderboard backed by PostgreSQL. Scores persist across all players.

**API endpoints** (`artifacts/api-server/src/routes/leaderboard.ts`):
- `GET /api/leaderboard` — top 20 by score (public)
- `POST /api/leaderboard` — submit score entry (public)
- `GET /api/leaderboard/completions` — last 10 full-game wins (admin token required)
- `DELETE /api/leaderboard/:id` — delete one entry (admin token)
- `DELETE /api/leaderboard` — wipe all entries (admin token)

**DB schema** (`lib/db/src/schema/leaderboard.ts`): `leaderboard` table — id, player_name, score, waves_cleared, boss_reached, is_full_completion, created_at.

**Admin token**: `Orcas@0112` (via `x-admin-token` header; defaults to this in dev).

**Score formula**: `runScore += Math.round(waveHp * 10 - waveHits * 50 + 200)` per wave.

**Game integration** (in `SoulRush.tsx`):
- `runScore` and `wavesCleared` tracked in GameData, reset on `resetForBoss()`
- Score submitted (fire-and-forget POST) at each wave completion in `continueWave()`
- Final victory triggers POST with `isFullCompletion: true` + shows Congratulations React overlay
- Game over auto-opens Global Leaderboard after 1.5 s
- **LEADERBOARD** button on title screen opens the global overlay
- Wave-end overlay shows RUN SCORE stat + VIEW GLOBAL LEADERBOARD button
- Admin panel gets collapsible Leaderboard (top 20 + per-row delete + Clear All) and Recent Completions sections

**OpenAPI codegen**: After adding/changing endpoints, run `pnpm --filter @workspace/api-spec run codegen`. The codegen script also overwrites `lib/api-zod/src/index.ts` to remove a duplicate type export conflict caused by orval's split mode.

### GameData fields (key additions)
- `adminInvincible: boolean` — skip damage when true
- `debugSpeedMult: number` — multiplied into all bullet velocity in `moveBullets`
- `runScore: number` — cumulative run score, reset on restart
- `wavesCleared: number` — waves cleared this run, reset on restart

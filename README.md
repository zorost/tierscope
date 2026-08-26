# TierScope

Community tier list for frontier and open-weight AI models. Drag models into S+ through F, submit a board as votes, and read a Bayesian consensus anchored to public benchmarks.

Live board: https://zorost.github.io/tierscope/

The GitHub Pages build is a static preview. Votes stay in this browser. The local app can also run a SQLite API for a shared ledger.

## Run locally

Requires Node 20+.

```bash
npm install
npm run seed
npm run dev
```

Open http://localhost:5173. The API listens on http://127.0.0.1:8787. Votes and the catalog live in `data/tierscope.db` (gitignored).

Production:

```bash
npm run build
npm start
```

`npm start` serves the built client and the API from port 8787 (or `PORT`).

## What is in here

| Path | Role |
| --- | --- |
| `contracts/` | Shared catalog, tier points, and prior math |
| `server/` | Hono API, SQLite, consensus, calibration |
| `src/` | Ranking board, consensus, models, stats, methodology |
| `docs/METHODOLOGY.md` | Scoring write-up |

Guest identity is an anonymous UUID in `localStorage`. There is no sign-in in this version.

Calibration votes are synthetic, flagged, and removable:

```bash
npm run seed:purge
```

## Add a model

Edit `contracts/registry.ts`. Use `null` for unknown metrics. Never invent scores. Bump `REGISTRY_AS_OF`. Restart or call the admin sync route if `TIERSCOPE_ADMIN_TOKEN` is set.

## Scripts

- `npm run check` typecheck
- `npm test` scoring self-check
- `npm run seed` registry sync plus calibration if the ledger is empty
- `npm run build:pages` static GitHub Pages bundle

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Vite + React 19 + TypeScript frontend; Hono API; Drizzle ORM + SQLite. Chosen because the Kimi export is incomplete (no pages, no query layer, Kimi-platform internals missing) and MySQL/PlanetScale plus Kimi OAuth would block a private GitHub app from running locally. Guest voting via anonymous browser ID. No OAuth in v1.

## Users

[Inferred from brief] Practitioners who pick AI models for work: engineers, researchers, and operators comparing frontier and open-weight models. They arrive with a ranking question, not a browsing question.

[Inferred] Secondary audience: people who want a transparent community consensus they can audit against public benchmarks.

## Product Purpose

TierScope is a community tier list for frontier and open-weight AI models. Users drag models into tiers (S+ through F), submit a board as votes, and see a live Bayesian consensus anchored to public benchmarks.

Success: a visitor can rank models, understand why the consensus sits where it does, and trust that synthetic calibration data is labeled.

## Positioning

Community placements plus a published Bayesian prior from public leaderboards, with calibration votes always flagged. Neighboring leaderboards show scores; this product shows a ranked board the visitor can author and share.

## Operating Context

- Local draft auto-saves in the browser; shareable `?board=` links; optional PNG export.
- Registry in `contracts/registry.ts` is the catalog update point; the database is a materialized view plus votes.
- Stats: distributions, controversy, trending, community-vs-benchmark alignment, head-to-head.
- Scene: desktop-first evaluation at a desk, dark room or office monitor, repeated short sessions.

## Capabilities and Constraints

Confirmed from the Kimi handover and this request:

- Routes: `/` tier maker, `/consensus`, `/stats`, `/models`, `/models/:slug`, `/methodology`.
- 29 models in the 2026-08-21 registry snapshot; metrics may be `null`; never fabricate scores.
- Votes are upserts; vote events are append-only.
- Synthetic calibration uses `synthetic = true` and `s:` voter keys, reported separately.
- No personal information, emails, or private credentials in the repository or UI.
- GitHub repository starts private; you will switch it public later.
- Kimi OAuth is dropped for v1 (platform-specific and would leak a third-party identity dependency).

Undecided (not blocking v1): comments, personal profile, Elo pairwise battles, live WebSocket consensus, hosted production URL.

## Brand Commitments

- Product name: TierScope.
- Voice: enterprise, direct, no hype, no hashtags, no agent attribution.
- Visual constraint from you: simple, aligned blocks, no overflow, no text escaping its container, high contrast, intuitive. Golden Design / Impeccable craft floor plus Contrast Rebellion (body text ≥ 4.5:1).

## Evidence on Hand

- Model catalog and scoring math: `from Kimi K3/Kimi_Agent_AI Model Ranking Site/app/contracts/`
- API intent: `from Kimi K3/.../app/api/*Router.ts`
- Methodology: `from Kimi K3/.../app/docs/METHODOLOGY.md`
- Missing from the export: frontend pages, board components, `api/queries/*`. Rebuilt from the handover, not invented as product claims.
- Benchmark numbers are a dated public snapshot (`REGISTRY_AS_OF`). Do not invent newer scores.

## Product Principles

1. The board is the product. Ranking is the first action, not a destination after marketing.
2. Math is public. Consensus, prior, and calibration are explainable on the methodology page.
3. Synthetic data is never silent. Calibration votes are flagged everywhere they appear.
4. The catalog stays typed. New models are registry edits; the database is not hand-edited.
5. Privacy by default. Guest identity stays in the browser; the repo carries no personal data.

## Accessibility & Inclusion

[Inferred] WCAG AA contrast as a floor, AAA for body copy where the palette allows. Keyboard and click-to-assign for the board so touch and pointer both work. `prefers-reduced-motion` honored.

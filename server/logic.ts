import { desc, eq, gte, like } from "drizzle-orm";
import { MODEL_REGISTRY, REGISTRY_AS_OF } from "../contracts/registry.ts";
import { computePrior } from "../contracts/prior.ts";
import {
  PRIOR_CONFIDENCE,
  TIER_POINTS,
  TIERS,
  scoreToTier,
  type Tier,
} from "../contracts/tiers.ts";
import {
  db,
  models,
  nowIso,
  syncLog,
  voteEvents,
  votes,
  type ModelRow,
  type VoteRow,
} from "./db.ts";

const NEW_MODEL_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;
const CALIBRATION_VOTERS = 36;
const CALIBRATION_SIGMA = 12.5;

export type Dist = Record<Tier, number>;

export interface Aggregate {
  score: number;
  tier: Tier;
  n: number;
  nReal: number;
  nCal: number;
  dist: Dist;
  controversy: number;
  deltaPrior: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function emptyDist(): Dist {
  return { "S+": 0, S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
}

export function nearestTier(score: number): Tier {
  let best: Tier = "C";
  let bestD = Infinity;
  for (const t of TIERS) {
    const d = Math.abs(TIER_POINTS[t] - score);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

export function aggregateVotes(model: ModelRow, modelVotes: VoteRow[]): Aggregate {
  const dist = emptyDist();
  const points: number[] = [];
  let nReal = 0;
  let nCal = 0;
  for (const v of modelVotes) {
    const tier = v.tier as Tier;
    if (tier in dist) dist[tier] += 1;
    points.push(TIER_POINTS[tier] ?? 50);
    if (v.synthetic) nCal += 1;
    else nReal += 1;
  }
  const n = points.length;
  const sum = points.reduce((a, b) => a + b, 0);
  const C = model.priorConfidence;
  const score = n === 0 ? model.priorScore : (C * model.priorScore + sum) / (C + n);
  const mean = n === 0 ? model.priorScore : sum / n;
  const variance =
    n < 2 ? 0 : points.reduce((acc, p) => acc + (p - mean) ** 2, 0) / n;
  return {
    score: round1(score),
    tier: scoreToTier(score),
    n,
    nReal,
    nCal,
    dist,
    controversy: round1(Math.sqrt(variance)),
    deltaPrior: round1(score - model.priorScore),
  };
}

export function groupVotesByModel(all: VoteRow[]): Map<number, VoteRow[]> {
  const map = new Map<number, VoteRow[]>();
  for (const v of all) {
    const list = map.get(v.modelId);
    if (list) list.push(v);
    else map.set(v.modelId, [v]);
  }
  return map;
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return Math.round((num / Math.sqrt(dx * dy)) * 1000) / 1000;
}

function gaussian(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function seedCalibrationIfEmpty(): number {
  const any = db.select({ id: votes.id }).from(votes).limit(1).all();
  if (any.length > 0) return 0;
  const catalog = db.select().from(models).all();
  let inserted = 0;
  const stamp = nowIso();
  for (let i = 1; i <= CALIBRATION_VOTERS; i++) {
    const voterKey = `s:calibration-${String(i).padStart(2, "0")}`;
    for (const m of catalog) {
      const coverage = 0.35 + 0.55 * (m.priorScore / 100);
      if (Math.random() > coverage) continue;
      const raw = Math.min(100, Math.max(0, m.priorScore + gaussian() * CALIBRATION_SIGMA));
      const tier = nearestTier(raw);
      db.insert(votes)
        .values({
          modelId: m.id,
          voterKey,
          tier,
          synthetic: true,
          createdAt: stamp,
          updatedAt: stamp,
        })
        .run();
      db.insert(voteEvents)
        .values({
          modelId: m.id,
          voterKey,
          tier,
          synthetic: true,
          createdAt: stamp,
        })
        .run();
      inserted += 1;
    }
  }
  return inserted;
}

export function purgeCalibration(): number {
  const gone = db.delete(votes).where(like(votes.voterKey, "s:%")).run();
  db.delete(voteEvents).where(like(voteEvents.voterKey, "s:%")).run();
  return gone.changes;
}

export function syncRegistry(source = "registry.ts"): { added: number; updated: number } {
  const stamp = nowIso();
  const now = Date.now();
  let added = 0;
  let updated = 0;
  for (const entry of MODEL_REGISTRY) {
    const prior = computePrior(entry.metrics);
    const isNew =
      now - new Date(`${entry.released}T00:00:00Z`).getTime() < NEW_MODEL_WINDOW_MS;
    const values = {
      slug: entry.slug,
      name: entry.name,
      lab: entry.lab,
      kind: entry.kind,
      license: entry.license,
      paramsB: entry.paramsB,
      activeB: entry.activeB,
      ctxK: entry.ctxK,
      inPrice: entry.inPrice,
      outPrice: entry.outPrice,
      released: entry.released,
      summary: entry.summary,
      tags: entry.tags,
      arenaElo: entry.metrics.arena,
      aaIndex: entry.metrics.aa,
      arcAgi2: entry.metrics.arc2,
      sweBench: entry.metrics.swe,
      gpqa: entry.metrics.gpqa,
      priorScore: prior.score,
      priorConfidence: prior.confidence,
      isNew,
      updatedAt: stamp,
    };
    const existing = db
      .select({ id: models.id })
      .from(models)
      .where(eq(models.slug, entry.slug))
      .limit(1)
      .all();
    if (existing.length === 0) {
      db.insert(models)
        .values({ ...values, createdAt: stamp })
        .run();
      added += 1;
    } else {
      db.update(models).set(values).where(eq(models.id, existing[0].id)).run();
      updated += 1;
    }
  }
  db.insert(syncLog)
    .values({
      source,
      status: "ok",
      added,
      updated,
      message: `Synced ${MODEL_REGISTRY.length} registry entries`,
      createdAt: stamp,
    })
    .run();
  return { added, updated };
}

export function lastSuccessfulSync() {
  return (
    db
      .select()
      .from(syncLog)
      .where(eq(syncLog.status, "ok"))
      .orderBy(desc(syncLog.createdAt))
      .limit(1)
      .all()[0] ?? null
  );
}

export function ensureFresh(): void {
  const count = db.select({ id: models.id }).from(models).limit(1).all();
  const last = lastSuccessfulSync();
  const stale =
    !last || Date.now() - new Date(last.createdAt).getTime() > 24 * 60 * 60 * 1000;
  if (count.length === 0 || stale) syncRegistry();
  seedCalibrationIfEmpty();
}

export function getCatalog() {
  ensureFresh();
  return {
    models: db.select().from(models).all(),
    votes: db.select().from(votes).all(),
    registryAsOf: REGISTRY_AS_OF,
  };
}

export function recentEvents(since: Date) {
  return db
    .select()
    .from(voteEvents)
    .where(gte(voteEvents.createdAt, since.toISOString()))
    .all();
}

export { PRIOR_CONFIDENCE, REGISTRY_AS_OF };

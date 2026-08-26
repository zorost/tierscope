import { desc, eq, gte, like } from "drizzle-orm";
import { MODEL_REGISTRY, REGISTRY_AS_OF } from "../contracts/registry.ts";
import { computePrior } from "../contracts/prior.ts";
import { PRIOR_CONFIDENCE } from "../contracts/tiers.ts";
import { nearestTier } from "../contracts/score.ts";
import {
  db,
  models,
  nowIso,
  syncLog,
  voteEvents,
  votes,
  type VoteRow,
} from "./db.ts";

export { aggregateVotes, nearestTier, pearson } from "../contracts/score.ts";
export type { Aggregate, Dist } from "../contracts/score.ts";

const NEW_MODEL_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;
const CALIBRATION_VOTERS = 36;
const CALIBRATION_SIGMA = 12.5;

export function groupVotesByModel(all: VoteRow[]): Map<number, VoteRow[]> {
  const map = new Map<number, VoteRow[]>();
  for (const v of all) {
    const list = map.get(v.modelId);
    if (list) list.push(v);
    else map.set(v.modelId, [v]);
  }
  return map;
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

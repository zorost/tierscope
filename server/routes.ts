import { Hono } from "hono";
import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { normalizeMetric } from "../contracts/prior.ts";
import { matchesCatalogQuery } from "../contracts/registry.ts";
import { TIER_POINTS, TIERS, type Tier } from "../contracts/tiers.ts";
import { db, models, nowIso, voteEvents, votes } from "./db.ts";
import {
  REGISTRY_AS_OF,
  aggregateVotes,
  getCatalog,
  groupVotesByModel,
  lastSuccessfulSync,
  pearson,
  recentEvents,
  syncRegistry,
} from "./logic.ts";

const TIER_ENUM = z.enum(["S+", "S", "A", "B", "C", "D", "F"]);
const anonIdSchema = z.string().uuid();

function voterKey(anonId: string): string {
  return `a:${anonId}`;
}

export const api = new Hono();

api.get("/status", (c) => {
  const catalog = getCatalog();
  const last = lastSuccessfulSync();
  return c.json({
    lastSyncAt: last?.createdAt ?? null,
    modelCount: catalog.models.length,
    registryAsOf: REGISTRY_AS_OF,
  });
});

api.get("/models", (c) => {
  const kind = c.req.query("kind") ?? "all";
  const search = c.req.query("search") ?? "";
  const anonId = c.req.query("anonId");
  const catalog = getCatalog();
  const byModel = groupVotesByModel(catalog.votes);
  const key = anonId && anonIdSchema.safeParse(anonId).success ? voterKey(anonId) : null;
  let items = catalog.models.map((m) => {
    const modelVotes = byModel.get(m.id) ?? [];
    return {
      ...m,
      agg: aggregateVotes(m, modelVotes),
      myTier: key ? (modelVotes.find((v) => v.voterKey === key)?.tier ?? null) : null,
    };
  });
  if (kind === "frontier" || kind === "open") {
    items = items.filter((m) => m.kind === kind);
  }
  if (search) {
    items = items.filter((m) => matchesCatalogQuery(m, search));
  }
  items.sort((a, b) => b.agg.score - a.agg.score);
  return c.json(items);
});

api.get("/models/labs", (c) => {
  const catalog = getCatalog();
  return c.json([...new Set(catalog.models.map((m) => m.lab))].sort());
});

api.get("/models/:slug", (c) => {
  const slug = c.req.param("slug");
  const anonId = c.req.query("anonId");
  const catalog = getCatalog();
  const model = catalog.models.find((m) => m.slug === slug);
  if (!model) return c.json({ error: "Model not found" }, 404);
  const modelVotes = catalog.votes.filter((v) => v.modelId === model.id);
  const agg = aggregateVotes(model, modelVotes);
  const key = anonId && anonIdSchema.safeParse(anonId).success ? voterKey(anonId) : null;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const events = db
    .select()
    .from(voteEvents)
    .where(eq(voteEvents.modelId, model.id))
    .orderBy(desc(voteEvents.createdAt))
    .limit(2000)
    .all();
  const perDay = new Map<string, number>();
  for (const e of events) {
    if (e.createdAt < since) continue;
    const day = e.createdAt.slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const spark = [...perDay.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return c.json({
    ...model,
    agg,
    dist: TIERS.map((t) => ({ tier: t, count: agg.dist[t] })),
    spark,
    myTier: key ? (modelVotes.find((v) => v.voterKey === key)?.tier ?? null) : null,
  });
});

api.get("/votes/mine", (c) => {
  const parsed = anonIdSchema.safeParse(c.req.query("anonId"));
  if (!parsed.success) return c.json([]);
  const key = voterKey(parsed.data);
  const rows = db
    .select({
      slug: models.slug,
      tier: votes.tier,
      updatedAt: votes.updatedAt,
    })
    .from(votes)
    .innerJoin(models, eq(votes.modelId, models.id))
    .where(eq(votes.voterKey, key))
    .all();
  return c.json(rows);
});

api.post("/votes", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      anonId: anonIdSchema,
      placements: z.array(z.object({ slug: z.string().min(1).max(128), tier: TIER_ENUM })).max(300),
    })
    .safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid board" }, 400);

  const key = voterKey(parsed.data.anonId);
  const slugs = parsed.data.placements.map((p) => p.slug);
  const modelRows =
    slugs.length > 0
      ? db.select().from(models).where(inArray(models.slug, slugs)).all()
      : [];
  const bySlug = new Map(modelRows.map((m) => [m.slug, m]));
  const existing = db.select().from(votes).where(eq(votes.voterKey, key)).all();
  const existingByModel = new Map(existing.map((v) => [v.modelId, v]));
  const kept = new Set<number>();
  let changed = 0;
  const stamp = nowIso();

  for (const p of parsed.data.placements) {
    const model = bySlug.get(p.slug);
    if (!model) continue;
    kept.add(model.id);
    const prev = existingByModel.get(model.id);
    if (!prev) {
      db.insert(votes)
        .values({
          modelId: model.id,
          voterKey: key,
          tier: p.tier,
          synthetic: false,
          createdAt: stamp,
          updatedAt: stamp,
        })
        .run();
      db.insert(voteEvents)
        .values({
          modelId: model.id,
          voterKey: key,
          tier: p.tier,
          synthetic: false,
          createdAt: stamp,
        })
        .run();
      changed += 1;
    } else if (prev.tier !== p.tier) {
      db.update(votes)
        .set({ tier: p.tier, updatedAt: stamp })
        .where(eq(votes.id, prev.id))
        .run();
      db.insert(voteEvents)
        .values({
          modelId: model.id,
          voterKey: key,
          tier: p.tier,
          synthetic: false,
          createdAt: stamp,
        })
        .run();
      changed += 1;
    }
  }

  for (const v of existing) {
    if (!kept.has(v.modelId)) {
      db.delete(votes).where(eq(votes.id, v.id)).run();
    }
  }

  return c.json({ ok: true, placed: kept.size, changed });
});

api.delete("/votes", async (c) => {
  const parsed = anonIdSchema.safeParse(c.req.query("anonId"));
  if (!parsed.success) return c.json({ error: "anonId required" }, 400);
  db.delete(votes).where(eq(votes.voterKey, voterKey(parsed.data))).run();
  return c.json({ ok: true });
});

api.get("/stats/overview", (c) => {
  const catalog = getCatalog();
  const real = catalog.votes.filter((v) => !v.synthetic);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent = recentEvents(weekAgo).filter((e) => !e.synthetic);
  return c.json({
    modelCount: catalog.models.length,
    frontierCount: catalog.models.filter((m) => m.kind === "frontier").length,
    openCount: catalog.models.filter((m) => m.kind === "open").length,
    totalVotes: real.length,
    calibrationVotes: catalog.votes.length - real.length,
    voterCount: new Set(real.map((v) => v.voterKey)).size,
    votes24h: recent.filter((e) => e.createdAt >= dayAgo.toISOString()).length,
    votes7d: recent.length,
    lastSyncAt: lastSuccessfulSync()?.createdAt ?? null,
    registryAsOf: REGISTRY_AS_OF,
  });
});

api.get("/stats/consensus", (c) => {
  const catalog = getCatalog();
  const byModel = groupVotesByModel(catalog.votes);
  const rows = catalog.models
    .map((m) => ({
      slug: m.slug,
      name: m.name,
      lab: m.lab,
      kind: m.kind,
      isNew: m.isNew,
      released: m.released,
      arenaElo: m.arenaElo,
      aaIndex: m.aaIndex,
      arcAgi2: m.arcAgi2,
      sweBench: m.sweBench,
      priorScore: m.priorScore,
      ...aggregateVotes(m, byModel.get(m.id) ?? []),
    }))
    .sort((a, b) => b.score - a.score);
  return c.json(rows);
});

api.get("/stats/alignment", (c) => {
  const catalog = getCatalog();
  const byModel = groupVotesByModel(catalog.votes);
  const pairsAA: { x: number; y: number }[] = [];
  const pairsArena: { x: number; y: number }[] = [];
  const scatter = [];
  for (const m of catalog.models) {
    const agg = aggregateVotes(m, byModel.get(m.id) ?? []);
    const aaNorm = m.aaIndex != null ? normalizeMetric("aa", m.aaIndex) : null;
    const arenaNorm = m.arenaElo != null ? normalizeMetric("arena", m.arenaElo) : null;
    let delta: number | null = null;
    if (aaNorm != null && arenaNorm != null) delta = agg.score - (aaNorm + arenaNorm) / 2;
    else if (aaNorm != null) delta = agg.score - aaNorm;
    else if (arenaNorm != null) delta = agg.score - arenaNorm;
    if (aaNorm != null) pairsAA.push({ x: aaNorm, y: agg.score });
    if (arenaNorm != null) pairsArena.push({ x: arenaNorm, y: agg.score });
    scatter.push({
      slug: m.slug,
      name: m.name,
      lab: m.lab,
      kind: m.kind,
      consensus: agg.score,
      aa: aaNorm,
      arena: m.arenaElo,
      arenaNorm,
      delta: delta == null ? null : Math.round(delta * 10) / 10,
    });
  }
  return c.json({
    rAA: pearson(
      pairsAA.map((p) => p.x),
      pairsAA.map((p) => p.y),
    ),
    rArena: pearson(
      pairsArena.map((p) => p.x),
      pairsArena.map((p) => p.y),
    ),
    scatter,
  });
});

api.get("/stats/activity", (c) => {
  const days = Math.min(90, Math.max(7, Number(c.req.query("days") ?? 30)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = recentEvents(since);
  const perDay = new Map<string, { real: number; calibration: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    perDay.set(d, { real: 0, calibration: 0 });
  }
  for (const e of events) {
    const slot = perDay.get(e.createdAt.slice(0, 10));
    if (!slot) continue;
    if (e.synthetic) slot.calibration += 1;
    else slot.real += 1;
  }
  return c.json([...perDay.entries()].map(([date, v]) => ({ date, ...v })));
});

api.get("/stats/trending", (c) => {
  const days = Math.min(30, Math.max(1, Number(c.req.query("days") ?? 7)));
  const catalog = getCatalog();
  const events = recentEvents(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  const counts = new Map<number, number>();
  for (const e of events) counts.set(e.modelId, (counts.get(e.modelId) ?? 0) + 1);
  const byId = new Map(catalog.models.map((m) => [m.id, m]));
  const rows = [...counts.entries()]
    .map(([modelId, count]) => {
      const m = byId.get(modelId);
      return m ? { slug: m.slug, name: m.name, lab: m.lab, kind: m.kind, count } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return c.json(rows);
});

api.get("/stats/compare", (c) => {
  const aSlug = c.req.query("a") ?? "";
  const bSlug = c.req.query("b") ?? "";
  const catalog = getCatalog();
  const a = catalog.models.find((m) => m.slug === aSlug);
  const b = catalog.models.find((m) => m.slug === bSlug);
  if (!a || !b) return c.json({ error: "Both models are required" }, 404);
  const byModel = groupVotesByModel(catalog.votes);
  const tierOf = new Map<string, { a?: string; b?: string }>();
  for (const v of catalog.votes) {
    if (v.synthetic) continue;
    if (v.modelId !== a.id && v.modelId !== b.id) continue;
    const slot = tierOf.get(v.voterKey) ?? {};
    if (v.modelId === a.id) slot.a = v.tier;
    else slot.b = v.tier;
    tierOf.set(v.voterKey, slot);
  }
  let preferA = 0;
  let preferB = 0;
  let tied = 0;
  for (const { a: ta, b: tb } of tierOf.values()) {
    if (!ta || !tb) continue;
    const pa = TIER_POINTS[ta as Tier];
    const pb = TIER_POINTS[tb as Tier];
    if (pa > pb) preferA += 1;
    else if (pb > pa) preferB += 1;
    else tied += 1;
  }
  return c.json({
    a: { ...a, agg: aggregateVotes(a, byModel.get(a.id) ?? []) },
    b: { ...b, agg: aggregateVotes(b, byModel.get(b.id) ?? []) },
    headToHead: { preferA, preferB, tied, total: preferA + preferB + tied },
  });
});

api.post("/admin/sync", (c) => {
  const token = process.env.TIERSCOPE_ADMIN_TOKEN;
  if (!token || c.req.header("x-admin-token") !== token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return c.json(syncRegistry("manual-admin"));
});

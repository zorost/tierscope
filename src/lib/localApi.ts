import { matchesCatalogQuery, MODEL_REGISTRY, REGISTRY_AS_OF, type RegistryEntry } from "@contracts/registry";
import { computePrior, normalizeMetric } from "@contracts/prior";
import { aggregateVotes, nearestTier, pearson } from "@contracts/score";
import { TIER_POINTS, TIERS, type Tier } from "@contracts/tiers";
import type { ConsensusRow, ModelCard } from "./types";

const NEW_MS = 45 * 24 * 60 * 60 * 1000;
const SUBMITTED_KEY = "tierscope.submitted";
const VOTERS = 36;
const SIGMA = 12.5;

type Submitted = Record<string, Tier>;

function loadSubmitted(): Submitted {
  try {
    const raw = localStorage.getItem(SUBMITTED_KEY);
    return raw ? (JSON.parse(raw) as Submitted) : {};
  } catch {
    return {};
  }
}

function saveSubmitted(board: Submitted): void {
  localStorage.setItem(SUBMITTED_KEY, JSON.stringify(board));
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function calibrationFor(entry: RegistryEntry): Array<{ tier: Tier; synthetic: true }> {
  const prior = computePrior(entry.metrics);
  const rand = mulberry32(hashSeed(entry.slug));
  const votes: Array<{ tier: Tier; synthetic: true }> = [];
  for (let i = 1; i <= VOTERS; i++) {
    const coverage = 0.35 + 0.55 * (prior.score / 100);
    if (rand() > coverage) continue;
    const u = 1 - rand();
    const v = rand();
    const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    const raw = Math.min(100, Math.max(0, prior.score + g * SIGMA));
    votes.push({ tier: nearestTier(raw), synthetic: true });
  }
  return votes;
}

function card(entry: RegistryEntry, id: number, myTier: Tier | null): ModelCard {
  const prior = computePrior(entry.metrics);
  const submitted = loadSubmitted();
  const mine = submitted[entry.slug];
  const votes = [
    ...calibrationFor(entry),
    ...(mine ? [{ tier: mine, synthetic: false as const }] : []),
  ];
  return {
    id,
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
    isNew: Date.now() - new Date(`${entry.released}T00:00:00Z`).getTime() < NEW_MS,
    agg: aggregateVotes(
      { priorScore: prior.score, priorConfidence: prior.confidence },
      votes,
    ),
    myTier: myTier ?? mine ?? null,
  };
}

function catalog(kind = "all", search = ""): ModelCard[] {
  return MODEL_REGISTRY.map((entry, i) => card(entry, i + 1, null))
    .filter((m) => (kind === "frontier" || kind === "open" ? m.kind === kind : true))
    .filter((m) => matchesCatalogQuery(m, search))
    .sort((a, b) => b.agg.score - a.agg.score);
}

export const localApi = {
  status: async () => ({
    lastSyncAt: null,
    modelCount: MODEL_REGISTRY.length,
    registryAsOf: REGISTRY_AS_OF,
  }),
  models: async (q: { kind?: string; search?: string; anonId?: string } = {}) =>
    catalog(q.kind, q.search),
  model: async (slug: string, anonId?: string) => {
    void anonId;
    const entry = MODEL_REGISTRY.find((m) => m.slug === slug);
    if (!entry) throw new Error("Model not found");
    const m = card(entry, MODEL_REGISTRY.indexOf(entry) + 1, null);
    return {
      ...m,
      dist: TIERS.map((t) => ({ tier: t, count: m.agg.dist[t] })),
      spark: [] as Array<{ date: string; count: number }>,
    };
  },
  mine: async (anonId: string) => {
    void anonId;
    return Object.entries(loadSubmitted()).map(([slug, tier]) => ({
      slug,
      tier,
      updatedAt: new Date().toISOString(),
    }));
  },
  submit: async (anonId: string, placements: Array<{ slug: string; tier: string }>) => {
    void anonId;
    const next: Submitted = {};
    for (const p of placements) next[p.slug] = p.tier as Tier;
    saveSubmitted(next);
    return { ok: true as const, placed: placements.length, changed: placements.length };
  },
  clear: async (anonId: string) => {
    void anonId;
    saveSubmitted({});
    return { ok: true as const };
  },
  overview: async () => {
    const items = catalog();
    const real = items.reduce((n, m) => n + m.agg.nReal, 0);
    const cal = items.reduce((n, m) => n + m.agg.nCal, 0);
    return {
      modelCount: items.length,
      frontierCount: items.filter((m) => m.kind === "frontier").length,
      openCount: items.filter((m) => m.kind === "open").length,
      totalVotes: real,
      calibrationVotes: cal,
      voterCount: real > 0 ? 1 : 0,
      votes24h: real,
      votes7d: real,
      lastSyncAt: null,
      registryAsOf: REGISTRY_AS_OF,
    };
  },
  consensus: async (): Promise<ConsensusRow[]> =>
    catalog().map((m) => ({
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
      ...m.agg,
    })),
  alignment: async () => {
    const items = catalog();
    const pairsAA: { x: number; y: number }[] = [];
    const pairsArena: { x: number; y: number }[] = [];
    const scatter = items.map((m) => {
      const aa = m.aaIndex != null ? normalizeMetric("aa", m.aaIndex) : null;
      const arenaNorm = m.arenaElo != null ? normalizeMetric("arena", m.arenaElo) : null;
      let delta: number | null = null;
      if (aa != null && arenaNorm != null) delta = m.agg.score - (aa + arenaNorm) / 2;
      else if (aa != null) delta = m.agg.score - aa;
      else if (arenaNorm != null) delta = m.agg.score - arenaNorm;
      if (aa != null) pairsAA.push({ x: aa, y: m.agg.score });
      if (arenaNorm != null) pairsArena.push({ x: arenaNorm, y: m.agg.score });
      return {
        slug: m.slug,
        name: m.name,
        lab: m.lab,
        kind: m.kind,
        consensus: m.agg.score,
        aa,
        arena: m.arenaElo,
        arenaNorm,
        delta: delta == null ? null : Math.round(delta * 10) / 10,
      };
    });
    return {
      rAA: pearson(
        pairsAA.map((p) => p.x),
        pairsAA.map((p) => p.y),
      ),
      rArena: pearson(
        pairsArena.map((p) => p.x),
        pairsArena.map((p) => p.y),
      ),
      scatter,
    };
  },
  activity: async () => [] as Array<{ date: string; real: number; calibration: number }>,
  trending: async () =>
    catalog()
      .slice(0, 10)
      .map((m) => ({ slug: m.slug, name: m.name, lab: m.lab, kind: m.kind, count: m.agg.n })),
  compare: async (a: string, b: string) => {
    const left = catalog().find((m) => m.slug === a);
    const right = catalog().find((m) => m.slug === b);
    if (!left || !right) throw new Error("Both models are required");
    const submitted = loadSubmitted();
    const ta = submitted[a];
    const tb = submitted[b];
    let preferA = 0;
    let preferB = 0;
    let tied = 0;
    if (ta && tb) {
      if (TIER_POINTS[ta] > TIER_POINTS[tb]) preferA = 1;
      else if (TIER_POINTS[tb] > TIER_POINTS[ta]) preferB = 1;
      else tied = 1;
    }
    return {
      a: left,
      b: right,
      headToHead: { preferA, preferB, tied, total: preferA + preferB + tied },
    };
  },
};

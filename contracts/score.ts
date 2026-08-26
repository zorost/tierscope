import { TIER_POINTS, TIERS, scoreToTier, type Tier } from "./tiers";

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

export interface ScoreModel {
  priorScore: number;
  priorConfidence: number;
}

export interface ScoreVote {
  tier: string;
  synthetic: boolean;
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

export function aggregateVotes(model: ScoreModel, modelVotes: ScoreVote[]): Aggregate {
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

/**
 * Benchmark-anchored prior score.
 *
 * The consensus shown on TierScope is a Bayesian average:
 *
 *     consensus = (C · prior + Σ votes) / (C + n)
 *
 * where `prior` is computed here from public benchmark indices and `C` is a
 * confidence pseudo-count (see PRIOR_CONFIDENCE). With zero community votes
 * the consensus equals the benchmark prior; as votes accumulate the
 * community takes over. See docs/METHODOLOGY.md for the full write-up.
 */

import { PRIOR_CONFIDENCE, PRIOR_CONFIDENCE_UNRANKED } from "./tiers";

export interface PriorMetrics {
  arena?: number | null;
  aa?: number | null;
  arc2?: number | null;
  swe?: number | null;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** Normalize each public metric onto a comparable 0–100 scale. */
export function normalizeMetric(key: keyof PriorMetrics, value: number): number {
  switch (key) {
    case "aa":
      // Artificial Analysis Intelligence Index  -  current frontier ≈ 63–65
      return clamp((value / 65) * 100);
    case "arena":
      // LMArena Elo  -  practical band ≈ 1100–1550
      return clamp(((value - 1100) / 450) * 100);
    case "arc2":
    case "swe":
      // already percentages
      return clamp(value);
  }
}

const WEIGHTS: Record<keyof PriorMetrics, number> = {
  aa: 0.45,
  arena: 0.3,
  arc2: 0.15,
  swe: 0.1,
};

export function computePrior(metrics: PriorMetrics): {
  score: number;
  confidence: number;
} {
  let wSum = 0;
  let acc = 0;
  (Object.keys(WEIGHTS) as Array<keyof PriorMetrics>).forEach((k) => {
    const v = metrics[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      const w = WEIGHTS[k];
      acc += normalizeMetric(k, v) * w;
      wSum += w;
    }
  });
  if (wSum === 0) {
    return { score: 50, confidence: PRIOR_CONFIDENCE_UNRANKED };
  }
  return {
    score: Math.round((acc / wSum) * 10) / 10,
    confidence: PRIOR_CONFIDENCE * (0.5 + 0.5 * wSum), // fuller metric coverage = stronger prior
  };
}

/**
 * Tier system shared between frontend and backend.
 * Single source of truth for tier ordering, points and colors.
 */

export const TIERS = ["S+", "S", "A", "B", "C", "D", "F"] as const;
export type Tier = (typeof TIERS)[number];

/** Numeric value of each tier on a 0–100 scale. */
export const TIER_POINTS: Record<Tier, number> = {
  "S+": 100,
  S: 88,
  A: 76,
  B: 64,
  C: 50,
  D: 35,
  F: 15,
};

/** Consensus score ranges -> tier label (lower bound inclusive). */
export const TIER_THRESHOLDS: Array<{ tier: Tier; min: number }> = [
  { tier: "S+", min: 94 },
  { tier: "S", min: 82 },
  { tier: "A", min: 70 },
  { tier: "B", min: 57 },
  { tier: "C", min: 42 },
  { tier: "D", min: 26 },
  { tier: "F", min: 0 },
];

export function scoreToTier(score: number): Tier {
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (score >= min) return tier;
  }
  return "F";
}

/** Saturated row colors, one hue per category so the board reads at a glance. */
export const TIER_COLORS: Record<Tier, string> = {
  "S+": "#ff244d",
  S: "#ff6a1a",
  A: "#ff9500",
  B: "#ffca28",
  C: "#13d6a2",
  D: "#bd5df3",
  F: "#f72fa6",
};

export const POOL_COLOR = "#60646c";

export function tierColor(tier: string): string {
  return (TIER_COLORS as Record<string, string>)[tier] ?? POOL_COLOR;
}

/**
 * Bayesian prior strength (in "phantom votes") anchoring the consensus to
 * public benchmark indices until community votes accumulate.
 */
export const PRIOR_CONFIDENCE = 12;

/** Prior strength for models with no external metrics at all. */
export const PRIOR_CONFIDENCE_UNRANKED = 6;

export const MODEL_KINDS = ["frontier", "open"] as const;
export type ModelKind = (typeof MODEL_KINDS)[number];

export const MODEL_KIND_LABEL: Record<ModelKind, string> = {
  frontier: "Frontier (proprietary)",
  open: "Open-weight",
};

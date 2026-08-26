import type { Tier } from "@contracts/tiers";

export type { Tier };

export interface Aggregate {
  score: number;
  tier: Tier;
  n: number;
  nReal: number;
  nCal: number;
  dist: Record<Tier, number>;
  controversy: number;
  deltaPrior: number;
}

export interface ModelCard {
  id: number;
  slug: string;
  name: string;
  lab: string;
  kind: "frontier" | "open";
  license: string | null;
  paramsB: number | null;
  activeB: number | null;
  ctxK: number | null;
  inPrice: number | null;
  outPrice: number | null;
  released: string;
  summary: string | null;
  tags: string[] | null;
  arenaElo: number | null;
  aaIndex: number | null;
  arcAgi2: number | null;
  sweBench: number | null;
  gpqa: number | null;
  priorScore: number;
  priorConfidence: number;
  isNew: boolean;
  agg: Aggregate;
  myTier: Tier | null;
}

export interface ConsensusRow {
  slug: string;
  name: string;
  lab: string;
  kind: "frontier" | "open";
  isNew: boolean;
  released: string;
  arenaElo: number | null;
  aaIndex: number | null;
  arcAgi2: number | null;
  sweBench: number | null;
  priorScore: number;
  score: number;
  tier: Tier;
  n: number;
  nReal: number;
  nCal: number;
  dist: Record<Tier, number>;
  controversy: number;
  deltaPrior: number;
}

export type BoardMap = Partial<Record<string, Tier>>;

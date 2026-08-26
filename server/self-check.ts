import assert from "node:assert/strict";
import { computePrior } from "../contracts/prior.ts";
import { TIER_POINTS, scoreToTier } from "../contracts/tiers.ts";
import { aggregateVotes, nearestTier, pearson } from "./logic.ts";
import type { ModelRow, VoteRow } from "./db.ts";

const prior = computePrior({ arena: 1500, aa: 61, arc2: 60.4, swe: 76.8 });
assert.ok(prior.score > 70 && prior.score < 100, "known strong model should prior high");
assert.ok(prior.confidence > 6, "metric coverage should raise confidence");

const empty = computePrior({});
assert.equal(empty.score, 50);
assert.equal(empty.confidence, 6);

assert.equal(scoreToTier(94), "S+");
assert.equal(scoreToTier(82), "S");
assert.equal(scoreToTier(10), "F");
assert.equal(nearestTier(100), "S+");
assert.equal(nearestTier(88), "S");
assert.equal(nearestTier(15), "F");

const model = {
  id: 1,
  priorScore: 80,
  priorConfidence: 12,
} as ModelRow;

const none = aggregateVotes(model, []);
assert.equal(none.score, 80);
assert.equal(none.n, 0);

const votes = [
  { tier: "S+", synthetic: false },
  { tier: "S", synthetic: true },
].map((v, i) => ({ id: i, modelId: 1, voterKey: `t:${i}`, createdAt: "", updatedAt: "", ...v })) as VoteRow[];

const agg = aggregateVotes(model, votes);
const expected = (12 * 80 + TIER_POINTS["S+"] + TIER_POINTS.S) / (12 + 2);
assert.equal(agg.score, Math.round(expected * 10) / 10);
assert.equal(agg.nReal, 1);
assert.equal(agg.nCal, 1);

const r = pearson([1, 2, 3, 4], [2, 4, 6, 8]);
assert.equal(r, 1);

console.log("self-check: scoring math holds");

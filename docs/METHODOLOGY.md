# Methodology

The same content is rendered at `/methodology`. Executable source: `contracts/tiers.ts` and `contracts/prior.ts`.

## Tier points

| S+ | S | A | B | C | D | F |
| --- | --- | --- | --- | --- | --- | --- |
| 100 | 88 | 76 | 64 | 50 | 35 | 15 |

## Bayesian consensus

```
consensus = (C × prior + Σ votePoints) / (C + n)
```

- `prior`: benchmark-anchored score
- `C`: 12 × (0.5 + 0.5 × metric coverage), or 6 with no metrics
- `n`: community votes plus calibration

Thresholds: S+ ≥ 94, S ≥ 82, A ≥ 70, B ≥ 57, C ≥ 42, D ≥ 26, F below 26.

## Benchmark prior

| Metric | Weight | Normalization |
| --- | --- | --- |
| Artificial Analysis Intelligence Index | 0.45 | index / 65 × 100 |
| LMArena Elo | 0.30 | (elo - 1100) / 450 × 100 |
| ARC-AGI-2 verified | 0.15 | as-is |
| SWE-bench Verified | 0.10 | as-is |

Missing metrics are dropped and weights renormalized.

## Calibration

36 synthetic voters, flagged `synthetic = true`, keys `s:calibration-*`. Generated only on an empty ledger. Remove with `npm run seed:purge`.

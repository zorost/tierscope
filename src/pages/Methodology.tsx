export default function Methodology() {
  return (
    <article className="prose">
      <div className="page-lead">
        <div>
          <h1>Methodology</h1>
          <p>The executable source of truth is contracts/tiers.ts and contracts/prior.ts.</p>
        </div>
      </div>

      <h2>Tier points</h2>
      <table>
        <thead>
          <tr>
            <th>S+</th>
            <th>S</th>
            <th>A</th>
            <th>B</th>
            <th>C</th>
            <th>D</th>
            <th>F</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>100</td>
            <td>88</td>
            <td>76</td>
            <td>64</td>
            <td>50</td>
            <td>35</td>
            <td>15</td>
          </tr>
        </tbody>
      </table>

      <h2>Bayesian consensus</h2>
      <p>
        A plain average lets a model with one S+ vote outrank one with hundreds of A votes.
        Instead:
      </p>
      <p>consensus = (C × prior + Σ votePoints) / (C + n)</p>
      <p>
        prior is the benchmark-anchored score. C is a confidence pseudo-count: 12 × (0.5 + 0.5 ×
        metric coverage) when metrics exist, 6 when they do not. n is all votes, community plus
        calibration. With zero votes the consensus equals the prior.
      </p>
      <p>
        Consensus tiers: S+ ≥ 94, S ≥ 82, A ≥ 70, B ≥ 57, C ≥ 42, D ≥ 26, F below 26.
      </p>

      <h2>Benchmark prior</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Weight</th>
            <th>Normalization to 0–100</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Artificial Analysis Intelligence Index</td>
            <td>0.45</td>
            <td>index / 65 × 100</td>
          </tr>
          <tr>
            <td>LMArena Elo</td>
            <td>0.30</td>
            <td>(elo − 1100) / 450 × 100</td>
          </tr>
          <tr>
            <td>ARC-AGI-2 verified</td>
            <td>0.15</td>
            <td>as-is</td>
          </tr>
          <tr>
            <td>SWE-bench Verified</td>
            <td>0.10</td>
            <td>as-is</td>
          </tr>
        </tbody>
      </table>
      <p>
        Missing metrics are dropped and weights renormalized. Sources are public leaderboards in
        the registry snapshot. The ±Prior column on Statistics shows where the crowd disagrees
        with benchmarks.
      </p>

      <h2>Controversy</h2>
      <p>
        Population standard deviation of a model&apos;s vote points. High σ means the community is
        split. A model needs at least 3 votes to appear under Most divisive.
      </p>

      <h2>Calibration votes</h2>
      <p>
        A new ledger is empty, and empty statistics are useless. TierScope ships a calibration
        panel: 36 synthetic voters sampled around each model&apos;s prior with noise (σ ≈ 12.5)
        and popularity-biased coverage. These votes are flagged synthetic, use voter keys that
        start with s:, counted separately everywhere, excluded from voter counts and head-to-head
        preference, and removable with npm run seed:purge. The panel is generated only when the
        vote ledger is empty.
      </p>

      <h2>Voting rules</h2>
      <p>
        One placement per model per voter. Re-voting updates the placement. Boards are submitted
        whole; omissions retract previous placements. Identity is a browser-generated anonymous
        UUID stored locally. All timestamps are UTC.
      </p>
    </article>
  );
}

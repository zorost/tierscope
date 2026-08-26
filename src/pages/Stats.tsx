import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function Stats() {
  const overview = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  const consensus = useQuery({ queryKey: ["consensus"], queryFn: api.consensus });
  const alignment = useQuery({ queryKey: ["alignment"], queryFn: api.alignment });
  const trending = useQuery({ queryKey: ["trending"], queryFn: api.trending });
  const models = useQuery({ queryKey: ["models", "all"], queryFn: () => api.models() });
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const compare = useQuery({
    queryKey: ["compare", a, b],
    queryFn: () => api.compare(a, b),
    enabled: Boolean(a && b && a !== b),
  });

  const o = overview.data;
  const divisive = [...(consensus.data ?? [])]
    .filter((row) => row.n >= 3)
    .sort((x, y) => y.controversy - x.controversy)
    .slice(0, 8);

  return (
    <div className="stack">
      <div className="page-lead">
        <div>
          <h1>Statistics</h1>
          <p>
            Community votes are counted separately from the calibration panel. Registry as of{" "}
            {o?.registryAsOf ?? " - "}.
          </p>
        </div>
      </div>

      {o && (
        <div className="kpi">
          <div>
            <strong>{o.totalVotes}</strong>
            <span>Community votes</span>
          </div>
          <div>
            <strong>{o.calibrationVotes}</strong>
            <span>Calibration votes</span>
          </div>
          <div>
            <strong>{o.voterCount}</strong>
            <span>Voters</span>
          </div>
          <div>
            <strong>{o.votes7d}</strong>
            <span>Events, 7 days</span>
          </div>
        </div>
      )}

      <section>
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Leaderboard</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Model</th>
                <th>Lab</th>
                <th>Tier</th>
                <th className="num">Score</th>
                <th className="num">Votes</th>
                <th className="num">Cal.</th>
                <th className="num">σ</th>
                <th className="num">±Prior</th>
              </tr>
            </thead>
            <tbody>
              {(consensus.data ?? []).map((row) => (
                <tr key={row.slug}>
                  <td>
                    <Link to={`/models/${row.slug}`} className="clip">
                      {row.name}
                    </Link>
                  </td>
                  <td className="clip">{row.lab}</td>
                  <td>{row.tier}</td>
                  <td className="num">{row.score.toFixed(1)}</td>
                  <td className="num">{row.nReal}</td>
                  <td className="num">{row.nCal}</td>
                  <td className="num">{row.controversy.toFixed(1)}</td>
                  <td className="num">
                    {row.deltaPrior > 0 ? "+" : ""}
                    {row.deltaPrior.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Most divisive</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">σ</th>
                <th className="num">Votes</th>
              </tr>
            </thead>
            <tbody>
              {divisive.map((row) => (
                <tr key={row.slug}>
                  <td>
                    <Link to={`/models/${row.slug}`}>{row.name}</Link>
                  </td>
                  <td className="num">{row.controversy.toFixed(1)}</td>
                  <td className="num">{row.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Trending, 7 days</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Model</th>
                <th>Lab</th>
                <th className="num">Events</th>
              </tr>
            </thead>
            <tbody>
              {(trending.data ?? []).map((row) => (
                <tr key={row.slug}>
                  <td>
                    <Link to={`/models/${row.slug}`}>{row.name}</Link>
                  </td>
                  <td>{row.lab}</td>
                  <td className="num">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Community vs benchmarks</h2>
        <p className="note">
          Pearson r vs AA {fmtR(alignment.data?.rAA)} · vs Arena {fmtR(alignment.data?.rArena)}
        </p>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Consensus</th>
                <th className="num">AA norm</th>
                <th className="num">Arena</th>
                <th className="num">Delta</th>
              </tr>
            </thead>
            <tbody>
              {(alignment.data?.scatter ?? []).map((row) => (
                <tr key={row.slug}>
                  <td>
                    <Link to={`/models/${row.slug}`}>{row.name}</Link>
                  </td>
                  <td className="num">{row.consensus.toFixed(1)}</td>
                  <td className="num">{row.aa == null ? " - " : row.aa.toFixed(1)}</td>
                  <td className="num">{row.arena ?? " - "}</td>
                  <td className="num">{row.delta == null ? " - " : row.delta.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Head to head</h2>
        <div className="toolbar">
          <select className="field" value={a} onChange={(e) => setA(e.target.value)} aria-label="Model A">
            <option value="">Model A</option>
            {(models.data ?? []).map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
          <select className="field" value={b} onChange={(e) => setB(e.target.value)} aria-label="Model B">
            <option value="">Model B</option>
            {(models.data ?? []).map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        {compare.data && (
          <div className="kpi" style={{ marginTop: 12 }}>
            <div>
              <strong>{compare.data.headToHead.preferA}</strong>
              <span>Prefer {compare.data.a.name}</span>
            </div>
            <div>
              <strong>{compare.data.headToHead.preferB}</strong>
              <span>Prefer {compare.data.b.name}</span>
            </div>
            <div>
              <strong>{compare.data.headToHead.tied}</strong>
              <span>Tied</span>
            </div>
            <div>
              <strong>{compare.data.headToHead.total}</strong>
              <span>Voters who ranked both</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function fmtR(n: number | null | undefined): string {
  return n == null ? "n/a" : n.toFixed(3);
}

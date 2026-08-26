import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TIER_COLORS, TIERS, tierColor, type Tier } from "@contracts/tiers";
import { ModelMark } from "../components/ModelMark";
import { api } from "../lib/api";
import { getAnonId, loadDraft, saveDraft } from "../lib/voter";

export default function ModelDetail() {
  const { slug = "" } = useParams();
  const anonId = useMemo(() => getAnonId(), []);
  const client = useQueryClient();
  const model = useQuery({
    queryKey: ["model", slug, anonId],
    queryFn: () => api.model(slug, anonId),
    enabled: Boolean(slug),
  });
  const [note, setNote] = useState<string | null>(null);

  const vote = useMutation({
    mutationFn: async (tier: Tier) => {
      const draft = loadDraft();
      draft[slug] = tier;
      saveDraft(draft);
      const placements = Object.entries(draft)
        .filter((entry): entry is [string, Tier] => Boolean(entry[1]))
        .map(([s, t]) => ({ slug: s, tier: t }));
      return api.submit(anonId, placements);
    },
    onSuccess: () => {
      setNote("Vote recorded.");
      void client.invalidateQueries();
    },
    onError: (err: Error) => setNote(err.message),
  });

  if (model.isPending) return <p className="note">Loading model…</p>;
  if (model.isError) return <p className="note err">{(model.error as Error).message}</p>;
  if (!model.data) return <p className="note">Model not found.</p>;

  const m = model.data;
  const max = Math.max(1, ...m.dist.map((d) => d.count));

  return (
    <>
      <div className="page-lead">
        <div className="detail-head">
          <ModelMark lab={m.lab} size={48} />
          <div>
            <h1 className="clip">{m.name}</h1>
            <p>
              {m.lab} · {m.kind === "open" ? "Open-weight" : "Frontier"} · consensus {m.agg.score.toFixed(1)} ({m.agg.tier})
            </p>
          </div>
        </div>
        <Link to="/models" className="btn btn-ghost">
          All models
        </Link>
      </div>

      <div className="stack">
        <p>{m.summary}</p>

        <dl className="specs">
          <dt>Released</dt>
          <dd>{m.released}</dd>
          <dt>License</dt>
          <dd>{m.license ?? "Proprietary"}</dd>
          <dt>Parameters</dt>
          <dd>{fmtParams(m.paramsB, m.activeB)}</dd>
          <dt>Context</dt>
          <dd>{m.ctxK == null ? " - " : `${m.ctxK}k tokens`}</dd>
          <dt>Price in / out</dt>
          <dd>{fmtPrice(m.inPrice, m.outPrice)}</dd>
          <dt>Arena Elo</dt>
          <dd>{m.arenaElo ?? " - "}</dd>
          <dt>AA Index</dt>
          <dd>{m.aaIndex ?? " - "}</dd>
          <dt>ARC-AGI-2</dt>
          <dd>{m.arcAgi2 ?? " - "}</dd>
          <dt>SWE-bench</dt>
          <dd>{m.sweBench ?? " - "}</dd>
          <dt>GPQA</dt>
          <dd>{m.gpqa ?? " - "}</dd>
          <dt>Prior</dt>
          <dd>
            {m.priorScore.toFixed(1)} · C={m.priorConfidence.toFixed(1)}
          </dd>
          <dt>Votes</dt>
          <dd>
            {m.agg.nReal} community · {m.agg.nCal} calibration
          </dd>
        </dl>

        <section>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Vote distribution</h2>
          <div className="dist">
            {m.dist.map((row) => (
              <div key={row.tier} className="dist-row">
                <span className="tier-pill" style={{ background: tierColor(row.tier) }}>
                  {row.tier}
                </span>
                <div className="dist-track" aria-hidden="true">
                  <div
                    className="dist-fill"
                    style={{ width: `${(row.count / max) * 100}%`, background: tierColor(row.tier) }}
                  />
                </div>
                <span className="num">{row.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Place this model</h2>
          <div className="toolbar">
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                className={m.myTier === t ? "btn is-selected" : "btn"}
                style={{ background: TIER_COLORS[t], color: "#fff", borderColor: TIER_COLORS[t] }}
                onClick={() => vote.mutate(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {note && <p className="note ok">{note}</p>}
        </section>
      </div>
    </>
  );
}

function fmtParams(total: number | null, active: number | null): string {
  if (total == null && active == null) return " - ";
  if (total != null && active != null && active !== total) return `${total}B total · ${active}B active`;
  if (total != null) return `${total}B`;
  return `${active}B active`;
}

function fmtPrice(inn: number | null, out: number | null): string {
  if (inn == null && out == null) return " - ";
  const a = inn == null ? " - " : `$${inn}`;
  const b = out == null ? " - " : `$${out}`;
  return `${a} / ${b} per 1M tokens`;
}

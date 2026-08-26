import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ModelCard } from "../lib/types";

type SortKey = "score" | "name" | "lab" | "released" | "arenaElo" | "aaIndex" | "sweBench";

function cell(n: number | null | undefined, digits = 0): string {
  if (n == null) return " - ";
  return digits ? n.toFixed(digits) : String(n);
}

export default function Models() {
  const [kind, setKind] = useState<"all" | "frontier" | "open">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const models = useQuery({
    queryKey: ["models", kind, search],
    queryFn: () => api.models({ kind, search }),
  });

  const rows = useMemo(() => {
    const list = [...(models.data ?? [])];
    list.sort((a, b) => {
      if (sort === "name" || sort === "lab" || sort === "released") {
        return String(a[sort]).localeCompare(String(b[sort]));
      }
      if (sort === "score") return b.agg.score - a.agg.score;
      const av = a[sort] ?? -1;
      const bv = b[sort] ?? -1;
      return bv - av;
    });
    return list;
  }, [models.data, sort]);

  return (
    <>
      <div className="page-lead">
        <div>
          <h1>Models</h1>
          <p>Registry snapshot with live consensus. Missing metrics stay blank. Nothing is invented.</p>
        </div>
        <div className="toolbar">
          <input
            className="field"
            type="search"
            placeholder="Search name or lab"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search models"
          />
          <div className="seg" role="group" aria-label="Model kind">
            {(["all", "frontier", "open"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
                {k === "all" ? "All" : k === "frontier" ? "Frontier" : "Open"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data">
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr>
              <Th k="name" sort={sort} set={setSort} label="Model" />
              <Th k="lab" sort={sort} set={setSort} label="Lab" />
              <th>Kind</th>
              <Th k="score" sort={sort} set={setSort} label="Score" right />
              <th>Tier</th>
              <Th k="arenaElo" sort={sort} set={setSort} label="Arena" right />
              <Th k="aaIndex" sort={sort} set={setSort} label="AA" right />
              <Th k="sweBench" sort={sort} set={setSort} label="SWE" right />
              <Th k="released" sort={sort} set={setSort} label="Released" />
            </tr>
          </thead>
          <tbody>
            {rows.map((m: ModelCard) => (
              <tr key={m.slug}>
                <td>
                  <Link to={`/models/${m.slug}`} className="clip">
                    {m.name}
                  </Link>
                </td>
                <td className="clip">{m.lab}</td>
                <td>{m.kind === "open" ? "Open" : "Frontier"}</td>
                <td className="num">{m.agg.score.toFixed(1)}</td>
                <td>{m.agg.tier}</td>
                <td className="num">{cell(m.arenaElo)}</td>
                <td className="num">{cell(m.aaIndex)}</td>
                <td className="num">{cell(m.sweBench, 1)}</td>
                <td className="num">{m.released}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Th({
  k,
  sort,
  set,
  label,
  right,
}: {
  k: SortKey;
  sort: SortKey;
  set: (k: SortKey) => void;
  label: string;
  right?: boolean;
}) {
  return (
    <th className={right ? "num" : undefined}>
      <button type="button" className="btn btn-ghost" style={{ height: 28, padding: "0 4px" }} onClick={() => set(k)}>
        {label}
        {sort === k ? " ·" : ""}
      </button>
    </th>
  );
}

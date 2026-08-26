import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Board } from "../components/Board";
import { api } from "../lib/api";
import type { BoardMap } from "../lib/types";

export default function Consensus() {
  const consensus = useQuery({ queryKey: ["consensus"], queryFn: api.consensus });
  const models = useQuery({ queryKey: ["models", "all"], queryFn: () => api.models() });

  const board = useMemo<BoardMap>(() => {
    const next: BoardMap = {};
    for (const row of consensus.data ?? []) next[row.slug] = row.tier;
    return next;
  }, [consensus.data]);

  return (
    <>
      <div className="page-lead">
        <div>
          <h1>Consensus</h1>
          <p>
            Bayesian average of community placements, anchored to the public-benchmark prior.
            Calibration votes are included and labeled on Stats.
          </p>
        </div>
      </div>
      {(consensus.isPending || models.isPending) && <p className="note">Loading consensus…</p>}
      {consensus.isError && <p className="note err">{(consensus.error as Error).message}</p>}
      {models.data && <Board models={models.data} board={board} onChange={() => undefined} readOnly />}
    </>
  );
}

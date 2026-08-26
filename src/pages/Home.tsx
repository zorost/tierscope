import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { scoreToTier } from "@contracts/tiers";
import { Board } from "../components/Board";
import { api } from "../lib/api";
import type { BoardMap } from "../lib/types";
import {
  decodeBoard,
  encodeBoard,
  getAnonId,
  loadDraft,
  placementsOf,
  saveDraft,
} from "../lib/voter";

export default function Home() {
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const anonId = useMemo(() => getAnonId(), []);
  const [kind, setKind] = useState<"all" | "frontier" | "open">("all");
  const [search, setSearch] = useState("");
  const [board, setBoard] = useState<BoardMap>(() => loadDraft());
  const [seeded, setSeeded] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const models = useQuery({
    queryKey: ["models", kind, search, anonId],
    queryFn: () => api.models({ kind, search, anonId }),
  });

  useEffect(() => {
    const token = params.get("board");
    if (!token) return;
    const shared = decodeBoard(token);
    if (shared) setBoard(shared);
  }, [params]);

  useEffect(() => {
    saveDraft(board);
  }, [board]);

  useEffect(() => {
    if (seeded || !models.data) return;
    if (params.get("board")) {
      setSeeded(true);
      return;
    }
    if (Object.keys(loadDraft()).length > 0) {
      setSeeded(true);
      return;
    }
    const next: BoardMap = {};
    for (const m of models.data) next[m.slug] = scoreToTier(m.agg.score);
    setBoard(next);
    setSeeded(true);
  }, [models.data, seeded, params]);

  const submit = useMutation({
    mutationFn: () => api.submit(anonId, placementsOf(board)),
    onSuccess: (res) => {
      setNote({ kind: "ok", text: `Saved ${res.placed} placements.` });
      void client.invalidateQueries();
    },
    onError: (err: Error) => {
      setNote({ kind: "err", text: err.message });
    },
  });

  function autoRank() {
    if (!models.data) return;
    const next: BoardMap = {};
    for (const m of models.data) {
      next[m.slug] = scoreToTier(m.agg.score);
    }
    setBoard(next);
    setNote({ kind: "ok", text: "Filled from live consensus. Submit to record your vote." });
  }

  function share() {
    const url = new URL(window.location.href);
    url.searchParams.set("board", encodeBoard(board));
    void navigator.clipboard.writeText(url.toString());
    setParams({ board: encodeBoard(board) });
    setNote({ kind: "ok", text: "Share link copied." });
  }

  async function exportPng() {
    const node = document.getElementById("tier-sheet");
    if (!node) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(node, { backgroundColor: "#09090a", scale: 2 });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "tierscope-board.png";
    a.click();
  }

  function assign(next: BoardMap) {
    setBoard(next);
    setNote(null);
  }

  const placed = placementsOf(board).length;

  return (
    <>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Model kind">
          {(["all", "frontier", "open"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {k === "all" ? "All" : k === "frontier" ? "Frontier" : "Open"}
            </button>
          ))}
        </div>
        <input
          className="field search"
          type="search"
          placeholder="Filter models"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search models"
        />
        <div className="spacer" />
        <button
          type="button"
          className="btn"
          onClick={() => {
            setBoard({});
            setNote(null);
          }}
        >
          Reset
        </button>
        <button type="button" className="btn" onClick={autoRank}>
          Auto-rank
        </button>
        <button type="button" className="btn" onClick={share}>
          Share
        </button>
        <button type="button" className="btn" onClick={() => void exportPng()}>
          Export PNG
        </button>
        <button type="button" className="btn btn-gold" onClick={() => submit.mutate()} disabled={submit.isPending}>
          Submit {placed}
        </button>
      </div>
      {note && <p className={`note ${note.kind}`} style={{ marginBottom: 12 }}>{note.text}</p>}

      {models.isPending && <p className="note">Loading catalog…</p>}
      {models.isError && <p className="note err">{(models.error as Error).message}</p>}
      {models.data && (
        <Board models={models.data} board={board} onChange={assign} />
      )}
    </>
  );
}

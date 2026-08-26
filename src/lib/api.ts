import type { ConsensusRow, ModelCard } from "./types";
import { localApi } from "./localApi";

export const isStaticPreview = import.meta.env.VITE_STATIC === "1";

async function read<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const remoteApi = {
  status: () =>
    read<{ lastSyncAt: string | null; modelCount: number; registryAsOf: string }>("/api/status"),
  models: (q: { kind?: string; search?: string; anonId?: string } = {}) => {
    const p = new URLSearchParams();
    if (q.kind) p.set("kind", q.kind);
    if (q.search) p.set("search", q.search);
    if (q.anonId) p.set("anonId", q.anonId);
    const qs = p.toString();
    return read<ModelCard[]>(`/api/models${qs ? `?${qs}` : ""}`);
  },
  model: (slug: string, anonId?: string) =>
    read<
      ModelCard & {
        dist: Array<{ tier: string; count: number }>;
        spark: Array<{ date: string; count: number }>;
      }
    >(`/api/models/${slug}${anonId ? `?anonId=${anonId}` : ""}`),
  mine: (anonId: string) =>
    read<Array<{ slug: string; tier: string; updatedAt: string }>>(
      `/api/votes/mine?anonId=${anonId}`,
    ),
  submit: (anonId: string, placements: Array<{ slug: string; tier: string }>) =>
    read<{ ok: true; placed: number; changed: number }>("/api/votes", {
      method: "POST",
      body: JSON.stringify({ anonId, placements }),
    }),
  clear: (anonId: string) =>
    read<{ ok: true }>(`/api/votes?anonId=${anonId}`, { method: "DELETE" }),
  overview: () =>
    read<{
      modelCount: number;
      frontierCount: number;
      openCount: number;
      totalVotes: number;
      voterCount: number;
      calibrationVotes: number;
      votes24h: number;
      votes7d: number;
      lastSyncAt: string | null;
      registryAsOf: string;
    }>("/api/stats/overview"),
  consensus: () => read<ConsensusRow[]>("/api/stats/consensus"),
  alignment: () =>
    read<{
      rAA: number | null;
      rArena: number | null;
      scatter: Array<{
        slug: string;
        name: string;
        lab: string;
        kind: string;
        consensus: number;
        aa: number | null;
        arena: number | null;
        arenaNorm: number | null;
        delta: number | null;
      }>;
    }>("/api/stats/alignment"),
  activity: () =>
    read<Array<{ date: string; real: number; calibration: number }>>("/api/stats/activity"),
  trending: () =>
    read<Array<{ slug: string; name: string; lab: string; kind: string; count: number }>>(
      "/api/stats/trending",
    ),
  compare: (a: string, b: string) =>
    read<{
      a: ModelCard;
      b: ModelCard;
      headToHead: { preferA: number; preferB: number; tied: number; total: number };
    }>(`/api/stats/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`),
};

export const api = isStaticPreview ? localApi : remoteApi;

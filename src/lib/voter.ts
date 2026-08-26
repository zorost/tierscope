import type { BoardMap, Tier } from "./types";

const ANON_KEY = "tierscope.anonId";
const DRAFT_KEY = "tierscope.draft";

export function getAnonId(): string {
  const existing = localStorage.getItem(ANON_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(ANON_KEY, id);
  return id;
}

export function loadDraft(): BoardMap {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BoardMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDraft(board: BoardMap): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(board));
}

export function encodeBoard(board: BoardMap): string {
  const json = JSON.stringify(board);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function decodeBoard(token: string): BoardMap | null {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(padded)));
    const parsed = JSON.parse(json) as BoardMap;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function placementsOf(board: BoardMap): Array<{ slug: string; tier: Tier }> {
  return Object.entries(board)
    .filter((entry): entry is [string, Tier] => Boolean(entry[1]))
    .map(([slug, tier]) => ({ slug, tier }));
}

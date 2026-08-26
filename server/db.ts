import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { integer, real, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
fs.mkdirSync(dataDir, { recursive: true });

export const models = sqliteTable(
  "models",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    lab: text("lab").notNull(),
    kind: text("kind", { enum: ["frontier", "open"] }).notNull(),
    license: text("license"),
    paramsB: real("params_b"),
    activeB: real("active_b"),
    ctxK: integer("ctx_k"),
    inPrice: real("in_price"),
    outPrice: real("out_price"),
    released: text("released").notNull(),
    summary: text("summary"),
    tags: text("tags", { mode: "json" }).$type<string[]>(),
    arenaElo: integer("arena_elo"),
    aaIndex: real("aa_index"),
    arcAgi2: real("arc_agi2"),
    sweBench: real("swe_bench"),
    gpqa: real("gpqa"),
    priorScore: real("prior_score").notNull(),
    priorConfidence: real("prior_confidence").notNull(),
    isNew: integer("is_new", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_models_kind").on(t.kind), index("idx_models_lab").on(t.lab)],
);

export const votes = sqliteTable(
  "votes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    modelId: integer("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    voterKey: text("voter_key").notNull(),
    tier: text("tier").notNull(),
    synthetic: integer("synthetic", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_votes_model_voter").on(t.modelId, t.voterKey),
    index("idx_votes_voter").on(t.voterKey),
  ],
);

export const voteEvents = sqliteTable(
  "vote_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    modelId: integer("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    voterKey: text("voter_key").notNull(),
    tier: text("tier").notNull(),
    synthetic: integer("synthetic", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_events_model").on(t.modelId),
    index("idx_events_created").on(t.createdAt),
  ],
);

export const syncLog = sqliteTable("sync_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  status: text("status", { enum: ["ok", "error"] }).notNull(),
  added: integer("added").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  message: text("message"),
  createdAt: text("created_at").notNull(),
});

export type ModelRow = typeof models.$inferSelect;
export type VoteRow = typeof votes.$inferSelect;
export type VoteEventRow = typeof voteEvents.$inferSelect;

const sqlite = new Database(path.join(dataDir, "tierscope.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  lab TEXT NOT NULL,
  kind TEXT NOT NULL,
  license TEXT,
  params_b REAL,
  active_b REAL,
  ctx_k INTEGER,
  in_price REAL,
  out_price REAL,
  released TEXT NOT NULL,
  summary TEXT,
  tags TEXT,
  arena_elo INTEGER,
  aa_index REAL,
  arc_agi2 REAL,
  swe_bench REAL,
  gpqa REAL,
  prior_score REAL NOT NULL,
  prior_confidence REAL NOT NULL,
  is_new INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  voter_key TEXT NOT NULL,
  tier TEXT NOT NULL,
  synthetic INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(model_id, voter_key)
);
CREATE TABLE IF NOT EXISTS vote_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  voter_key TEXT NOT NULL,
  tier TEXT NOT NULL,
  synthetic INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  added INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_models_kind ON models(kind);
CREATE INDEX IF NOT EXISTS idx_models_lab ON models(lab);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_key);
CREATE INDEX IF NOT EXISTS idx_events_model ON vote_events(model_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON vote_events(created_at);
`);

export function nowIso(): string {
  return new Date().toISOString();
}

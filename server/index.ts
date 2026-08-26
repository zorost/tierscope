import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { api } from "./routes.ts";
import { ensureFresh } from "./logic.ts";

ensureFresh();

const app = new Hono();
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  }),
);
app.route("/api", api);
app.get("/api/health", (c) => c.json({ ok: true }));

if (process.env.NODE_ENV === "production") {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const client = path.join(here, "client");
  app.use("/*", serveStatic({ root: client }));
  app.get("*", serveStatic({ path: path.join(client, "index.html") }));
}

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, (info) => {
  console.log(`TierScope API on http://127.0.0.1:${info.port}`);
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [
    react(),
    {
      name: "pages-404",
      closeBundle() {
        if (process.env.VITE_STATIC !== "1") return;
        const index = path.resolve("dist/client/index.html");
        if (fs.existsSync(index)) {
          fs.copyFileSync(index, path.resolve("dist/client/404.html"));
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@contracts": path.resolve(__dirname, "contracts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
  build: {
    outDir: "dist/client",
  },
});

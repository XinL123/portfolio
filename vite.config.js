import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
    // dev only: never let the browser hold a stale styles.css/script.js --
    // the ?v= cache token only changes on release bumps
    headers: {
      "Cache-Control": "no-store",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
  },
});

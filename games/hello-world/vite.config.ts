import { defineConfig } from "vite";

// Served from GitHub Pages at https://<org>.github.io/dusty-game-shell/
export default defineConfig({
  base: "/dusty-game-shell/",
  build: {
    outDir: "dist",
  },
});

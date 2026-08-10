import { defineConfig } from "vite";

// New games: change `base` to match wherever this game will be hosted
// (e.g. "/dusty-game-shell/" if it joins the games deployed from this repo).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
});

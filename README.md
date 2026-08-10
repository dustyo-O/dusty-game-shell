# Dusty Game Shell

Build machine for Dusty Game Studio: turn a community's lore into a simple,
instantly-playable web game. This repo holds the reusable **Game Shell** and
every individual community game, deployed as static sites with push-to-deploy
CI/CD.

**Live:** https://dustyo-O.github.io/dusty-game-shell/ (updates on every push to `main`)

## Stack decision

| Concern      | Choice                                   | Why |
|--------------|-------------------------------------------|-----|
| Rendering    | HTML5 Canvas (2D)                        | No engine overhead; every target game so far (arcade/lore mini-games) fits plain Canvas. Reach for Phaser only if a specific game needs sprites/physics/tilemaps the hand-rolled loop can't cheaply give it. |
| Language     | TypeScript                               | Catches bugs before they hit players; near-zero build cost with Vite. |
| Build tool   | Vite                                     | Sub-second dev server, zero-config static build, first-class TS support. |
| Backend      | None yet                                 | Games ship as static sites first. Game Shell features that need state (leaderboards, score links) will get a minimal serverless backend (Cloudflare Workers + KV/D1, or Vercel functions) when the first game actually needs one — not before. |
| Hosting      | GitHub Pages                             | Genuinely zero-config with this repo already on GitHub Actions: no extra account, token, or vendor CLI to install. Push to `main` → live URL. Revisit Vercel/Netlify/Cloudflare Pages if we need preview-per-PR URLs or serverless functions colocated with the frontend. |
| CI/CD        | GitHub Actions (`.github/workflows/deploy.yml`) | Builds on every push to `main`, deploys the built static site via `actions/deploy-pages`. |

Keep this simple until a specific game's requirements force a change — see
`/games/<name>` for any game-specific deviations, documented in that game's
own README.

## Repo structure

```
games/            one folder per shipped game (npm workspace each)
  hello-world/     pipeline smoke test — proves build+deploy end to end
packages/
  game-shell/      reusable shell: leaderboards, share links, Discord auth,
                   analytics — built out incrementally as games need pieces
.github/workflows/ CI/CD
```

Adding a new game: `games/<name>/` with its own `package.json` (Vite + TS),
add it to the root build if it should deploy. Each game is a separate npm
workspace so dependencies don't bleed between games.

## Local dev

```
npm install
npm run dev       # hello-world dev server
npm run build     # production build → games/hello-world/dist
npm run preview   # serve the production build locally
```

## Deploy

Push to `main`. GitHub Actions builds `games/hello-world` and publishes
`dist/` to GitHub Pages automatically — no manual deploy step. To deploy
on demand without a code change, use the "Run workflow" button on the
Deploy action in GitHub, or:

```
gh workflow run deploy.yml
```

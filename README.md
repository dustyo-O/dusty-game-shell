# Dusty Game Shell

Build machine for Dusty Game Studio: turn a community's lore into a simple,
instantly-playable web game. This repo holds the reusable **Game Shell** and
every individual community game, deployed as static sites with push-to-deploy
CI/CD.

**Live:** https://dustyo-O.github.io/dusty-game-shell/ (updates on every push to `main`)
**Game Shell demo:** https://dustyo-O.github.io/dusty-game-shell/template/ — the
new-game template, deployed live, exercising every shell feature (leaderboard,
share links, analytics).

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
games/
  hello-world/     pipeline smoke test — proves build+deploy end to end
  template/        copy this to start a new game — wired into every shell
                    feature already; see games/template/README.md
packages/
  game-shell/      reusable shell: leaderboard, share links, auth hook,
                    analytics. src/leaderboard.ts, share.ts, auth.ts,
                    analytics.ts, index.ts (GameShell facade)
.github/workflows/ CI/CD
```

Each game is a separate npm workspace so dependencies don't bleed between
games. Games declare `"@dusty/game-shell": "*"` as a dependency to import it;
npm workspaces symlinks it locally — no publish step.

## Game Shell

`packages/game-shell` gives every new game leaderboard, shareable score
links, an auth hook, and play/share/return analytics in one call:

```ts
import { createGameShell } from "@dusty/game-shell";

const shell = createGameShell({ gameId: "my-game" });

shell.recordPlay();                       // fires "play" (+ "return" if seen before)
const shared = shell.readSharedScore();   // { gameId, score, name } | null, from a "beat my run" link
const { url } = await shell.submitScore(420); // writes to the leaderboard, returns a share URL
const top = await shell.topScores(10);
shell.shareScore(420);                    // fires the "share" analytics event
```

Each piece is swappable behind an interface — pass your own implementation
into `createGameShell({ leaderboard, auth, analyticsSinks })` without
touching call sites:

| Feature | Default (zero infra) | Swap in when |
|---|---|---|
| Leaderboard | `LocalLeaderboardProvider` — per-browser, localStorage | a game needs a global, cross-player leaderboard → implement `LeaderboardProvider` against a small serverless backend (Cloudflare Worker + KV/D1, Vercel function) |
| Share links | `buildShareUrl`/`parseShareUrl` — score encoded inline in the URL, no backend | rarely — this scales fine on its own |
| Auth | `AnonymousAuthProvider` — stable per-browser guest identity | a community wants real identity → `DiscordAuthProvider` is stubbed in `auth.ts`; needs a Discord app + redirect URL, get CEO/community sign-off first |
| Analytics | `ConsoleAnalyticsSink` — logs to devtools | a real analytics endpoint exists → `BeaconAnalyticsSink(endpoint)` |

See `games/template/` for the whole integration in ~80 lines, deployed live
at the Game Shell demo link above.

## Starting a new game

```
cp -r games/template games/<your-game>
```

Then follow the checklist in `games/template/README.md` — rename the
package, set a `gameId`, replace the game logic, add it to CI. A new game
should be playable locally within the hour.

## Local dev

```
npm install
npm run dev                              # hello-world dev server
npm run dev --workspace=games/template   # template dev server
npm run build                            # production build → games/hello-world/dist
npm run preview                          # serve the production build locally
npm run typecheck                        # typecheck every workspace
```

## Deploy

Push to `main`. GitHub Actions builds `games/hello-world` and
`games/template`, publishes hello-world at the site root and the template
under `/template/`, and ships both to GitHub Pages — no manual deploy step.
Add a `- run: npm run build --workspace=games/<your-game>` + copy step in
`.github/workflows/deploy.yml` when a new game is ready to go live. To
deploy on demand without a code change, use the "Run workflow" button on
the Deploy action in GitHub, or:

```
gh workflow run deploy.yml
```

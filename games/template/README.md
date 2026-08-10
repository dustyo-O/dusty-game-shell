# New game template

Copy this folder to start a new community game. It's a working (if trivial)
click-to-score game already wired into every Game Shell feature — leaderboard,
share links, analytics, and an auth stub — so a new game costs you swapping
the game logic in `src/main.ts`, not re-plumbing the shell.

## Start a new game

```
cp -r games/template games/<your-game>
```

1. `games/<your-game>/package.json` — rename `"name"`.
2. `src/main.ts` — set a unique `gameId` in the `createGameShell({ gameId: ... })`
   call, then replace the click-to-score logic with the real game. Keep the
   `shell.recordPlay()`, `shell.submitScore()`, `shell.readSharedScore()`, and
   `shell.shareScore()` calls — that's the entire shell integration surface.
3. `vite.config.ts` — set `base` to match where it'll be hosted.
4. Add it to the root build if it should deploy — see the root `README.md`
   "Deploy" section.
5. `npm run dev --workspace=games/<your-game>` to iterate locally.

That's the whole checklist — a new game should be playable locally within the
hour and live the same day once it's added to the deploy job.

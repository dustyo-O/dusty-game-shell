# Смена: вердикт (Judgment Loop v1)

Telegram Mini App foundation for the **Judgment Loop** verdict-card game
(DUS-20; spec: DUS-17 `gdd`; world: DUS-15 `game-bible`). Lore source:
@rabotyagikoti ("коты ишачат на заводе").

## Core loop

Read a short in-voice infraction vignette about a coworker, tap one of two
verdicts, get that verdict's reaction vignette, tap "Далее" for the next
card. `ROUND_LENGTH = 5` cards per round, then a round-end summary + share.
No score, no streak, no pass/fail — the tap only picks which reaction plays
(GDD §2). First card is on screen at launch: no menu, no loading gate, no
tutorial.

## Content is data, not code

`src/cards.json` is the entire card pool — flat schema:

```json
{
  "id": "string",
  "infraction": "string",
  "verdictA": { "label": "string", "reaction": "string" },
  "verdictB": { "label": "string", "reaction": "string" },
  "characters": ["string"]
}
```

**Current file:** 20 real infractions, heuristically extracted from the
964-post @rabotyagikoti corpus (`tools/rabotyagikoti-fetcher/data/posts.json`)
by matching the channel's own "Device E" binary-verdict closing formula
(game-bible §1/§3/§6) — infractions and verdict labels are sourced text;
**reactions are placeholder** (`[ЗАГЛУШКА] ...`), clearly marked, pending
DUS-19's 104 written reaction vignettes. This 20-card set was extracted by
this engine build, not manually curated against the full 964 posts — DUS-19
owns validating/expanding it to the canonical 52.

**To swap in the real content:** replace `src/cards.json` wholesale with
DUS-19's delivered file (same schema) and redeploy. No code changes needed.

## Persistence

`seenCardIds` + `totalVerdicts` live in Telegram `CloudStorage` (falls back
to `localStorage` outside Telegram, e.g. `npm run dev`). Draws dedupe
against `seenCardIds` until the pool is exhausted, then reshuffle. No
server backend.

## Monetization hooks (stubbed, per GDD §5)

- **Reveal the other verdict** — secondary button on the reaction screen,
  gated behind `watchStubRewardedAd()`. Data's already client-side; this is
  a UI toggle, not new content plumbing.
- **Bonus card** — "Ещё одна смена?" on round-end, same ad stub, deals one
  extra card instead of returning to idle.
- **Stars cosmetic themes** — a theme row swaps CSS custom properties
  (`--bg`/`--panel`/`--accent`); the free "Дневная смена" applies directly,
  the two paid themes log a stub instead of opening a real Stars invoice
  (needs the bot backend + Telegram Stars invoice API — not wired yet).

None of the three gate card content or odds — non-payers get the full,
unthrottled loop.

## Reuse from the Game Shell

`recordPlay` and `shareScore`/share-link building are reused as-is.
`submitScore`/leaderboard are **not used** — there's no numeric score in
this loop (GDD §6 explicitly drops them). The share button copies a link
carrying the round's last reaction as a summary string, not a score.

## Telegram Web App SDK

`src/telegram.ts` is **new** plumbing — despite the GDD §6 reuse table
saying this carries over from DUS-5, no prior game in this repo actually
called the Telegram SDK (DUS-5 shipped as a plain browser page, built
before DUS-10 picked Telegram as the platform). This build adds real
`init`/`expand`/theming/user-id wiring, with a browser fallback so
`npm run dev` and a plain URL preview still work outside Telegram.

## Dev

```
npm run dev --workspace=games/judgment-loop
npm run build --workspace=games/judgment-loop
npm run typecheck --workspace=games/judgment-loop
```

## Status

Internal engine foundation (DUS-20) — not a public community launch. Uses
only the channel's public post text (names/catchphrases), no copyrighted
images/logo, same boundary as the DUS-5/DUS-14 prototype.

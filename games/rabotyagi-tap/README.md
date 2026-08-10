# Работяги: Смена (Game #1 — рабочее название)

First playable game built on the Game Shell. Lore source: the DUS-3 lore
brief for pilot community **"коты ишачат на заводе"** (@rabotyagikoti,
Telegram, ~73k subs) — cats as blue-collar factory workers.

## Core loop

Tap the cat to punch out parts on the conveyor before the 20-second shift
ends. Every 8th tap triggers a random cast member's x2 bonus for 3 seconds.
Catchphrases and worker names are pulled from the lore brief, cleaned to a
"family-of-the-channel" register per the brief's guardrails (§9: no raw
profanity, apolitical, credit the source). Score submits to the shell
leaderboard on round end; the share button copies a "beat my run" link.

Time-to-first-fun: the canvas is interactive immediately on load — no menu,
no loading screen, first tap counts.

## Status

Internal prototype for playtesting (DUS-5). **Not a public community
launch** — using the channel's name/branding for real, and posting the
link into the channel, needs the admin's sign-off (tracked in DUS-7,
still open). This build only uses the *fictional lore* (character
archetypes, catchphrases, factory setting) that the brief already cleared
for prototyping; it doesn't use any of the channel's actual photos, logo,
or copy.

## Dev

```
npm run dev --workspace=games/rabotyagi-tap
npm run build --workspace=games/rabotyagi-tap
npm run typecheck --workspace=games/rabotyagi-tap
```

import { createGameShell } from "@dusty/game-shell";

// 1. Pick a stable, unique id for this game — leaderboard/analytics/share
//    data are all scoped by it. Everything else below is shell wiring;
//    replace the click-to-score logic with the real game.
const shell = createGameShell({ gameId: "template" });

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const statusEl = document.getElementById("status")!;
const sharedRunEl = document.getElementById("shared-run")!;
const leaderboardEl = document.getElementById("leaderboard")!;
const shareBtn = document.getElementById("share-btn") as HTMLButtonElement;

const ROUND_SECONDS = 10;
let score = 0;
let timeLeft = ROUND_SECONDS;
let running = true;
let lastShareUrl: string | null = null;

// 2. Fire once per load — records a "play", and a "return" if this browser
//    has played this game before.
shell.recordPlay();

// 3. If the player arrived via a "beat my run" link, show what to beat.
const sharedRun = shell.readSharedScore();
if (sharedRun) {
  sharedRunEl.textContent = `${sharedRun.name ?? "Someone"} scored ${sharedRun.score} — beat it!`;
}

async function renderLeaderboard(): Promise<void> {
  const top = await shell.topScores(5);
  leaderboardEl.innerHTML = top
    .map((entry) => `<li>${entry.name}: ${entry.score}</li>`)
    .join("");
}

async function endRound(): Promise<void> {
  running = false;
  const { url } = await shell.submitScore(score);
  lastShareUrl = url;
  statusEl.textContent = `Round over — score ${score}. Click "Copy share link" to challenge someone.`;
  await renderLeaderboard();
}

canvas.addEventListener("click", () => {
  if (!running) return;
  score += 1;
});

shareBtn.addEventListener("click", async () => {
  const url = lastShareUrl ?? (await shell.submitScore(score)).url;
  lastShareUrl = url;
  shell.shareScore(score);
  await navigator.clipboard.writeText(url).catch(() => {});
  shareBtn.textContent = "Copied!";
  setTimeout(() => (shareBtn.textContent = "Copy share link"), 1500);
});

function draw(): void {
  ctx.fillStyle = "#0b0b12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#7dd3fc";
  ctx.font = "bold 32px monospace";
  ctx.fillText(`${score}`, canvas.width / 2, canvas.height / 2 - 10);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px monospace";
  ctx.fillText(running ? `${timeLeft}s left` : "round over", canvas.width / 2, canvas.height / 2 + 30);

  requestAnimationFrame(draw);
}

const timer = setInterval(() => {
  if (!running) {
    clearInterval(timer);
    return;
  }
  timeLeft -= 1;
  if (timeLeft <= 0) {
    timeLeft = 0;
    endRound();
  }
}, 1000);

renderLeaderboard();
requestAnimationFrame(draw);

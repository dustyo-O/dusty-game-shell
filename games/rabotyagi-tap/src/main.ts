import { createGameShell } from "@dusty/game-shell";

// Game #1 vertical slice — lore: "коты ишачат на заводе" (DUS-3 brief).
// Core loop: tap the cat to punch out parts before the shift timer runs out.
// Cast, catchphrases, and setting are pulled from the lore brief; profanity
// is cleaned per the brief's guardrails (§9).
const shell = createGameShell({ gameId: "rabotyagi-tap" });

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const statusEl = document.getElementById("status")!;
const sharedRunEl = document.getElementById("shared-run")!;
const leaderboardEl = document.getElementById("leaderboard")!;
const shareBtn = document.getElementById("share-btn") as HTMLButtonElement;

const ROUND_SECONDS = 20;
const COMBO_SIZE = 8;
const COMBO_BONUS_SECONDS = 3;

// Cast + voice lifted from the DUS-3 lore brief (cleaned register per §9).
const WORKERS = ["Гена", "Серёга", "Коля", "Вениамин", "Всеволод", "Валя"];
const CATCHPHRASES = [
  "Тьфу, ёлы-палы!",
  "Ещё одна смена...",
  "Работяги не сдаются!",
  "Гена одобряет.",
  "Норму берём измором.",
  "Конвейер не ждёт.",
];

let score = 0;
let timeLeft = ROUND_SECONDS;
let running = true;
let lastShareUrl: string | null = null;
let punchTimer = 0; // >0 while the cat's "punch" animation plays
let comboCount = 0;
let bonusUntil = 0; // clock value at which the x2 multiplier ends
let toast = "";
let toastTimer = 0;
let clock = 0;

shell.recordPlay();

const sharedRun = shell.readSharedScore();
if (sharedRun) {
  sharedRunEl.textContent = `${sharedRun.name ?? "Кто-то"} сделал(а) ${sharedRun.score} деталей за смену — сможешь больше?`;
}

async function renderLeaderboard(): Promise<void> {
  const top = await shell.topScores(5);
  leaderboardEl.innerHTML = top.map((entry) => `<li>${entry.name}: ${entry.score}</li>`).join("");
}

function showToast(text: string): void {
  toast = text;
  toastTimer = 1.4;
}

async function endRound(): Promise<void> {
  running = false;
  const { url } = await shell.submitScore(score);
  lastShareUrl = url;
  statusEl.textContent = `Смена окончена — ${score} деталей. Жми "Скопировать вызов", чтобы бросить вызов сменщику.`;
  await renderLeaderboard();
}

function tap(): void {
  if (!running) return;
  punchTimer = 0.15;
  const gain = clock < bonusUntil ? 2 : 1;
  score += gain;
  comboCount += 1;
  if (comboCount % COMBO_SIZE === 0) {
    bonusUntil = clock + COMBO_BONUS_SECONDS;
    const worker = WORKERS[Math.floor(Math.random() * WORKERS.length)];
    showToast(`Бонус от ${worker}! x2`);
  } else if (Math.random() < 0.18) {
    showToast(CATCHPHRASES[Math.floor(Math.random() * CATCHPHRASES.length)]);
  }
}

canvas.addEventListener("click", tap);
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    tap();
  },
  { passive: false },
);

shareBtn.addEventListener("click", async () => {
  const url = lastShareUrl ?? (await shell.submitScore(score)).url;
  lastShareUrl = url;
  shell.shareScore(score);
  await navigator.clipboard.writeText(url).catch(() => {});
  shareBtn.textContent = "Скопировано!";
  setTimeout(() => (shareBtn.textContent = "Скопировать вызов"), 1500);
});

function drawConveyor(t: number): void {
  ctx.fillStyle = "#2a2c22";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
  ctx.strokeStyle = "#e8c547";
  ctx.lineWidth = 3;
  const offset = (t * 60) % 24;
  for (let x = -24 + offset; x < canvas.width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, canvas.height - 50);
    ctx.lineTo(x + 12, canvas.height);
    ctx.stroke();
  }
}

function drawCat(cx: number, cy: number, squash: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 1 - squash * 0.25);

  ctx.fillStyle = "#8a7f5c";
  ctx.beginPath();
  ctx.ellipse(0, 20, 34, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, -20, 26, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-20, -34);
  ctx.lineTo(-10, -50);
  ctx.lineTo(-2, -32);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(20, -34);
  ctx.lineTo(10, -50);
  ctx.lineTo(2, -32);
  ctx.fill();

  ctx.fillStyle = "#e8c547";
  ctx.beginPath();
  ctx.ellipse(0, -34, 22, 10, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-22, -34, 44, 5);

  ctx.fillStyle = "#1c1f1a";
  ctx.beginPath();
  ctx.ellipse(-9, -18, 3, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(9, -18, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1c1f1a";
  ctx.lineWidth = 1;
  for (const dy of [-6, -2, 2]) {
    ctx.beginPath();
    ctx.moveTo(-14, -6 + dy);
    ctx.lineTo(-30, -8 + dy);
    ctx.moveTo(14, -6 + dy);
    ctx.lineTo(30, -8 + dy);
    ctx.stroke();
  }

  ctx.restore();
}

function draw(dt: number): void {
  clock += dt;
  if (punchTimer > 0) punchTimer = Math.max(0, punchTimer - dt);
  if (toastTimer > 0) toastTimer = Math.max(0, toastTimer - dt);

  ctx.fillStyle = "#1c1f1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawConveyor(clock);
  drawCat(canvas.width / 2, canvas.height - 70, punchTimer > 0 ? punchTimer / 0.15 : 0);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e8c547";
  ctx.font = "bold 30px monospace";
  ctx.fillText(`${score} деталей`, canvas.width / 2, 34);

  ctx.fillStyle = clock < bonusUntil ? "#f2a541" : "#a8a48c";
  ctx.font = "13px monospace";
  ctx.fillText(
    running
      ? clock < bonusUntil
        ? `x2 бонус! · ${Math.ceil(timeLeft)}с`
        : `${Math.ceil(timeLeft)}с до конца смены`
      : "смена окончена",
    canvas.width / 2,
    58,
  );

  if (toastTimer > 0) {
    ctx.fillStyle = "#e8e6da";
    ctx.font = "14px monospace";
    ctx.fillText(toast, canvas.width / 2, canvas.height - 60);
  }

  requestAnimationFrame(loop);
}

let lastTs: number | null = null;
function loop(ts: number): void {
  const dt = lastTs === null ? 0 : Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  draw(dt);
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
requestAnimationFrame(loop);

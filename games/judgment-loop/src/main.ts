import { createGameShell } from "@dusty/game-shell";
import { initTelegram, getTelegramUserId } from "./telegram.js";
import { loadProgress, markSeen, recordVerdict, drawRound, type Progress } from "./progress.js";
import cardsData from "./cards.json";

// Judgment Loop v1 — verdict-card engine (DUS-20, spec: DUS-17 gdd).
// Card state machine: CARD_SHOWN -> REACTION_SHOWN -> next -> ... -> ROUND_END.
// No score/streak/pass-fail anywhere — the tap only picks which reaction plays (GDD §2).

export interface Card {
  id: string;
  infraction: string;
  verdictA: { label: string; reaction: string };
  verdictB: { label: string; reaction: string };
  characters: string[];
  sourceUrl?: string;
}

const cards = cardsData as Card[];
const ROUND_LENGTH = 5;

const shell = createGameShell({ gameId: "judgment-loop" });

initTelegram();
shell.recordPlay();

// --- DOM refs -------------------------------------------------------------

const progressEl = document.getElementById("progress")!;
const screenCard = document.getElementById("screen-card")!;
const screenReaction = document.getElementById("screen-reaction")!;
const screenEnd = document.getElementById("screen-end")!;

const infractionEl = document.getElementById("infraction")!;
const verdictABtn = document.getElementById("verdict-a") as HTMLButtonElement;
const verdictBBtn = document.getElementById("verdict-b") as HTMLButtonElement;

const reactionVerdictEl = document.getElementById("reaction-verdict")!;
const reactionEl = document.getElementById("reaction")!;
const revealOtherBtn = document.getElementById("reveal-other-btn") as HTMLButtonElement;
const otherReactionEl = document.getElementById("other-reaction")!;
const nextBtn = document.getElementById("next-btn") as HTMLButtonElement;

const endSummaryEl = document.getElementById("end-summary")!;
const endCountEl = document.getElementById("end-count")!;
const bonusBtn = document.getElementById("bonus-btn") as HTMLButtonElement;
const shareBtn = document.getElementById("share-btn") as HTMLButtonElement;
const againBtn = document.getElementById("again-btn") as HTMLButtonElement;

const themeRow = document.getElementById("theme-row")!;

// --- Monetization stubs (§5) — ad SDK is not integrated; these simulate the
// UX so the hooks exist and the UI is wired, ready to swap in a real ad SDK. ---

function watchStubRewardedAd(label: string): Promise<boolean> {
  console.info(`[ads-stub] would show rewarded ad: ${label}`);
  return new Promise((resolve) => setTimeout(() => resolve(true), 400));
}

interface Theme {
  id: string;
  name: string;
  free: boolean;
  bg: string;
  panel: string;
  accent: string;
}

const THEMES: Theme[] = [
  { id: "day", name: "Дневная смена", free: true, bg: "#1c1f1a", panel: "#262a1f", accent: "#e8c547" },
  { id: "night", name: "Ночная смена", free: false, bg: "#0d1117", panel: "#161b22", accent: "#7dd3fc" },
  { id: "payday", name: "Получка", free: false, bg: "#1a1408", panel: "#241d0e", accent: "#4ade80" },
];

function applyTheme(theme: Theme): void {
  const root = document.documentElement.style;
  root.setProperty("--bg", theme.bg);
  root.setProperty("--panel", theme.panel);
  root.setProperty("--accent", theme.accent);
}

function renderThemePicker(ownedThemeIds: Set<string>): void {
  themeRow.innerHTML = "";
  for (const theme of THEMES) {
    const btn = document.createElement("button");
    const owned = theme.free || ownedThemeIds.has(theme.id);
    btn.textContent = owned ? theme.name : `⭐ ${theme.name}`;
    btn.addEventListener("click", () => {
      if (owned) {
        applyTheme(theme);
        return;
      }
      // Stars purchase stub — no real invoice flow wired yet; needs the bot
      // backend + Telegram Stars invoice API before this can charge anyone.
      console.info(`[stars-stub] would open a Stars purchase for theme: ${theme.id}`);
    });
    themeRow.appendChild(btn);
  }
}

// --- State -----------------------------------------------------------------

type VerdictKey = "verdictA" | "verdictB";

let progress: Progress;
let round: Card[] = [];
let roundIndex = 0;
let history: { card: Card; verdict: VerdictKey }[] = [];
let currentCard: Card | null = null;
let currentVerdict: VerdictKey | null = null;
let otherRevealed = false;

function showScreen(name: "card" | "reaction" | "end"): void {
  screenCard.classList.toggle("hidden", name !== "card");
  screenReaction.classList.toggle("hidden", name !== "reaction");
  screenEnd.classList.toggle("hidden", name !== "end");
}

async function startRound(): Promise<void> {
  round = await drawRound(cards, progress, ROUND_LENGTH);
  roundIndex = 0;
  history = [];
  showCard();
}

function showCard(): void {
  currentCard = round[roundIndex];
  currentVerdict = null;
  otherRevealed = false;
  otherReactionEl.classList.add("hidden");
  otherReactionEl.textContent = "";
  revealOtherBtn.disabled = false;
  revealOtherBtn.textContent = "🔒 Глянуть другой вердикт";

  progressEl.textContent = `Карточка ${roundIndex + 1} из ${ROUND_LENGTH}`;
  infractionEl.textContent = currentCard.infraction;
  verdictABtn.textContent = currentCard.verdictA.label;
  verdictBBtn.textContent = currentCard.verdictB.label;
  showScreen("card");
}

async function pickVerdict(verdict: VerdictKey): Promise<void> {
  if (!currentCard) return;
  currentVerdict = verdict;
  history.push({ card: currentCard, verdict });
  await markSeen(progress, currentCard.id);
  await recordVerdict(progress);

  const chosen = currentCard[verdict];
  reactionVerdictEl.textContent = chosen.label;
  reactionEl.textContent = chosen.reaction;
  showScreen("reaction");
}

async function revealOther(): Promise<void> {
  if (!currentCard || !currentVerdict || otherRevealed) return;
  revealOtherBtn.disabled = true;
  revealOtherBtn.textContent = "Смотрим рекламу…";
  await watchStubRewardedAd("reveal-other-verdict");
  otherRevealed = true;
  const other: VerdictKey = currentVerdict === "verdictA" ? "verdictB" : "verdictA";
  const otherChoice = currentCard[other];
  otherReactionEl.textContent = `${otherChoice.label}: ${otherChoice.reaction}`;
  otherReactionEl.classList.remove("hidden");
  revealOtherBtn.textContent = "Показано";
}

function nextCard(): void {
  roundIndex += 1;
  if (roundIndex >= round.length) {
    endRound();
    return;
  }
  showCard();
}

function endRound(): void {
  const favorite = history[history.length - 1];
  endSummaryEl.textContent = `Смена окончена — вынесено ${history.length} вердиктов.`;
  endCountEl.textContent = `Всего вердиктов за всё время: ${progress.totalVerdicts}`;
  bonusBtn.disabled = false;
  bonusBtn.textContent = "📺 Ещё одна смена?";
  shareBtn.dataset.shareText = favorite
    ? `${favorite.card[favorite.verdict].label}: ${favorite.card[favorite.verdict].reaction}`
    : "";
  showScreen("end");
}

async function extendRoundWithBonusCard(): Promise<void> {
  bonusBtn.disabled = true;
  bonusBtn.textContent = "Смотрим рекламу…";
  await watchStubRewardedAd("bonus-card");
  const [bonusCard] = await drawRound(cards, progress, 1);
  if (!bonusCard) return;
  round = [...round, bonusCard];
  roundIndex = round.length - 1; // roundIndex was already one past the old last card
  showCard();
}

// --- Wiring ------------------------------------------------------------

verdictABtn.addEventListener("click", () => void pickVerdict("verdictA"));
verdictBBtn.addEventListener("click", () => void pickVerdict("verdictB"));
revealOtherBtn.addEventListener("click", () => void revealOther());
nextBtn.addEventListener("click", nextCard);
bonusBtn.addEventListener("click", () => void extendRoundWithBonusCard());
againBtn.addEventListener("click", () => void startRound());

shareBtn.addEventListener("click", async () => {
  const text = shareBtn.dataset.shareText || `Смена окончена: ${history.length} вердиктов.`;
  shell.shareScore(history.length, { kind: "judgment-loop-round", text });
  const shareUrl = new URL(window.location.href);
  shareUrl.searchParams.set("summary", text);
  await navigator.clipboard.writeText(shareUrl.toString()).catch(() => {});
  shareBtn.textContent = "Скопировано!";
  setTimeout(() => (shareBtn.textContent = "Поделиться сменой"), 1500);
});

// --- Boot ----------------------------------------------------------------

async function boot(): Promise<void> {
  progress = await loadProgress();
  renderThemePicker(new Set()); // no owned Stars themes yet — purchase flow is stubbed
  console.info("[judgment-loop] telegram user id:", getTelegramUserId() ?? "(none — browser preview)");
  await startRound();
}

void boot();

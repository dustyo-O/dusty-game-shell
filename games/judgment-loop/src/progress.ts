import { storage } from "./telegram.js";

const SEEN_KEY = "judgment-loop:seenCardIds";
const TOTAL_KEY = "judgment-loop:totalVerdicts";

export interface Progress {
  seenCardIds: string[];
  totalVerdicts: number;
}

export async function loadProgress(): Promise<Progress> {
  const [seenRaw, totalRaw] = await Promise.all([storage.get(SEEN_KEY), storage.get(TOTAL_KEY)]);
  let seenCardIds: string[] = [];
  try {
    seenCardIds = seenRaw ? (JSON.parse(seenRaw) as string[]) : [];
  } catch {
    seenCardIds = [];
  }
  return { seenCardIds, totalVerdicts: totalRaw ? Number(totalRaw) || 0 : 0 };
}

export async function markSeen(progress: Progress, cardId: string): Promise<void> {
  if (!progress.seenCardIds.includes(cardId)) progress.seenCardIds.push(cardId);
  await storage.set(SEEN_KEY, JSON.stringify(progress.seenCardIds));
}

export async function recordVerdict(progress: Progress): Promise<void> {
  progress.totalVerdicts += 1;
  await storage.set(TOTAL_KEY, String(progress.totalVerdicts));
}

export async function resetSeen(progress: Progress): Promise<void> {
  progress.seenCardIds = [];
  await storage.set(SEEN_KEY, JSON.stringify(progress.seenCardIds));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Draws `count` cards, deduped against `seenCardIds` until the pool is
 * exhausted, then reshuffles (per GDD §4). Never blocks on pool size —
 * if the whole deck is smaller than `count`, it just repeats after reshuffle.
 */
export async function drawRound<T extends { id: string }>(
  allCards: T[],
  progress: Progress,
  count: number,
): Promise<T[]> {
  const drawn: T[] = [];
  let pool = shuffle(allCards.filter((c) => !progress.seenCardIds.includes(c.id)));

  while (drawn.length < count) {
    if (pool.length === 0) {
      await resetSeen(progress);
      pool = shuffle(allCards.filter((c) => !drawn.some((d) => d.id === c.id)));
      if (pool.length === 0) break; // fewer cards than `count` total — avoid an infinite loop
    }
    const next = pool.shift()!;
    drawn.push(next);
  }

  return drawn;
}

export * from "./leaderboard.js";
export * from "./share.js";
export * from "./auth.js";
export * from "./analytics.js";

import { LocalLeaderboardProvider, type LeaderboardProvider } from "./leaderboard.js";
import { AnonymousAuthProvider, type AuthProvider } from "./auth.js";
import { Analytics, ConsoleAnalyticsSink, type AnalyticsSink } from "./analytics.js";
import { buildShareUrl, parseShareUrl, type ShareData } from "./share.js";

export interface GameShellConfig {
  gameId: string;
  leaderboard?: LeaderboardProvider;
  auth?: AuthProvider;
  analyticsSinks?: AnalyticsSink[];
}

/**
 * One call wires up every shell feature for a game with sane, zero-infra
 * defaults. Swap in real providers later by passing them in — every
 * downstream call site keeps working since it only depends on the
 * interfaces in leaderboard.ts / auth.ts / analytics.ts.
 */
export class GameShell {
  readonly gameId: string;
  readonly leaderboard: LeaderboardProvider;
  readonly auth: AuthProvider;
  readonly analytics: Analytics;

  constructor(config: GameShellConfig) {
    this.gameId = config.gameId;
    this.leaderboard = config.leaderboard ?? new LocalLeaderboardProvider();
    this.auth = config.auth ?? new AnonymousAuthProvider();
    this.analytics = new Analytics(config.analyticsSinks ?? [new ConsoleAnalyticsSink()]);
  }

  /** Call once on game load: fires the `play`/`return` analytics events. */
  recordPlay(): void {
    this.analytics.trackPlay(this.gameId);
  }

  /** Top scores for this game — shorthand for `leaderboard.top(gameId, limit)`. */
  async topScores(limit = 10): ReturnType<LeaderboardProvider["top"]> {
    return this.leaderboard.top(this.gameId, limit);
  }

  /** Submits a score under the current user's name and returns a "beat my run" link. */
  async submitScore(score: number): Promise<{ url: string; entry: Awaited<ReturnType<LeaderboardProvider["submit"]>> }> {
    const user = this.auth.current() ?? (await this.auth.signIn());
    const entry = await this.leaderboard.submit(this.gameId, { name: user.name, score });
    const url = buildShareUrl({ gameId: this.gameId, score, name: user.name });
    return { url, entry };
  }

  /** Reads a "beat my run" score out of the current page URL, if the player arrived via a share link. */
  readSharedScore(): ShareData | null {
    const data = parseShareUrl();
    return data && data.gameId === this.gameId ? data : null;
  }

  shareScore(score: number, extra: Record<string, unknown> = {}): void {
    this.analytics.trackShare(this.gameId, { score, ...extra });
  }
}

export function createGameShell(config: GameShellConfig): GameShell {
  return new GameShell(config);
}

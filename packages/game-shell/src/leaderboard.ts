export interface LeaderboardEntry {
  name: string;
  score: number;
  ts: number;
}

export interface LeaderboardProvider {
  submit(gameId: string, entry: { name: string; score: number }): Promise<LeaderboardEntry>;
  top(gameId: string, limit?: number): Promise<LeaderboardEntry[]>;
}

const STORAGE_PREFIX = "dusty:leaderboard:";

/**
 * Zero-infra default: scores live in this browser's localStorage, scoped per
 * gameId. Fine for a solo "beat my own run" leaderboard and for shipping a
 * game before a real backend exists. When a game needs a leaderboard shared
 * across players, implement `LeaderboardProvider` against a small serverless
 * backend (e.g. a Cloudflare Worker + KV/D1) and swap it in — every caller
 * only depends on the interface above.
 */
export class LocalLeaderboardProvider implements LeaderboardProvider {
  private readonly limit: number;

  constructor(options: { maxEntries?: number } = {}) {
    this.limit = options.maxEntries ?? 100;
  }

  async submit(gameId: string, entry: { name: string; score: number }): Promise<LeaderboardEntry> {
    const full: LeaderboardEntry = { name: entry.name, score: entry.score, ts: Date.now() };
    const entries = this.read(gameId);
    entries.push(full);
    entries.sort((a, b) => b.score - a.score);
    this.write(gameId, entries.slice(0, this.limit));
    return full;
  }

  async top(gameId: string, limit = 10): Promise<LeaderboardEntry[]> {
    return this.read(gameId).slice(0, limit);
  }

  private read(gameId: string): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + gameId);
      return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
    } catch {
      return [];
    }
  }

  private write(gameId: string, entries: LeaderboardEntry[]): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + gameId, JSON.stringify(entries));
    } catch {
      // storage unavailable (private browsing, quota) — fail silently, score just won't persist
    }
  }
}

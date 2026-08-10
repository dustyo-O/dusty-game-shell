export type AnalyticsEvent = "play" | "share" | "return" | (string & {});

export interface AnalyticsSink {
  track(event: AnalyticsEvent, props: Record<string, unknown>): void;
}

/** Default sink — visible in devtools, zero setup. Good enough until an analytics endpoint exists. */
export class ConsoleAnalyticsSink implements AnalyticsSink {
  track(event: AnalyticsEvent, props: Record<string, unknown>): void {
    console.info(`[analytics] ${event}`, props);
  }
}

/** Fire-and-forget sink for a real analytics endpoint once one exists (e.g. a Worker that appends to a log/DB). */
export class BeaconAnalyticsSink implements AnalyticsSink {
  constructor(private readonly endpoint: string) {}

  track(event: AnalyticsEvent, props: Record<string, unknown>): void {
    const payload = JSON.stringify({ event, props, ts: Date.now() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, new Blob([payload], { type: "application/json" }));
    } else {
      fetch(this.endpoint, { method: "POST", body: payload, keepalive: true }).catch(() => {});
    }
  }
}

const LAST_SEEN_PREFIX = "dusty:analytics:lastSeen:";

/**
 * Tracks the three metrics the studio cares about (plays, shares, return
 * visits) and forwards them to whatever sinks are configured. Call
 * `trackPlay` once per game load — it also detects and fires `return` when
 * this browser has played this game before.
 */
export class Analytics {
  private readonly sinks: AnalyticsSink[];

  constructor(sinks: AnalyticsSink[] = [new ConsoleAnalyticsSink()]) {
    this.sinks = sinks;
  }

  trackPlay(gameId: string): void {
    const key = LAST_SEEN_PREFIX + gameId;
    const lastSeen = this.readLastSeen(key);
    this.emit("play", { gameId });
    if (lastSeen !== null) {
      this.emit("return", { gameId, daysSinceLastPlay: (Date.now() - lastSeen) / 86_400_000 });
    }
    this.writeLastSeen(key);
  }

  trackShare(gameId: string, extra: Record<string, unknown> = {}): void {
    this.emit("share", { gameId, ...extra });
  }

  track(event: AnalyticsEvent, props: Record<string, unknown> = {}): void {
    this.emit(event, props);
  }

  private emit(event: AnalyticsEvent, props: Record<string, unknown>): void {
    for (const sink of this.sinks) sink.track(event, props);
  }

  private readLastSeen(key: string): number | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  }

  private writeLastSeen(key: string): void {
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {
      // ignore — return-visit detection just won't work this session
    }
  }
}

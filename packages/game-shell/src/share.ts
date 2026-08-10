export interface ShareData {
  gameId: string;
  score: number;
  name?: string;
}

const PARAM = "run";

function encode(data: ShareData): string {
  const json = JSON.stringify(data);
  // btoa is UTF-16 safe for the ASCII-ish payloads we encode here (game id, name, score).
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(token: string): ShareData | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    const data = JSON.parse(json) as Partial<ShareData>;
    if (typeof data.gameId !== "string" || typeof data.score !== "number") return null;
    return { gameId: data.gameId, score: data.score, name: data.name };
  } catch {
    return null;
  }
}

/** Builds a "beat my run" URL that encodes the score inline — no backend required to share or read it. */
export function buildShareUrl(data: ShareData, base: string = window.location.href): string {
  const url = new URL(base);
  url.searchParams.set(PARAM, encode(data));
  return url.toString();
}

/** Reads a shared score out of the current (or given) URL, if present. */
export function parseShareUrl(url: string = window.location.href): ShareData | null {
  const token = new URL(url).searchParams.get(PARAM);
  return token ? decode(token) : null;
}

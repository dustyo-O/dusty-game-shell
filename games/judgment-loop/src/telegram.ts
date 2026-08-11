// Thin wrapper around the Telegram Web App SDK (loaded via the <script> tag
// in index.html). No prior game in this repo actually wired this up — DUS-5
// shipped as a plain browser page — so this is new plumbing, not reused.
// Every call degrades to a browser-friendly fallback so `npm run dev` and
// GitHub Pages preview still work outside Telegram.

interface TelegramCloudStorage {
  getItem(key: string, cb: (err: string | null, value: string) => void): void;
  setItem(key: string, value: string, cb?: (err: string | null, ok: boolean) => void): void;
}

interface TelegramWebApp {
  initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string } };
  colorScheme?: "light" | "dark";
  themeParams?: Record<string, string>;
  CloudStorage?: TelegramCloudStorage;
  ready(): void;
  expand(): void;
  disableVerticalSwipes?(): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const webApp = window.Telegram?.WebApp ?? null;

export function initTelegram(): void {
  if (!webApp) return;
  webApp.ready();
  webApp.expand();
  webApp.disableVerticalSwipes?.();
  applyTheme();
}

function applyTheme(): void {
  const params = webApp?.themeParams;
  if (!params) return;
  const root = document.documentElement.style;
  if (params.bg_color) root.setProperty("--bg", `#${stripHash(params.bg_color)}`);
  if (params.text_color) root.setProperty("--ink", `#${stripHash(params.text_color)}`);
  if (params.hint_color) root.setProperty("--muted", `#${stripHash(params.hint_color)}`);
  if (params.button_color) root.setProperty("--accent", `#${stripHash(params.button_color)}`);
}

function stripHash(v: string): string {
  return v.replace(/^#/, "");
}

export function getTelegramUserId(): string | null {
  const user = webApp?.initDataUnsafe?.user;
  return user ? String(user.id) : null;
}

/**
 * `seenCardIds`/`totalVerdicts` persistence: Telegram CloudStorage in prod,
 * localStorage outside Telegram (dev/preview) — same interface either way.
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    const cloud = webApp?.CloudStorage;
    if (!cloud) return localStorage.getItem(key);
    // Older Telegram client versions (and the SDK's own out-of-app stub)
    // expose a CloudStorage object whose calls throw/reject with
    // WebAppMethodUnsupported instead of failing gracefully — always fall
    // back to localStorage rather than trusting the existence check alone.
    try {
      return await new Promise((resolve, reject) => {
        try {
          cloud.getItem(key, (err, value) => (err ? reject(new Error(err)) : resolve(value || null)));
        } catch (err) {
          reject(err);
        }
      });
    } catch {
      return localStorage.getItem(key);
    }
  },
  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value); // always keep a local fallback in sync
    const cloud = webApp?.CloudStorage;
    if (!cloud) return;
    try {
      await new Promise<void>((resolve, reject) => {
        try {
          cloud.setItem(key, value, (err, ok) => (err || !ok ? reject(new Error(err ?? "not ok")) : resolve()));
        } catch (err) {
          reject(err);
        }
      });
    } catch {
      // CloudStorage unsupported/unavailable — localStorage write above already covers this session.
    }
  },
};

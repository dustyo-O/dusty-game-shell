export interface AuthUser {
  id: string;
  name: string;
  provider: "anonymous" | "discord";
}

export interface AuthProvider {
  current(): AuthUser | null;
  signIn(): Promise<AuthUser>;
  signOut(): void;
}

const STORAGE_KEY = "dusty:auth:anonymous";

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Default auth: a stable per-browser identity with an editable display name,
 * good enough to attribute leaderboard entries without any login flow.
 * Every community game should depend on `AuthProvider`, not this class, so
 * swapping in real Discord OAuth later (see `DiscordAuthProvider`) is a
 * one-line change at the call site.
 */
export class AnonymousAuthProvider implements AuthProvider {
  current(): AuthUser {
    const stored = this.read();
    if (stored) return stored;
    const user: AuthUser = { id: randomId(), name: `Guest-${randomId().slice(0, 4)}`, provider: "anonymous" };
    this.write(user);
    return user;
  }

  async signIn(): Promise<AuthUser> {
    return this.current();
  }

  setName(name: string): AuthUser {
    const user = { ...this.current(), name };
    this.write(user);
    return user;
  }

  signOut(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private read(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  private write(user: AuthUser): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // storage unavailable — identity just won't persist across reloads
    }
  }
}

/**
 * Pluggable stub for Discord login. Not wired to real OAuth yet — call this
 * out to the Chief of Staff/CEO before flipping it on, since it needs a
 * Discord app + redirect URL registered for the target community's server.
 * Implement `signIn()` with Discord's OAuth2 implicit/PKCE flow and this
 * becomes a drop-in replacement for `AnonymousAuthProvider` everywhere.
 */
export class DiscordAuthProvider implements AuthProvider {
  current(): AuthUser | null {
    return null;
  }

  async signIn(): Promise<AuthUser> {
    throw new Error(
      "DiscordAuthProvider is a stub — wire up Discord OAuth (client id, redirect URL) before using it."
    );
  }

  signOut(): void {
    // no-op until real auth exists
  }
}

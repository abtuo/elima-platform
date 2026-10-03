import type { StoredAuthSession } from "@elima/auth";

export type IdentityTokens = { access_token: string; refresh_token?: string; expires_in?: number; expires_at?: number };
export type IdentitySession<P> = StoredAuthSession<P> & { bridgePending?: boolean };

/** Serialized across restore/refresh/logout, independent of React and storage runtime. */
export function createIdentitySessionLifecycle<P, L>(dependencies: {
  read: () => Promise<IdentitySession<P> | null>;
  write: (session: IdentitySession<P>) => Promise<void>;
  clear: () => Promise<void>;
  refresh: (refreshToken: string) => Promise<IdentityTokens | null>;
  bridge: (accessToken: string) => Promise<P | null>;
  localSession: () => Promise<L | null>;
  clearLocal: () => Promise<void>;
  revoke: (accessToken: string) => Promise<void>;
  now?: () => number;
}) {
  const now = dependencies.now ?? Date.now;
  let queue: Promise<unknown> = Promise.resolve();
  function exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const pending = queue.then(operation, operation);
    queue = pending.catch(() => undefined);
    return pending;
  }
  async function clearBoth() {
    // Attempt both removals even if one storage/backend operation fails.
    const results = await Promise.allSettled([dependencies.clear(), dependencies.clearLocal()]);
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }
  function fromTokens(tokens: IdentityTokens, profile: P | null = null): IdentitySession<P> {
    return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_at ? tokens.expires_at * 1000 : now() + (tokens.expires_in ?? 3600) * 1000,
      profile, bridgePending: true };
  }
  async function ensureBridge(session: IdentitySession<P>) {
    let local = await dependencies.localSession();
    if (session.bridgePending || !local) {
      session.profile = await dependencies.bridge(session.accessToken);
      session.bridgePending = false;
      await dependencies.write(session);
      local = await dependencies.localSession();
      if (!local) throw new Error("La session Révision est momentanément indisponible.");
    }
    return { identity: session, local };
  }
  return {
    accept: (tokens: IdentityTokens) => exclusive(async () => {
      const session = fromTokens(tokens);
      await dependencies.write(session);
      return ensureBridge(session);
    }),
    restore: () => exclusive(async () => {
      let session = await dependencies.read();
      if (!session) { await clearBoth(); return null; }
      if (session.expiresAt <= now() + 30_000) {
        if (!session.refreshToken) { await clearBoth(); return null; }
        // null means definitively invalid; transient failures throw without deleting tokens.
        const tokens = await dependencies.refresh(session.refreshToken);
        if (!tokens) { await clearBoth(); return null; }
        session = fromTokens(tokens, session.profile);
        // Persist rotated refresh token BEFORE bridge, allowing retry if bridge is unavailable.
        await dependencies.write(session);
      }
      return ensureBridge(session);
    }),
    logout: () => exclusive(async () => {
      let session: IdentitySession<P> | null = null;
      try { session = await dependencies.read(); }
      finally { await clearBoth(); }
      if (session) await dependencies.revoke(session.accessToken).catch(() => undefined);
    }),
  };
}

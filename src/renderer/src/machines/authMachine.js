import { assign, setup, fromPromise } from "xstate";
import { login, logout, refreshTokens } from "../api/authApi.js";

// ── localStorage key constants ────────────────────────────────────────────────
const KEYS = {
  access:  "auth_access_token",
  refresh: "auth_refresh_token",
  user:    "auth_user",
};

// ── Storage helpers ───────────────────────────────────────────────────────────
function persistTokens(accessToken, refreshToken, user) {
  try {
    localStorage.setItem(KEYS.access,  accessToken);
    localStorage.setItem(KEYS.refresh, refreshToken);
    localStorage.setItem(KEYS.user,    JSON.stringify(user));
  } catch (e) {
    console.warn("[auth] Failed to persist tokens", e);
  }
}

function clearPersistedTokens() {
  try {
    localStorage.removeItem(KEYS.access);
    localStorage.removeItem(KEYS.refresh);
    localStorage.removeItem(KEYS.user);
  } catch (e) {
    console.warn("[auth] Failed to clear tokens", e);
  }
}

function readPersistedSession() {
  const accessToken  = localStorage.getItem(KEYS.access);
  const refreshToken = localStorage.getItem(KEYS.refresh);
  const userRaw      = localStorage.getItem(KEYS.user);

  if (!accessToken || !refreshToken || !userRaw) {
    throw new Error("No session found");
  }

  return { accessToken, refreshToken, user: JSON.parse(userRaw) };
}

// ── Machine ───────────────────────────────────────────────────────────────────
export const authMachine = setup({
  actions: {
    setSession: assign({
      user:         ({ event }) => event.output.user,
      accessToken:  ({ event }) => event.output.accessToken,
      refreshToken: ({ event }) => event.output.refreshToken,
      error:        null,
    }),

    setLoginResult: assign({
      user:         ({ event }) => event.output.user,
      accessToken:  ({ event }) => event.output.accessToken,
      refreshToken: ({ event }) => event.output.refreshToken,
      error:        null,
    }),

    persistSession: ({ event }) => {
      persistTokens(
        event.output.accessToken,
        event.output.refreshToken,
        event.output.user,
      );
    },

    setRefreshedTokens: assign({
      accessToken:  ({ event }) => event.output.accessToken,
      refreshToken: ({ event }) => event.output.refreshToken,
    }),

    persistRefreshedTokens: ({ event }) => {
      const userRaw = localStorage.getItem(KEYS.user);
      const user    = userRaw ? JSON.parse(userRaw) : null;
      persistTokens(event.output.accessToken, event.output.refreshToken, user);
    },

    clearSession: assign({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      error:        null,
    }),

    clearPersistedSession: () => {
      clearPersistedTokens();
    },

    setError: assign({
      error: ({ event }) => event.error?.message ?? String(event.error ?? "Unknown error"),
    }),

    clearError: assign({ error: null }),
  },

  actors: {
    checkSession: fromPromise(async () => {
      return readPersistedSession(); // throws if nothing stored
    }),

    performLogin: fromPromise(async ({ input }) => {
      return await login({ email: input.email, password: input.password });
    }),

    performRefresh: fromPromise(async ({ input }) => {
      if (!input.refreshToken) throw new Error("No refresh token available");
      return await refreshTokens(input.refreshToken);
    }),

    performLogout: fromPromise(async () => {
      await logout();
    }),
  },
}).createMachine({
  id:      "auth",
  initial: "checkingSession",

  context: {
    user:         null,
    accessToken:  null,
    refreshToken: null,
    error:        null,
  },

  states: {
    // ── Startup: read localStorage ────────────────────────────────────────
    checkingSession: {
      invoke: {
        src:     "checkSession",
        onDone:  { target: "authenticated", actions: "setSession" },
        onError: { target: "unauthenticated" },
      },
    },

    // ── No session: show login form ───────────────────────────────────────
    unauthenticated: {
      on: {
        LOGIN: { target: "loggingIn", actions: "clearError" },
      },
    },

    // ── Calling POST /auth/login ──────────────────────────────────────────
    loggingIn: {
      invoke: {
        src:   "performLogin",
        input: ({ event }) => ({ email: event.email, password: event.password }),
        onDone: {
          target:  "authenticated",
          actions: ["setLoginResult", "persistSession"],
        },
        onError: {
          target:  "unauthenticated",
          actions: "setError",
        },
      },
    },

    // ── Fully authenticated ───────────────────────────────────────────────
    authenticated: {
      on: {
        LOGOUT:        { target: "loggingOut" },
        TOKEN_EXPIRED: { target: "refreshing" },
      },
    },

    // ── Calling POST /auth/refresh ────────────────────────────────────────
    refreshing: {
      invoke: {
        src:   "performRefresh",
        input: ({ context }) => ({ refreshToken: context.refreshToken }),
        onDone: {
          target:  "authenticated",
          actions: ["setRefreshedTokens", "persistRefreshedTokens"],
        },
        onError: {
          // Refresh token expired/revoked — force re-login
          target:  "unauthenticated",
          actions: ["clearSession", "clearPersistedSession"],
        },
      },
    },

    // ── Calling POST /auth/logout ─────────────────────────────────────────
    loggingOut: {
      invoke: {
        src: "performLogout",
        onDone: {
          target:  "unauthenticated",
          actions: ["clearSession", "clearPersistedSession"],
        },
        onError: {
          // API failed but always log out locally
          target:  "unauthenticated",
          actions: ["clearSession", "clearPersistedSession"],
        },
      },
    },
  },
});

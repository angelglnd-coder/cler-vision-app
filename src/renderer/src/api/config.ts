import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { authActor, getAccessToken } from "../stores/authStore.js";

// electron-vite exposes env to the *renderer* with the prefix: RENDERER_VITE_*
const baseURL: string = import.meta.env.RENDERER_VITE_API_BASE || "http://127.0.0.1:4000/api";
const appEnv: string = import.meta.env.RENDERER_VITE_APP_ENV || "development";

// Log environment info in dev/staging only (not in production)
if (appEnv !== 'production') {
  console.log(`[Environment] Running in ${appEnv.toUpperCase()} mode`);
  console.log(`[Environment] API Base URL: ${baseURL}`);
}

const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 3000,
});

// ── Request interceptor: inject Bearer token ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ── 401 response interceptor: trigger token refresh and retry ─────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Guard: only handle 401s that haven't been retried yet, and never for the
    // refresh endpoint itself (would cause an infinite loop).
    const isRefreshEndpoint = orig.url?.includes("/auth/refresh");
    const isLoginEndpoint   = orig.url?.includes("/auth/login");
    if (error.response?.status === 401 && !orig._retry && !isRefreshEndpoint && !isLoginEndpoint) {
      orig._retry = true;

      if (isRefreshing) {
        // A refresh is already in-flight — queue this request until it resolves.
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          orig.headers["Authorization"] = `Bearer ${newToken}`;
          return api(orig);
        });
      }

      // First 401: delegate token refresh to the auth machine.
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        authActor.send({ type: "TOKEN_EXPIRED" });

        const sub = authActor.subscribe((snap) => {
          if (snap.matches("authenticated")) {
            const newToken = snap.context.accessToken!;
            processQueue(null, newToken);
            orig.headers["Authorization"] = `Bearer ${newToken}`;
            isRefreshing = false;
            sub.unsubscribe();
            resolve(api(orig));
          } else if (snap.matches("unauthenticated")) {
            processQueue(new Error("Session expired"), null);
            isRefreshing = false;
            sub.unsubscribe();
            reject(error);
          }
          // While in 'refreshing', keep listening.
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;

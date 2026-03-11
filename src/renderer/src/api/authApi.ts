import api from "./config";
import type { LoginCredentials, LoginResponse, RefreshResponse, AuthUser } from "$lib/types";

/** POST /api/auth/login */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>("/auth/login", credentials);
  return res.data;
}

/** POST /api/auth/logout — Authorization header injected by request interceptor. */
export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

/**
 * POST /api/auth/refresh
 * Called directly by the auth machine, NOT through the 401 interceptor retry path,
 * to avoid an infinite refresh loop.
 */
export async function refreshTokens(token: string): Promise<RefreshResponse> {
  const res = await api.post<RefreshResponse>("/auth/refresh", { refreshToken: token });
  return res.data;
}

/** GET /api/auth/me */
export async function getCurrentUser(): Promise<AuthUser> {
  const res = await api.get<AuthUser>("/auth/me");
  return res.data;
}

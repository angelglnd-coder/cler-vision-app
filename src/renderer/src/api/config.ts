import axios from "axios";
import type { AxiosInstance } from "axios";

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

export default api;

import axios from "axios";
import type { AxiosInstance } from "axios";
import { logger } from "@/utils/logger";

// electron-vite exposes env to the *renderer* with the prefix: RENDERER_VITE_*
const baseURL: string = import.meta.env.RENDERER_VITE_API_BASE || "http://127.0.0.1:4000/api";
const appEnv: string = import.meta.env.RENDERER_VITE_APP_ENV || "development";

// Log environment info in dev/staging only (automatically handled by logger)
logger.info(`Running in ${appEnv.toUpperCase()} mode`);
logger.info(`API Base URL: ${baseURL}`);

const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 3000,
});

export default api;

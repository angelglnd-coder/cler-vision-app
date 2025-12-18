import axios from "axios";
import type { AxiosInstance } from "axios";

// electron-vite exposes env to the *renderer* with the prefix: RENDERER_VITE_*
const baseURL: string = import.meta.env.RENDERER_VITE_API_BASE || "http://127.0.0.1:4000/api";

// Development debug log (commented out for production)
// console.log("AXIOS baseURL =>", baseURL);

const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 3000,
});

export default api;

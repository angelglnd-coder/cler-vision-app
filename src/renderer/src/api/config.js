import axios from "axios";
// electron-vite exposes env to the *renderer* with the prefix: RENDERER_VITE_*
const baseURL = import.meta.env.RENDERER_VITE_API_BASE || "http://127.0.0.1:4000/api";

// Development debug log (commented out for production)
// console.log("AXIOS baseURL =>", baseURL);

const api = axios.create({
  baseURL,
  timeout: 15000,
});

export default api;

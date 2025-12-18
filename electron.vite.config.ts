import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import pkg from "./package.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
  },
  renderer: {
    plugins: [svelte()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer/src"),
        $lib: resolve(__dirname, "src/renderer/src/lib"),
        lib: resolve(__dirname, "src/renderer/src/lib"),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
  },
});

import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
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
  },
});

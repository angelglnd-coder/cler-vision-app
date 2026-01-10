// electron.vite.config.mjs
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
var __electron_vite_injected_dirname = "C:\\Users\\Angel Galindo\\Documents\\repos\\cler-vision-app";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [svelte()],
    resolve: {
      alias: {
        "@": resolve(__electron_vite_injected_dirname, "src/renderer/src"),
        $lib: resolve(__electron_vite_injected_dirname, "src/renderer/src/lib"),
        lib: resolve(__electron_vite_injected_dirname, "src/renderer/src/lib")
      }
    }
  }
});
export {
  electron_vite_config_default as default
};

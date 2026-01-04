import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import type { AppSettings } from "../shared/types";

// Declare global __APP_VERSION__
declare const __APP_VERSION__: string;

// Custom APIs for renderer
const api = {
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (settings: Partial<AppSettings>): Promise<void> =>
      ipcRenderer.invoke('settings:update', settings),
    onChange: (callback: (settings: AppSettings) => void): (() => void) => {
      const subscription = (_event: IpcRendererEvent, settings: AppSettings) => callback(settings);
      ipcRenderer.on('settings:changed', subscription);
      // Return cleanup function
      return () => ipcRenderer.removeListener('settings:changed', subscription);
    }
  },
  app: {
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
    platform: process.platform
  }
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore - Adding to window in non-isolated context
  window.electron = electronAPI;
  // @ts-ignore - Adding to window in non-isolated context
  window.api = api;
}

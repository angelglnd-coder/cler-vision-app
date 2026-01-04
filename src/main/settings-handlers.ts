import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { saveSettings } from './settings';
import type { AppSettings } from '../shared/types';

// Store current settings in memory
let currentSettings: AppSettings | null = null;

/**
 * Initialize settings handlers
 * @param initialSettings - Initial settings loaded on app start
 */
export function initializeSettingsHandlers(initialSettings: AppSettings): void {
  currentSettings = initialSettings;

  // Handle settings:get requests
  ipcMain.handle('settings:get', (): AppSettings | null => {
    return currentSettings;
  });

  // Handle settings:update requests
  ipcMain.handle('settings:update', (_event: IpcMainInvokeEvent, newSettings: Partial<AppSettings>) => {
    if (!currentSettings) {
      return { success: false, error: 'Settings not initialized' };
    }

    // Merge with current settings
    const updatedSettings: AppSettings = {
      ...currentSettings,
      ...newSettings
    };

    // Save to disk
    const success = saveSettings(updatedSettings);

    if (success) {
      // Update in-memory settings
      currentSettings = updatedSettings;

      // Broadcast to all windows
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('settings:changed', updatedSettings);
      });

      return { success: true, settings: currentSettings };
    }

    return { success: false, error: 'Failed to save settings' };
  });
}

/**
 * Get current settings (for use in main process)
 * @returns Current settings
 */
export function getCurrentSettings(): AppSettings | null {
  return currentSettings;
}

/**
 * Update settings programmatically (for use in main process)
 * @param newSettings - New settings to apply
 */
export function updateSettings(newSettings: AppSettings): void {
  const success = saveSettings(newSettings);
  if (success) {
    currentSettings = newSettings;

    // Broadcast to all windows
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('settings:changed', newSettings);
    });
  }
}

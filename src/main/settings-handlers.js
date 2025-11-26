import { ipcMain, BrowserWindow } from 'electron';
import { loadSettings, saveSettings } from './settings.js';

// Store current settings in memory
let currentSettings = null;

/**
 * Initialize settings handlers
 * @param {object} initialSettings - Initial settings loaded on app start
 */
export function initializeSettingsHandlers(initialSettings) {
  currentSettings = initialSettings;

  // Handle settings:get requests
  ipcMain.handle('settings:get', () => {
    return currentSettings;
  });

  // Handle settings:update requests
  ipcMain.handle('settings:update', (event, newSettings) => {
    // Save to disk
    const success = saveSettings(newSettings);

    if (success) {
      // Update in-memory settings
      currentSettings = newSettings;

      // Broadcast to all windows
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('settings:changed', newSettings);
      });

      return { success: true, settings: currentSettings };
    }

    return { success: false, error: 'Failed to save settings' };
  });
}

/**
 * Get current settings (for use in main process)
 * @returns {object} Current settings
 */
export function getCurrentSettings() {
  return currentSettings;
}

/**
 * Update settings programmatically (for use in main process)
 * @param {object} newSettings - New settings to apply
 */
export function updateSettings(newSettings) {
  const success = saveSettings(newSettings);
  if (success) {
    currentSettings = newSettings;

    // Broadcast to all windows
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('settings:changed', newSettings);
    });
  }
}

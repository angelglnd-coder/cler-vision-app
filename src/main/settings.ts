import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { AppSettings } from '../shared/types';

const SETTINGS_FILE = 'settings.json';

/**
 * Get the path to the settings file
 * @returns Full path to settings.json
 */
function getSettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

/**
 * Get default settings
 * @returns Default settings object
 */
export function getDefaultSettings(): AppSettings {
  return {
    apiBaseUrl: 'http://localhost:4000/api',
    theme: 'auto',
    autoSave: true,
    printSettings: {
      paperSize: 'A4',
      orientation: 'portrait',
      includeLogo: true,
      includeBarcode: true
    },
    notifications: {
      enabled: true,
      soundEnabled: true,
      showOnComplete: true,
      showOnError: true
    },
    tray: {
      minimizeToTray: false,
      closeToTray: false,
      startMinimized: false,
      showNotifications: true
    }
  };
}

/**
 * Load settings from disk
 * @returns Settings object (falls back to defaults if file doesn't exist or is corrupted)
 */
export function loadSettings(): AppSettings {
  const settingsPath = getSettingsPath();

  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(data) as Partial<AppSettings>;

      // Merge with defaults to ensure all keys exist
      const defaults = getDefaultSettings();
      return {
        ...defaults,
        ...settings,
        printSettings: {
          ...defaults.printSettings,
          ...settings.printSettings
        },
        notifications: {
          ...defaults.notifications,
          ...settings.notifications
        },
        tray: {
          ...defaults.tray,
          ...settings.tray
        }
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('Failed to load settings, using defaults:', errorMessage);
  }

  // Return defaults if file doesn't exist or parsing failed
  return getDefaultSettings();
}

/**
 * Save settings to disk
 * @param settings - Settings object to save
 * @returns True if successful, false otherwise
 */
export function saveSettings(settings: AppSettings): boolean {
  const settingsPath = getSettingsPath();

  try {
    // Ensure the directory exists
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write settings atomically
    const data = JSON.stringify(settings, null, 2);
    fs.writeFileSync(settingsPath, data, 'utf8');

    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

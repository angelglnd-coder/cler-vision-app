import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const SETTINGS_FILE = 'settings.json';

/**
 * Get the path to the settings file
 * @returns {string} Full path to settings.json
 */
function getSettingsPath() {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

/**
 * Get default settings
 * @returns {object} Default settings object
 */
export function getDefaultSettings() {
  return {
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
 * @returns {object} Settings object (falls back to defaults if file doesn't exist or is corrupted)
 */
export function loadSettings() {
  const settingsPath = getSettingsPath();

  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(data);

      // Merge with defaults to ensure all keys exist
      const defaults = getDefaultSettings();
      return {
        tray: {
          ...defaults.tray,
          ...settings.tray
        }
      };
    }
  } catch (error) {
    console.warn('Failed to load settings, using defaults:', error.message);
  }

  // Return defaults if file doesn't exist or parsing failed
  return getDefaultSettings();
}

/**
 * Save settings to disk
 * @param {object} settings - Settings object to save
 * @returns {boolean} True if successful, false otherwise
 */
export function saveSettings(settings) {
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

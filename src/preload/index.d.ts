import { ElectronAPI } from '@electron-toolkit/preload'
import type { AppSettings } from '../shared/types'

/**
 * Settings API exposed to renderer process
 */
interface SettingsAPI {
  /**
   * Get current application settings
   */
  get: () => Promise<AppSettings>

  /**
   * Update application settings
   * @param settings - Partial settings object to update
   */
  update: (settings: Partial<AppSettings>) => Promise<void>

  /**
   * Subscribe to settings changes
   * @param callback - Function called when settings change
   * @returns Cleanup function to remove listener
   */
  onChange: (callback: (settings: AppSettings) => void) => () => void
}

/**
 * App info API exposed to renderer process
 */
interface AppAPI {
  /**
   * Application version string
   */
  version: string

  /**
   * Current platform (win32, darwin, linux, etc.)
   */
  platform: NodeJS.Platform
}

/**
 * Custom API exposed via contextBridge
 */
interface API {
  settings: SettingsAPI
  app: AppAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}

export {}

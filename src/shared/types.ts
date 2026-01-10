/**
 * Shared type definitions between main, preload, and renderer processes
 */

/**
 * Tray settings configuration
 */
export type TraySettings = {
  minimizeToTray: boolean;
  closeToTray: boolean;
  startMinimized: boolean;
  showNotifications: boolean;
};

/**
 * Print settings configuration
 */
export type PrintSettings = {
  paperSize: 'A4' | 'Letter' | 'Label';
  orientation: 'portrait' | 'landscape';
  includeLogo: boolean;
  includeBarcode: boolean;
};

/**
 * Notification settings configuration
 */
export type NotificationSettings = {
  enabled: boolean;
  soundEnabled: boolean;
  showOnComplete: boolean;
  showOnError: boolean;
};

/**
 * Application settings
 */
export type AppSettings = {
  apiBaseUrl: string;
  theme: 'light' | 'dark' | 'auto';
  autoSave: boolean;
  printSettings: PrintSettings;
  notifications: NotificationSettings;
  tray: TraySettings;
};

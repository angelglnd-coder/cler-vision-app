import { Tray, Menu, app, BrowserWindow } from 'electron';
import path from 'path';

let tray: Tray | null = null;

/**
 * Get the path to the tray icon
 * @returns {string} Path to icon file
 */
function getTrayIconPath() {
  // Check if running in development mode
  const isDev = !app.isPackaged;

  // Try to use .ico file first (best for Windows)
  const icoPath = isDev
    ? path.join(process.cwd(), 'build', 'icon.ico')
    : path.join(process.resourcesPath, 'icon.ico');

  // Fallback to .png if .ico doesn't exist
  const pngPath = isDev
    ? path.join(process.cwd(), 'resources', 'icon.png')
    : path.join(process.resourcesPath, 'icon.png');

  // In production, try ico first, then png
  // In dev, both should exist but ico is preferred for Windows
  try {
    return icoPath;
  } catch {
    return pngPath;
  }
}

/**
 * Show and focus the main window
 * @param {BrowserWindow} mainWindow - The main application window
 */
function showWindow(mainWindow) {
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

/**
 * Toggle window visibility
 * @param {BrowserWindow} mainWindow - The main application window
 */
function toggleWindow(mainWindow) {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showWindow(mainWindow);
  }
}

/**
 * Create the system tray icon
 * @param {BrowserWindow} mainWindow - The main application window
 * @param {object} settings - Current application settings
 * @returns {Tray} The created tray instance
 */
export function createTray(mainWindow: BrowserWindow, _settings?: any): Tray | null {
  // Only create tray on Windows
  if (process.platform !== 'win32') {
    console.log('Tray icon is only supported on Windows');
    return null;
  }

  try {
    const iconPath = getTrayIconPath();
    tray = new Tray(iconPath);

    // Set tooltip
    tray.setToolTip('clerVisionApp');

    // Create context menu
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show clerVisionApp',
        click: () => showWindow(mainWindow)
      },
      {
        type: 'separator'
      },
      {
        label: 'Preferences',
        click: () => {
          showWindow(mainWindow);
          // Navigate to preferences page
          mainWindow.webContents.send('navigate-to', '/preferences');
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);

    // Set context menu (right-click)
    tray.setContextMenu(contextMenu);

    // Handle left-click - toggle window visibility
    tray.on('click', () => {
      toggleWindow(mainWindow);
    });

    console.log('Tray icon created successfully');
    return tray;
  } catch (error) {
    console.error('Failed to create tray icon:', error);
    return null;
  }
}

/**
 * Update tray menu with new settings
 * @param {BrowserWindow} mainWindow - The main application window
 * @param {object} settings - Updated application settings
 */
export function updateTrayMenu(mainWindow: BrowserWindow, _settings?: any): void {
  if (!tray) return;

  // Recreate context menu with updated settings if needed
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show clerVisionApp',
      click: () => showWindow(mainWindow)
    },
    {
      type: 'separator'
    },
    {
      label: 'Preferences',
      click: () => {
        showWindow(mainWindow);
        mainWindow.webContents.send('navigate-to', '/preferences');
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Get the tray instance
 * @returns {Tray|null} The tray instance or null if not created
 */
export function getTray() {
  return tray;
}

/**
 * Destroy the tray icon
 */
export function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

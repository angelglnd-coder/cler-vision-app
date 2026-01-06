import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, dialog } from 'electron';
import log from 'electron-log';

// Configure logging
autoUpdater.logger = log;
log.transports.file.level = 'info';

export function initializeAutoUpdater(mainWindow: BrowserWindow): void {
  // Don't check for updates in development
  if (!app.isPackaged) {
    log.info('[Updater] Development mode - auto-update disabled');
    return;
  }

  log.info('[Updater] Initializing auto-updater');

  // Configure auto-updater
  autoUpdater.autoDownload = false;  // Ask user before downloading
  autoUpdater.autoInstallOnAppQuit = true;

  // Event: Update available
  autoUpdater.on('update-available', (info) => {
    log.info('[Updater] Update available:', info.version);

    // Ask user if they want to download
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Would you like to download it now?`,
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        log.info('[Updater] User chose to download update');
        autoUpdater.downloadUpdate();

        // Show progress window
        mainWindow.webContents.send('update-download-started', info);
      } else {
        log.info('[Updater] User postponed update');
      }
    });
  });

  // Event: No update available
  autoUpdater.on('update-not-available', (info) => {
    log.info('[Updater] No updates available. Current version:', info.version);
  });

  // Event: Download progress
  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`[Updater] Download progress: ${progressObj.percent}%`);

    // Send progress to renderer
    mainWindow.webContents.send('update-download-progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond
    });
  });

  // Event: Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    log.info('[Updater] Update downloaded:', info.version);

    // Ask user if they want to install now
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded. Would you like to restart and install now?`,
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        log.info('[Updater] User chose to install update');
        autoUpdater.quitAndInstall(false, true);
      } else {
        log.info('[Updater] User postponed installation');
        mainWindow.webContents.send('update-ready-later');
      }
    });
  });

  // Event: Error
  autoUpdater.on('error', (err) => {
    log.error('[Updater] Error:', err);

    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Update Error',
      message: 'An error occurred while checking for updates.',
      detail: err.message
    });
  });

  // Check for updates on startup (after a small delay)
  setTimeout(() => {
    log.info('[Updater] Checking for updates...');
    autoUpdater.checkForUpdates();
  }, 3000);
}

export function checkForUpdatesManually(mainWindow: BrowserWindow): void {
  if (!app.isPackaged) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Development Mode',
      message: 'Auto-update is disabled in development mode.'
    });
    return;
  }

  autoUpdater.checkForUpdates();
}

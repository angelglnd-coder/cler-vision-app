import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import icon from "../../resources/icon.png?asset";
import { loadSettings } from "./settings.js";
import { initializeSettingsHandlers, getCurrentSettings } from "./settings-handlers.js";
import { createTray, getTray } from "./tray.js";
import { initializeAutoUpdater } from "./updater.js";

let mainWindow;
let isQuitting = false;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    const settings = getCurrentSettings();

    // Only show window if not set to start minimized
    if (!settings || !settings.tray.startMinimized) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Handle window close event
  mainWindow.on("close", (event) => {
    const settings = getCurrentSettings();

    if (!isQuitting && settings && settings.tray.closeToTray && process.platform === "win32") {
      event.preventDefault();
      mainWindow.hide();

      // Show notification if enabled (Windows only)
      if (settings.tray.showNotifications && process.platform === 'win32') {
        const tray = getTray();
        if (tray && 'displayBalloon' in tray) {
          tray.displayBalloon({
            title: "clerVisionApp",
            content: "Application minimized to tray"
          });
        }
      }
    }
  });

  // Handle window minimize event
  mainWindow.on("minimize", (event) => {
    const settings = getCurrentSettings();

    if (settings && settings.tray.minimizeToTray && process.platform === "win32") {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  app.setAppUserModelId("com.clervision.app");

  // Load settings and initialize handlers
  const settings = loadSettings();
  initializeSettingsHandlers(settings);

  // IPC test
  ipcMain.on("ping", () => console.log("pong"));

  // Create main window
  createWindow();

  // Initialize tray (Windows only)
  if (process.platform === "win32") {
    createTray(mainWindow, settings);
  }

  // Initialize auto-updater
  initializeAutoUpdater(mainWindow);

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Set isQuitting flag before app quits
app.on("before-quit", () => {
  isQuitting = true;
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

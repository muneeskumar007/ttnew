/**
 * Electron Main Process
 * Manages desktop window lifecycle, security boundaries, and IPC handlers for
 * independent SQLite database and local file storage.
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { initSqliteDatabase, loadWorkspace, saveWorkspace, clearWorkspace, getDatabaseStatus } = require('./sqliteService.cjs');
const { initFileStorage, saveLocalFile, getLocalFile, listLocalFiles, deleteLocalFile, saveSetting, getSetting, getStoragePaths } = require('./fileStorage.cjs');

// Single instance lock to prevent duplicate conflicting database access
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      const userDataDir = app.getPath('userData');
      console.log(`[Main] Application UserData directory: ${userDataDir}`);

      // 1. Initialize SQLite Database & Local File Storage
      await initSqliteDatabase(userDataDir);
      initFileStorage(userDataDir);

      // 2. Register Secure IPC Handlers
      registerIpcHandlers(userDataDir);

      // 3. Create Main Desktop Window
      createMainWindow();
    } catch (err) {
      console.error('[Main] Initialization failed:', err);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'ACE Timetable',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: false, // Show once ready-to-show to prevent visual flicker
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else if (devServerUrl) {
      mainWindow.loadURL(devServerUrl);
    } else {
      mainWindow.loadURL('http://127.0.0.1:5173');
    }
  }
}

function registerIpcHandlers(userDataDir) {
  // --- SQLite Database IPC Handlers ---
  ipcMain.handle('db:loadState', async (_event, workspaceId) => {
    return loadWorkspace(workspaceId || 'default_workspace');
  });

  ipcMain.handle('db:saveState', async (_event, { payload, workspaceId }) => {
    return saveWorkspace(payload, workspaceId || 'default_workspace');
  });

  ipcMain.handle('db:clearState', async (_event, workspaceId) => {
    return clearWorkspace(workspaceId || 'default_workspace');
  });

  ipcMain.handle('db:getStatus', async () => {
    return getDatabaseStatus();
  });

  // --- Local File Storage IPC Handlers ---
  ipcMain.handle('storage:saveFile', async (_event, fileData) => {
    return saveLocalFile(fileData);
  });

  ipcMain.handle('storage:getFile', async (_event, filename) => {
    return getLocalFile(filename);
  });

  ipcMain.handle('storage:listFiles', async () => {
    return listLocalFiles();
  });

  ipcMain.handle('storage:deleteFile', async (_event, filename) => {
    return deleteLocalFile(filename);
  });

  ipcMain.handle('storage:saveSetting', async (_event, { key, value }) => {
    return saveSetting(key, value);
  });

  ipcMain.handle('storage:getSetting', async (_event, key) => {
    return getSetting(key);
  });

  ipcMain.handle('storage:getPaths', async () => {
    return getStoragePaths();
  });

  // --- App Info IPC Handlers ---
  ipcMain.handle('app:getInfo', async () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      userDataDir,
      isPackaged: app.isPackaged,
      platform: process.platform,
    };
  });

  ipcMain.handle('app:openUserDataFolder', async () => {
    await shell.openPath(userDataDir);
    return { success: true };
  });
}

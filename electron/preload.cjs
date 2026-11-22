/**
 * Electron Preload Script
 * Secure IPC Bridge between React Renderer and Electron Main Process.
 * Enforces strict context isolation with zero unrestricted Node.js exposure.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // Local SQLite Database Operations
  database: {
    loadState: (workspaceId) => ipcRenderer.invoke('db:loadState', workspaceId),
    saveState: (payload, workspaceId) => ipcRenderer.invoke('db:saveState', { payload, workspaceId }),
    clearState: (workspaceId) => ipcRenderer.invoke('db:clearState', workspaceId),
    getStatus: () => ipcRenderer.invoke('db:getStatus'),
  },

  // Local File & Document Storage Operations
  storage: {
    saveFile: (fileData) => ipcRenderer.invoke('storage:saveFile', fileData),
    getFile: (filename) => ipcRenderer.invoke('storage:getFile', filename),
    listFiles: () => ipcRenderer.invoke('storage:listFiles'),
    deleteFile: (filename) => ipcRenderer.invoke('storage:deleteFile', filename),
    saveSetting: (key, value) => ipcRenderer.invoke('storage:saveSetting', { key, value }),
    getSetting: (key) => ipcRenderer.invoke('storage:getSetting', key),
    getPaths: () => ipcRenderer.invoke('storage:getPaths'),
  },

  // Application Info & Utilities
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo'),
    openUserDataFolder: () => ipcRenderer.invoke('app:openUserDataFolder'),
  }
});

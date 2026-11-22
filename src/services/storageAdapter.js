/**
 * Unified Storage Adapter
 * Automatically routes data persistence:
 *  - In Desktop Application (Electron): Uses independent local SQLite database & local storage.
 *  - In Web Application (Netlify): Preserves 100% of existing Firebase Cloud Firestore functionality.
 */

import {
  persistState as persistToFirebase,
  loadPersistedState as loadFromFirebase,
  clearPersistedState as clearInFirebase,
  checkFirebaseStatus,
  getFirebaseConfig,
  updateFirebaseConfig,
} from './firebase';

/**
 * Checks if running inside the Electron Desktop environment.
 */
export const isElectron = () => {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
};

/**
 * Unified load state:
 * - Electron: Reads from local SQLite (userData/database.sqlite)
 * - Web: Reads from Firebase Cloud Firestore
 */
export const loadPersistedState = async () => {
  if (isElectron()) {
    try {
      const res = await window.electronAPI.database.loadState();
      return {
        ...res,
        storageType: 'sqlite',
        message: 'Loaded from local SQLite database (independent to this PC)'
      };
    } catch (err) {
      console.error('[StorageAdapter] SQLite load error:', err);
      return {
        data: null,
        status: 'error',
        storageType: 'sqlite',
        error: err.message
      };
    }
  }

  // Web fallback (Netlify): 100% untouched Firebase Cloud Firestore
  const res = await loadFromFirebase();
  return {
    ...res,
    storageType: 'firebase'
  };
};

/**
 * Unified persist state:
 * - Electron: Saves to local SQLite database (never uploads to Firebase)
 * - Web: Saves to Firebase Cloud Firestore
 */
export const persistState = async (state) => {
  if (isElectron()) {
    try {
      const res = await window.electronAPI.database.saveState(state);
      return {
        ...res,
        storageType: 'sqlite',
        message: 'Saved directly to local SQLite database'
      };
    } catch (err) {
      console.error('[StorageAdapter] SQLite save error:', err);
      return {
        success: false,
        status: 'error',
        storageType: 'sqlite',
        error: err.message
      };
    }
  }

  // Web fallback (Netlify): 100% untouched Firebase Cloud Firestore
  const res = await persistToFirebase(state);
  return {
    ...res,
    storageType: 'firebase'
  };
};

/**
 * Unified clear state:
 * - Electron: Deletes from local SQLite
 * - Web: Deletes from Firebase Cloud Firestore
 */
export const clearPersistedState = async () => {
  if (isElectron()) {
    try {
      const res = await window.electronAPI.database.clearState();
      return {
        ...res,
        storageType: 'sqlite'
      };
    } catch (err) {
      console.error('[StorageAdapter] SQLite clear error:', err);
      return {
        success: false,
        status: 'error',
        storageType: 'sqlite',
        error: err.message
      };
    }
  }

  const res = await clearInFirebase();
  return {
    ...res,
    storageType: 'firebase'
  };
};

/**
 * Returns diagnostic info about active storage backend.
 */
export const getStorageDiagnostics = async () => {
  if (isElectron()) {
    const dbStatus = await window.electronAPI.database.getStatus();
    const appInfo = await window.electronAPI.app.getInfo();
    return {
      storageType: 'sqlite',
      isDesktop: true,
      ok: dbStatus.ok,
      engine: dbStatus.engine,
      databasePath: dbStatus.path,
      sizeBytes: dbStatus.sizeBytes,
      userDataDir: appInfo.userDataDir,
      version: appInfo.version,
      platform: appInfo.platform
    };
  }

  const firebaseStatus = await checkFirebaseStatus();
  return {
    storageType: 'firebase',
    isDesktop: false,
    ok: firebaseStatus.ok,
    status: firebaseStatus.status,
    message: firebaseStatus.message
  };
};

// Re-export Firebase methods for web modal compatibility
export { getFirebaseConfig, updateFirebaseConfig, checkFirebaseStatus };

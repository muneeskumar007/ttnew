// Pure Online Firebase Cloud Firestore Client
// 100% Online Database Persistence for Project: hyoid-f67d0
// Strictly NO LocalStorage or Local Database used.

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBmff-MIHbbKTC6zSVuTrsp3FY0t-CWB8k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hyoid-f67d0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hyoid-f67d0",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hyoid-f67d0.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "794370439907",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:794370439907:web:f6e4afed129d5dcc69e3d6"
};

let activeFirebaseConfig = { ...DEFAULT_FIREBASE_CONFIG };

export const getFirebaseConfig = () => {
  return activeFirebaseConfig;
};

export const updateFirebaseConfig = (newConfig) => {
  activeFirebaseConfig = { ...activeFirebaseConfig, ...newConfig };
};

const getFirestoreDocumentUrl = (config) => {
  const projectId = config.projectId || DEFAULT_FIREBASE_CONFIG.projectId;
  const apiKey = config.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/timetable_workspaces/default_workspace?key=${apiKey}`;
};

/**
 * Checks the live online connection status with Google Cloud Firestore.
 */
export const checkFirebaseStatus = async () => {
  const config = getFirebaseConfig();
  if (!config.projectId || !config.apiKey) {
    return {
      ok: false,
      status: 'missing_config',
      message: 'Firebase Project ID or API Key missing.'
    };
  }

  const url = getFirestoreDocumentUrl(config);

  try {
    const res = await fetch(url, { method: 'GET' });

    if (res.ok) {
      return {
        ok: true,
        status: 'connected',
        message: 'Online Cloud Firestore Connected & Synced'
      };
    }

    if (res.status === 404) {
      // Document does not exist yet, but database is reachable and ready!
      return {
        ok: true,
        status: 'connected_empty',
        message: 'Online Cloud Firestore Connected (Ready for new data)'
      };
    }

    const errJson = await res.json().catch(() => ({}));
    const errMessage = errJson.error?.message || `HTTP ${res.status}`;

    if (errMessage.includes('has not been used') || errMessage.includes('disabled') || errMessage.includes('SERVICE_DISABLED')) {
      return {
        ok: false,
        status: 'firestore_not_created',
        message: 'Cloud Firestore is not activated yet for this Firebase project.',
        consoleUrl: `https://console.firebase.google.com/project/${config.projectId}/firestore`,
        details: 'Go to Firebase Console -> Build -> Firestore Database -> Click "Create Database" (select Start in test mode).'
      };
    }

    if (errMessage.includes('Missing or insufficient permissions') || res.status === 403) {
      return {
        ok: false,
        status: 'rules_blocked',
        message: 'Firestore security rules are blocking access.',
        consoleUrl: `https://console.firebase.google.com/project/${config.projectId}/firestore/rules`,
        details: 'In Firebase Console -> Firestore -> Rules tab, allow read and write in test mode.'
      };
    }

    return {
      ok: false,
      status: 'error',
      message: `Firebase Firestore error: ${errMessage}`
    };
  } catch (err) {
    return {
      ok: false,
      status: 'network_error',
      message: `Network error connecting to Firebase: ${err.message}`
    };
  }
};

/**
 * Persists the entire state directly to Firebase Cloud Firestore.
 * Strictly 100% online cloud persistence. No local storage used.
 */
export const persistState = async (state) => {
  const config = getFirebaseConfig();
  const url = getFirestoreDocumentUrl(config);

  try {
    const payload = {
      fields: {
        payloadJson: { stringValue: JSON.stringify(state) },
        lastUpdated: { stringValue: new Date().toISOString() },
        department: { stringValue: state.department || 'Engineering' }
      }
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const now = new Date().toISOString();
      return {
        success: true,
        status: 'synced',
        lastUpdated: now,
        message: 'Saved directly to Firebase Cloud Firestore'
      };
    }

    const errJson = await res.json().catch(() => ({}));
    const errMsg = errJson.error?.message || `HTTP ${res.status}`;

    return {
      success: false,
      status: 'error',
      error: errMsg,
      isSetupRequired: errMsg.includes('disabled') || errMsg.includes('has not been used')
    };
  } catch (err) {
    return {
      success: false,
      status: 'network_error',
      error: err.message
    };
  }
};

/**
 * Loads persisted timetable data strictly from Firebase Cloud Firestore online.
 * NO LocalStorage read or fallback.
 */
export const loadPersistedState = async () => {
  const config = getFirebaseConfig();
  const url = getFirestoreDocumentUrl(config);

  try {
    const res = await fetch(url, { method: 'GET' });

    if (res.ok) {
      const json = await res.json();
      if (json.fields?.payloadJson?.stringValue) {
        const parsed = JSON.parse(json.fields.payloadJson.stringValue);
        return {
          data: parsed,
          status: 'synced',
          lastUpdated: json.fields?.lastUpdated?.stringValue || new Date().toISOString(),
          message: 'Loaded from Firebase Cloud Firestore'
        };
      }
      return {
        data: null,
        status: 'empty',
        message: 'Workspace document is empty in Firebase.'
      };
    }

    if (res.status === 404) {
      // Normal empty state when starting completely fresh
      return {
        data: null,
        status: 'empty',
        message: 'No timetable document exists in Firebase yet. Ready for manual input.'
      };
    }

    const errJson = await res.json().catch(() => ({}));
    const errMsg = errJson.error?.message || `HTTP ${res.status}`;

    return {
      data: null,
      status: 'error',
      error: errMsg,
      isSetupRequired: errMsg.includes('disabled') || errMsg.includes('has not been used')
    };
  } catch (err) {
    return {
      data: null,
      status: 'network_error',
      error: err.message
    };
  }
};

/**
 * Clears or deletes the workspace document directly in Firebase Cloud Firestore online.
 */
export const clearPersistedState = async () => {
  const config = getFirebaseConfig();
  const url = getFirestoreDocumentUrl(config);

  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok || res.status === 404) {
      return { success: true, message: 'Cleared online Firebase Firestore workspace.' };
    }
  } catch (err) {
    console.error('Error clearing Firebase Firestore document:', err);
  }

  // Also overwrite with clean empty workspace in Firebase
  return persistState({
    department: 'Engineering & Technology',
    faculty: [],
    subjects: [],
    sections: [],
    allocations: {},
    prefixedSlots: {},
    timetables: {}
  });
};

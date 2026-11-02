// Firebase Client configured for Project hyoid-f67d0 with LocalStorage Persistence Fallback

const LOCAL_STORAGE_KEY = 'college_timetable_generator_clean_v2';
const FIREBASE_CONFIG_KEY = 'college_timetable_firebase_config_v1';

// User's Firebase Web Configuration for Project: hyoid-f67d0
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBmff-MIHbbKTC6zSVuTrsp3FY0t-CWB8k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hyoid-f67d0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hyoid-f67d0",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hyoid-f67d0.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "794370439907",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:794370439907:web:f6e4afed129d5dcc69e3d6"
};

export const getSavedFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to load custom Firebase config:', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
};

export const saveFirebaseConfig = (config) => {
  try {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving firebase config:', e);
  }
};

// Save state to LocalStorage and Firebase Firestore
export const persistState = async (state) => {
  // 1. Instant zero-latency LocalStorage persistence
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('LocalStorage save error:', e);
  }

  // 2. Synchronize to Firebase Firestore
  const config = getSavedFirebaseConfig();
  if (!config || !config.projectId) {
    return { success: true, mode: 'local' };
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/timetable_workspaces/default_workspace?key=${config.apiKey || ''}`;
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
      return { success: true, mode: 'firebase' };
    } else {
      const errJson = await res.json().catch(() => ({}));
      const errMsg = errJson.error?.message || `HTTP ${res.status}`;
      return { success: true, mode: 'local', warning: errMsg };
    }
  } catch (err) {
    return { success: true, mode: 'local', warning: err.message };
  }
};

// Load state with priority: Firebase Firestore -> LocalStorage
export const loadPersistedState = async () => {
  const config = getSavedFirebaseConfig();

  // Try Firebase Firestore
  if (config && config.projectId) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/timetable_workspaces/default_workspace?key=${config.apiKey || ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.fields?.payloadJson?.stringValue) {
          const parsed = JSON.parse(json.fields.payloadJson.stringValue);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          return { data: parsed, source: 'firebase' };
        }
      }
    } catch (err) {
      console.warn('Firebase Firestore load error, using local storage cache:', err.message);
    }
  }

  // Fallback to LocalStorage
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      return { data: JSON.parse(local), source: 'local' };
    }
  } catch (e) {
    console.error('Failed reading local storage:', e);
  }

  return { data: null, source: 'none' };
};

export const clearPersistedState = () => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing local storage:', e);
  }
};

// Firebase Client for Full Cloud Persistence across Reloads + LocalStorage Fallback

const LOCAL_STORAGE_KEY = 'college_timetable_generator_clean_v2';
const FIREBASE_CONFIG_KEY = 'college_timetable_firebase_config_v1';

// Default Firebase Configuration (can be updated dynamically via UI Settings)
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCollegeTimetableClientKey-Demo",
  authDomain: "college-timetable-generator.firebaseapp.com",
  projectId: "college-timetable-generator",
  storageBucket: "college-timetable-generator.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
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
        department: { stringValue: state.department || 'CSE' }
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
      // Firebase responded with non-200 (e.g. demo key or permissions), local storage is safe
      return { success: true, mode: 'local', warning: `Firebase HTTP ${res.status}` };
    }
  } catch (err) {
    // Network offline / blocked, fallback is active
    return { success: true, mode: 'local', warning: err.message };
  }
};

// Load state with priority: Firebase Firestore -> LocalStorage
export const loadPersistedState = async () => {
  const config = getSavedFirebaseConfig();

  // Try Firebase Firestore first if project is configured
  if (config && config.projectId && !config.apiKey?.includes('Demo')) {
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
      console.warn('Firebase sync offline, falling back to local storage:', err.message);
    }
  }

  // Load from LocalStorage
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

import React, { useState } from 'react';
import { X, Cloud, Database, Check, AlertCircle, Save } from 'lucide-react';
import { getSavedFirebaseConfig } from '../services/firebase';

export const FirebaseModal = ({ storageMode, lastSaved, onClose, onSaveConfig }) => {
  const currentConfig = getSavedFirebaseConfig();
  const [configJson, setConfigJson] = useState(JSON.stringify(currentConfig, null, 2));
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(configJson);
      if (!parsed.projectId) {
        throw new Error('Firebase config must include at least a "projectId".');
      }
      onSaveConfig(parsed);
      setError(null);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-base">Firebase Data Persistence</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-2 font-medium text-slate-800">
              {storageMode === 'firebase' ? (
                <>
                  <Cloud className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Firebase Cloud Active</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-800">Dual Persistence: LocalStorage + Cloud Ready</span>
                </>
              )}
            </div>
            <p>
              All changes are automatically persisted to LocalStorage on every action.
              To connect your own Firebase Firestore database for multi-device sync, paste your web config below.
            </p>
            {lastSaved && (
              <p className="text-[11px] text-slate-400 pt-1">
                Last synchronized: {new Date(lastSaved).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Firebase Project Configuration (JSON)
            </label>
            <textarea
              rows={8}
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-slate-900 text-emerald-300 rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              placeholder='{\n  "apiKey": "...",\n  "projectId": "..."\n}'
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
              <Check className="w-4 h-4 shrink-0" />
              <span>Configuration saved! Reloading connection...</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save & Connect</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

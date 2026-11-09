import React, { useState, useEffect } from 'react';
import { X, Cloud, Check, AlertCircle, Save, ExternalLink, RefreshCw, Database } from 'lucide-react';
import { getFirebaseConfig, updateFirebaseConfig, checkFirebaseStatus } from '../services/firebase';

export const FirebaseModal = ({
  syncStatus,
  lastSaved,
  onClose,
  onSaveConfig,
  onTriggerSync,
}) => {
  const currentConfig = getFirebaseConfig();
  const [configJson, setConfigJson] = useState(JSON.stringify(currentConfig, null, 2));
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [connectionCheck, setConnectionCheck] = useState(null);

  const testConnection = async () => {
    setIsChecking(true);
    setConnectionCheck(null);
    try {
      const result = await checkFirebaseStatus();
      setConnectionCheck(result);
    } catch (err) {
      setConnectionCheck({
        ok: false,
        status: 'error',
        message: err.message
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(configJson);
      if (!parsed.projectId) {
        throw new Error('Firebase configuration must include at least a "projectId".');
      }
      updateFirebaseConfig(parsed);
      onSaveConfig(parsed);
      setError(null);
      setSuccess(true);
      testConnection();
      setTimeout(() => {
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  const firestoreConsoleUrl = `https://console.firebase.google.com/project/${currentConfig.projectId || 'hyoid-f67d0'}/firestore`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Firebase Cloud Persistence</h3>
              <p className="text-[11px] text-slate-400">100% Online Cloud Database • No Local Storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Status Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Connection Status:</span>
                {connectionCheck?.ok ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online Cloud Connected
                  </span>
                ) : connectionCheck?.status === 'firestore_not_created' ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Firestore Database Setup Required
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Connecting / Pending Setup
                  </span>
                )}
              </div>

              <button
                onClick={testConnection}
                disabled={isChecking}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Test Link</span>
              </button>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              Every change you make (faculty, subjects, sections, schedules) is saved directly to your 
              Google Firebase Cloud Firestore online database: 
              <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded font-mono font-medium ml-1">
                projects/{currentConfig.projectId}/databases/(default)
              </code>.
            </p>

            {connectionCheck?.status === 'firestore_not_created' && (
              <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 space-y-1.5">
                <p className="font-semibold text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Cloud Firestore needs 1-click activation in Firebase Console:
                </p>
                <ol className="list-decimal list-inside text-[11px] space-y-1 text-amber-700 pl-1">
                  <li>Open your Firebase Console project using the link below.</li>
                  <li>Click <strong>Create database</strong> (choose location and select <strong>Start in test mode</strong>).</li>
                  <li>Come back and click <strong>Test Link</strong> above!</li>
                </ol>
                <a
                  href={firestoreConsoleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800 underline mt-1"
                >
                  <span>Open Firebase Console for {currentConfig.projectId}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {lastSaved && (
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                Last synchronized to Firebase: {new Date(lastSaved).toLocaleString()}
              </p>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
              Active Firebase Credentials
            </span>
            <a
              href={firestoreConsoleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <span>View Documents in Firebase Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Config JSON Area */}
          <div>
            <textarea
              rows={8}
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-slate-900 text-emerald-300 rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-inner"
              placeholder='{\n  "apiKey": "...",\n  "projectId": "..."\n}'
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Configuration is loaded automatically from <code className="text-slate-600 font-mono">.env</code>. You can also paste updated credentials above.
            </p>
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
              <span>Configuration updated! Testing connection...</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              onClick={onTriggerSync}
              className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
            >
              Force Sync Now
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Credentials</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

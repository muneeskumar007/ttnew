import React, { useState } from 'react';
import { 
  Calendar, 
  Cloud, 
  Trash2, 
  Settings, 
  Edit2, 
  Check, 
  RefreshCw,
  FolderOpen,
  CloudUpload,
  AlertTriangle
} from 'lucide-react';
import { FirebaseModal } from './FirebaseModal';

export const Navbar = ({
  department,
  setDepartment,
  syncStatus, // 'synced' | 'syncing' | 'error' | 'firestore_not_created' | 'idle'
  lastSaved,
  onClearAllData,
  onLoadDemoData,
  onSaveConfig,
  onTriggerSync,
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isEditingDept, setIsEditingDept] = useState(false);
  const [deptInput, setDeptInput] = useState(department);

  const handleSaveDept = (e) => {
    e.preventDefault();
    if (deptInput.trim()) {
      setDepartment(deptInput.trim());
    }
    setIsEditingDept(false);
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Department Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-inner shadow-indigo-400 shrink-0">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight text-white">
                  College Timetable Generator
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  SPA
                </span>
              </div>

              {isEditingDept ? (
                <form onSubmit={handleSaveDept} className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="text"
                    value={deptInput}
                    onChange={(e) => setDeptInput(e.target.value)}
                    autoFocus
                    placeholder="Enter Department Name"
                    className="text-xs px-2 py-0.5 bg-slate-800 border border-indigo-500 rounded text-white focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="p-1 text-emerald-400 hover:text-emerald-300"
                    title="Save department name"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 group">
                  <span>Department of {department || 'Engineering'}</span>
                  <button
                    onClick={() => {
                      setDeptInput(department);
                      setIsEditingDept(true);
                    }}
                    className="opacity-60 hover:opacity-100 text-slate-300 hover:text-indigo-400 transition-opacity p-0.5"
                    title="Click to rename department"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Persistence & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Storage Status Pill - 100% Online Firebase */}
            <div
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all bg-slate-800 hover:bg-slate-700 border border-slate-700 select-none"
              title="Click to inspect Firebase Cloud Firestore sync"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span className="text-indigo-300">Saving to Cloud...</span>
                </>
              ) : syncStatus === 'firestore_not_created' ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300">Firestore Setup Needed</span>
                </>
              ) : syncStatus === 'error' ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-300">Firebase Reconnecting</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Firebase Online</span>
                </>
              )}
              {lastSaved && (
                <span className="hidden sm:inline text-slate-400 text-[10px]">
                  ({new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
            </div>

            {/* Quick Force Sync Button */}
            <button
              onClick={onTriggerSync}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
              title="Save current changes to Firebase Cloud immediately"
            >
              <CloudUpload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Save Cloud</span>
            </button>

            {/* Clear All / Start Blank Button */}
            <button
              onClick={onClearAllData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl transition-colors"
              title="Clear all data in Cloud and start completely blank"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Clear All (Start Blank)</span>
              <span className="sm:hidden">Clear</span>
            </button>

            {/* Optional Load Sample Button */}
            <button
              onClick={onLoadDemoData}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-800/70 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
              title="Load sample CSE template for reference"
            >
              <FolderOpen className="w-3 h-3" />
              <span>Load Sample</span>
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2 text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
              title="Firebase & Cloud Storage Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {showConfigModal && (
        <FirebaseModal
          syncStatus={syncStatus}
          lastSaved={lastSaved}
          onClose={() => setShowConfigModal(false)}
          onSaveConfig={onSaveConfig}
          onTriggerSync={onTriggerSync}
        />
      )}
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { Database, FolderOpen, HardDrive, CheckCircle2, ShieldCheck, Info, X } from 'lucide-react';
import { getStorageDiagnostics } from '../services/storageAdapter';

export const DesktopStorageModal = ({ isOpen, onClose }) => {
  const [diagnostics, setDiagnostics] = useState(null);
  const [openedFolder, setOpenedFolder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getStorageDiagnostics().then(setDiagnostics);
      setOpenedFolder(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenFolder = async () => {
    if (window.electronAPI?.app?.openUserDataFolder) {
      await window.electronAPI.app.openUserDataFolder();
      setOpenedFolder(true);
      setTimeout(() => setOpenedFolder(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Local SQLite Database</h3>
              <p className="text-xs text-slate-400">Independent Windows Desktop Storage</p>
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
        <div className="p-6 space-y-4">
          {/* Status Alert */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-emerald-300">Standalone Windows Mode Active</p>
              <p className="text-emerald-400/80 mt-0.5">
                Every timetable update, faculty list, and setting is saved locally in an independent SQLite file on this computer. No data is sent to external servers.
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Database Engine:</span>
                </span>
                <span className="font-mono text-slate-200 font-medium">SQLite 3 (Binary Format)</span>
              </div>

              <div className="flex flex-col gap-1 text-slate-400 pt-1 border-t border-slate-700/40">
                <span>Database File Location:</span>
                <code className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg text-indigo-300 font-mono text-[11px] break-all select-all">
                  {diagnostics?.databasePath || 'Loading path...'}
                </code>
              </div>

              {diagnostics?.sizeBytes > 0 && (
                <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-700/40">
                  <span>File Size on Disk:</span>
                  <span className="font-mono text-slate-200">
                    {(diagnostics.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40 flex items-start gap-2.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Data Isolation Guarantee:</strong> Other computers running this software will never see or overwrite this computer&apos;s data. Updating or reinstalling the application will safely preserve this local database.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <span>{openedFolder ? 'Folder Opened!' : 'Open in File Explorer'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

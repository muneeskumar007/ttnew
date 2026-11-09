import React from 'react';
import { AlertTriangle, Trash2, RotateCcw, X, AlertCircle } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  details,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger', // 'danger' | 'warning' | 'primary'
  icon = 'trash', // 'trash' | 'revert' | 'warning'
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 pt-6 pb-2 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                confirmVariant === 'danger'
                  ? 'bg-rose-100 text-rose-600 border border-rose-200'
                  : confirmVariant === 'warning'
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
            >
              {icon === 'trash' ? (
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
              ) : icon === 'revert' ? (
                <RotateCcw className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Quick confirmation required</p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-3 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>

          {details && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px] leading-relaxed">
              {details}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all shadow-2xs"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all ${
              confirmVariant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 hover:scale-[1.02]'
                : confirmVariant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200 hover:scale-[1.02]'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:scale-[1.02]'
            }`}
          >
            {icon === 'trash' ? (
              <Trash2 className="w-3.5 h-3.5" />
            ) : icon === 'revert' ? (
              <RotateCcw className="w-3.5 h-3.5" />
            ) : null}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

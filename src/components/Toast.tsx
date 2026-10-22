import React from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-line-strong bg-surface/95 backdrop-blur-md shadow-xl text-xs text-ink"
          >
            <div className="flex items-center gap-2">
              {isSuccess && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
              {isError && <AlertCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />}
              {!isSuccess && !isError && <Info className="w-3.5 h-3.5 text-accent shrink-0" />}
              <span className="leading-snug">{toast.text}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-muted hover:text-ink-secondary transition-colors p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

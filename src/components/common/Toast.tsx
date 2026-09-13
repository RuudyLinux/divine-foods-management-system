import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: { type: ToastType; message: string; title?: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, message, title, duration = 4500 }: { type: ToastType; message: string; title?: string; duration?: number }) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setToasts(prev => [...prev, { id, type, message, title, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = (message: string, title?: string) => addToast({ type: 'success', message, title });
  const error = (message: string, title?: string) => addToast({ type: 'error', message, title });
  const warning = (message: string, title?: string) => addToast({ type: 'warning', message, title });
  const info = (message: string, title?: string) => addToast({ type: 'info', message, title });

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Info className="w-5 h-5 text-sky-600" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50/90 text-emerald-900';
      case 'error':
        return 'border-rose-200 bg-rose-50/90 text-rose-900';
      case 'warning':
        return 'border-amber-200 bg-amber-50/90 text-amber-900';
      default:
        return 'border-sky-200 bg-sky-50/90 text-sky-900';
    }
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}
      {/* Toast Render Portal */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2">
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 duration-200 ${getBorderColor(
              t.type
            )}`}
          >
            <div className="shrink-0 mt-0.5">{getIcon(t.type)}</div>
            <div className="flex-1 min-w-0">
              {t.title && <h5 className="text-xs font-bold mb-0.5">{t.title}</h5>}
              <p className="text-xs leading-relaxed opacity-95">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              type="button"
              aria-label="Close notification"
              className="p-1 rounded-md opacity-60 hover:opacity-100 focus:outline-hidden focus-ring transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// -------------------------------------------------------------------
// Context
// -------------------------------------------------------------------

const ToastContext = createContext<ToastContextType | null>(null);

let _globalAddToast: ToastContextType['addToast'] | null = null;

export function useToast() {
  const ctx = useContext(ToastContext);
  return {
    addToast: ctx?.addToast ?? _globalAddToast ?? (() => {}),
    removeToast: ctx?.removeToast ?? (() => {}),
    toasts: ctx?.toasts ?? [],
    toast: {
      success: (title: string, message?: string) =>
        (ctx?.addToast ?? _globalAddToast)?.({ type: 'success', title, message }),
      error: (title: string, message?: string) =>
        (ctx?.addToast ?? _globalAddToast)?.({ type: 'error', title, message }),
      warning: (title: string, message?: string) =>
        (ctx?.addToast ?? _globalAddToast)?.({ type: 'warning', title, message }),
      info: (title: string, message?: string) =>
        (ctx?.addToast ?? _globalAddToast)?.({ type: 'info', title, message }),
    },
  };
}

// -------------------------------------------------------------------
// Icons & styles per type
// -------------------------------------------------------------------

const typeConfig: Record<ToastType, { icon: typeof CheckCircle2; classes: string; iconColor: string }> = {
  success: {
    icon: CheckCircle2,
    classes: 'border-emerald-500/30 bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  error: {
    icon: AlertCircle,
    classes: 'border-red-500/30 bg-red-500/10',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-amber-500/30 bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  info: {
    icon: Info,
    classes: 'border-blue-500/30 bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
};

// -------------------------------------------------------------------
// Single toast item
// -------------------------------------------------------------------

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const config = typeConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    const duration = toast.duration ?? 5000;
    const exitTimer = setTimeout(() => setExiting(true), duration - 300);
    const removeTimer = setTimeout(() => onDismiss(toast.id), duration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 w-80 p-4 rounded-xl border backdrop-blur-lg shadow-lg transition-all duration-300 ${
        config.classes
      } ${exiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0 animate-slide-in-right'}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{toast.title}</p>
        {toast.message && <p className="text-xs text-zinc-400 mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// -------------------------------------------------------------------
// Provider & Container
// -------------------------------------------------------------------

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Expose globally
  useEffect(() => {
    _globalAddToast = addToast;
    return () => {
      _globalAddToast = null;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>

      {/* Keyframe injection (only once) */}
      <style>{`
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}

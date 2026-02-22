import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  message: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, options?: { action?: ToastAction; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, options?: { action?: ToastAction; duration?: number }) => {
      const id = crypto.randomUUID();
      const duration = options?.action ? undefined : (options?.duration ?? 5000);
      setToasts((prev) => [...prev, { id, message, action: options?.action, duration }]);
      if (duration !== undefined) {
        const timer = setTimeout(() => removeToast(id), duration);
        timers.current.set(id, timer);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex min-w-[280px] max-w-sm items-start gap-3 rounded-lg border border-washi-border bg-paper px-4 py-3 shadow-lg"
        >
          <span className="mt-0.5 text-vermilion">⚠</span>
          <p className="flex-1 text-sm text-ink">{toast.message}</p>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="shrink-0 text-sm text-vermilion underline hover:no-underline"
            >
              {toast.action.label}
            </button>
          )}
          <button
            aria-label="關閉通知"
            onClick={() => onRemove(toast.id)}
            className="shrink-0 text-ink-light hover:text-ink"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

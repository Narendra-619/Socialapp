import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from "react";

const ToastContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const addToast = useCallback((message, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    const timeoutId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timeoutsRef.current = timeoutsRef.current.filter(t => t !== timeoutId);
    }, duration);
    timeoutsRef.current.push(timeoutId);
  }, []);

  const toast = useMemo(() => ({
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
    info: (msg) => addToast(msg, "info"),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-enter pointer-events-auto max-w-sm w-full px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl flex items-center gap-3 ${
              t.type === "success"
                ? "bg-emerald-50/90 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300"
                : t.type === "error"
                ? "bg-red-50/90 dark:bg-red-950/90 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300"
                : "bg-blue-50/90 dark:bg-blue-950/90 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300"
            }`}
          >
            <div className="flex-shrink-0">
              {t.type === "success" && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              )}
              {t.type === "error" && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              )}
              {t.type === "info" && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
            </div>
            <p className="text-sm font-semibold">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

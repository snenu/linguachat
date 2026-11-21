"use client";

import { Check, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Tone = "success" | "info" | "error";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => undefined);

const ICON: Record<Tone, ReactNode> = {
  success: <Check size={14} strokeWidth={3} />,
  info: <Info size={14} strokeWidth={2.5} />,
  error: <X size={14} strokeWidth={3} />,
};

const DOT: Record<Tone, string> = {
  success: "bg-mint text-white",
  info: "bg-accent text-white",
  error: "bg-red text-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3500);
  }, []);
  const value = useMemo(() => push, [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="animate-pop-in pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-ink py-2.5 pr-5 pl-2.5 text-sm text-white shadow-lg"
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${DOT[t.tone]}`}>{ICON[t.tone]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

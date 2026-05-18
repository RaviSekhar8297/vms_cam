"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, X, Info } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export type Toast = {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
};

// Global toast state
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastList: Toast[] = [];

export function showToast(type: ToastType, title: string, message?: string) {
    const id = Math.random().toString(36).slice(2);
    toastList = [{ id, type, title, message }, ...toastList].slice(0, 5);
    toastListeners.forEach(fn => fn([...toastList]));
    setTimeout(() => {
        toastList = toastList.filter(t => t.id !== id);
        toastListeners.forEach(fn => fn([...toastList]));
    }, 4000);
}

const ICONS: Record<ToastType, any> = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
};

const STYLES: Record<ToastType, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200",
    error: "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200",
    warning: "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200",
    info: "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
};
const ICON_STYLES: Record<ToastType, string> = {
    success: "text-emerald-500",
    error: "text-rose-500",
    warning: "text-amber-500",
    info: "text-blue-500",
};

export default function ToastProvider() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        toastListeners.push(setToasts);
        return () => { toastListeners = toastListeners.filter(fn => fn !== setToasts); };
    }, []);

    const dismiss = (id: string) => {
        toastList = toastList.filter(t => t.id !== id);
        toastListeners.forEach(fn => fn([...toastList]));
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
            {toasts.map(toast => {
                const Icon = ICONS[toast.type];
                return (
                    <div key={toast.id}
                        className={`pointer-events-auto flex items-start gap-3 w-full px-4 py-3 rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-5 duration-300 ${STYLES[toast.type]}`}>
                        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${ICON_STYLES[toast.type]}`} />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm leading-tight">{toast.title}</p>
                            {toast.message && <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>}
                        </div>
                        <button onClick={() => dismiss(toast.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

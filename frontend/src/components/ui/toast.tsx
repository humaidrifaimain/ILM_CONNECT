'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, AlertCircle, Info, Loader2, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.toasts]));
  }

  show(type: ToastType, title: string, message?: string, duration: number = 4000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item: ToastItem = { id, type, title, message, duration };

    // Keep max 4 toasts
    this.toasts = [item, ...this.toasts.slice(0, 3)];
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    // Gentle audio chime for success
    if (type === 'success' && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const now = ctx.currentTime;
          const osc1 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(587.33, now); // D5
          osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.12); // A5
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc1.connect(gain);
          gain.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.45);
        }
      } catch {
        // audio context blocked or not ready
      }
    }

    return id;
  }

  success(title: string, message?: string, duration: number = 3800) {
    return this.show('success', title, message, duration);
  }

  error(title: string, message?: string, duration: number = 5500) {
    return this.show('error', title, message, duration);
  }

  info(title: string, message?: string, duration: number = 4000) {
    return this.show('info', title, message, duration);
  }

  loading(title: string, message?: string) {
    return this.show('loading', title, message, 0); // No auto-dismiss
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }
}

export const toast = new ToastManager();

const ToastContext = createContext<ToastManager>(toast);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[10000] flex flex-col gap-2.5 max-w-[360px] sm:max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isInfo = t.type === 'info';
        const isLoading = t.type === 'loading';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto w-full rounded-2xl border bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/20 p-3.5 transition-all duration-300 animate-fade-in ${
              isSuccess
                ? 'border-l-[5px] border-l-emerald-500 border-slate-200 dark:border-slate-800'
                : isError
                ? 'border-l-[5px] border-l-rose-500 border-slate-200 dark:border-slate-800'
                : isInfo
                ? 'border-l-[5px] border-l-sky-500 border-slate-200 dark:border-slate-800'
                : 'border-l-[5px] border-l-amber-500 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon badge */}
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isSuccess
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400'
                    : isError
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400'
                    : isInfo
                    ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400'
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400'
                }`}
              >
                {isSuccess && <CheckCircle2 className="h-4.5 w-4.5 stroke-[2.5]" />}
                {isError && <AlertCircle className="h-4.5 w-4.5 stroke-[2.5]" />}
                {isInfo && <Info className="h-4.5 w-4.5 stroke-[2.5]" />}
                {isLoading && <Loader2 className="h-4.5 w-4.5 animate-spin stroke-[2.5]" />}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                      isSuccess
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : isError
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                        : isInfo
                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                    }`}
                  >
                    {isSuccess ? 'Success' : isError ? 'Warning' : isInfo ? 'Notice' : 'Updating'}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold leading-snug text-slate-900 dark:text-white">
                  {t.title}
                </h4>
                {t.message && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1 font-normal break-words">
                    {t.message}
                  </p>
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => toast.dismiss(t.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 -mr-1 -mt-1"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

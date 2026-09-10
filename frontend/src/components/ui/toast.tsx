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
    <div className="fixed top-4 right-4 sm:right-5 z-[10000] flex flex-col gap-2 max-w-[320px] sm:max-w-xs w-full pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isInfo = t.type === 'info';
        const isLoading = t.type === 'loading';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border shadow-lg backdrop-blur-md px-3 py-2.5 transition-all duration-200 animate-slide-in-right ${
              isSuccess
                ? 'bg-emerald-950/92 dark:bg-emerald-950/95 border-emerald-500/35 text-emerald-100 shadow-[0_8px_20px_-8px_rgba(16,185,129,0.3)]'
                : isError
                ? 'bg-rose-950/92 dark:bg-rose-950/95 border-rose-500/35 text-rose-100 shadow-[0_8px_20px_-8px_rgba(244,63,94,0.3)]'
                : isInfo
                ? 'bg-sky-950/92 dark:bg-sky-950/95 border-sky-500/35 text-sky-100 shadow-[0_8px_20px_-8px_rgba(14,165,233,0.3)]'
                : 'bg-slate-900/92 dark:bg-slate-900/95 border-amber-500/35 text-amber-100 shadow-[0_8px_20px_-8px_rgba(245,158,11,0.3)]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {/* Icon badge */}
              <div
                className={`h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isSuccess
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isError
                    ? 'bg-rose-500/20 text-rose-400'
                    : isInfo
                    ? 'bg-sky-500/20 text-sky-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {isSuccess && <CheckCircle2 className="h-3.5 w-3.5" />}
                {isError && <AlertCircle className="h-3.5 w-3.5" />}
                {isInfo && <Info className="h-3.5 w-3.5" />}
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-0.5">
                <h4 className="text-xs font-semibold leading-tight tracking-tight text-white">
                  {t.title}
                </h4>
                {t.message && (
                  <p className="text-[11px] opacity-80 leading-relaxed mt-0.5">
                    {t.message}
                  </p>
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => toast.dismiss(t.id)}
                className="p-0.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 mt-0.5"
                aria-label="Close notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

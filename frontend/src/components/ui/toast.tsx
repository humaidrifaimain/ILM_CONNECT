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
    <div className="fixed top-5 right-4 sm:right-6 z-[10000] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isInfo = t.type === 'info';
        const isLoading = t.type === 'loading';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-2xl border shadow-xl backdrop-blur-xl p-4 transition-all duration-300 animate-slide-in-right ${
              isSuccess
                ? 'bg-emerald-950/90 dark:bg-emerald-950/95 border-emerald-500/40 text-emerald-100 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]'
                : isError
                ? 'bg-rose-950/90 dark:bg-rose-950/95 border-rose-500/40 text-rose-100 shadow-[0_10px_30px_-10px_rgba(244,63,94,0.3)]'
                : isInfo
                ? 'bg-sky-950/90 dark:bg-sky-950/95 border-sky-500/40 text-sky-100 shadow-[0_10px_30px_-10px_rgba(14,165,233,0.3)]'
                : 'bg-slate-900/90 dark:bg-slate-900/95 border-amber-500/40 text-amber-100 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.3)]'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon badge */}
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isSuccess
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isError
                    ? 'bg-rose-500/20 text-rose-400'
                    : isInfo
                    ? 'bg-sky-500/20 text-sky-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {isSuccess && <CheckCircle2 className="h-5 w-5" />}
                {isError && <AlertCircle className="h-5 w-5" />}
                {isInfo && <Info className="h-5 w-5" />}
                {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-sm font-bold leading-snug tracking-tight text-white">
                  {t.title}
                </h4>
                {t.message && (
                  <p className="text-xs opacity-90 leading-relaxed mt-0.5">
                    {t.message}
                  </p>
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => toast.dismiss(t.id)}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
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

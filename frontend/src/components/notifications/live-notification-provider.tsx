'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Calendar,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  MessageSquare,
  X,
  ExternalLink,
  Info,
} from 'lucide-react';

export interface LiveToastItem {
  id: string;
  type: string;
  title: string;
  message: string;
  actorName?: string;
  actorRole?: string;
  sessionDateFormatted?: string;
  sessionTimeFormatted?: string;
  previousTimeFormatted?: string;
  reason?: string;
  createdAt: string;
  actionUrl?: string;
}

interface LiveNotificationContextType {
  toasts: LiveToastItem[];
  dismissToast: (id: string) => void;
  triggerManualToast: (toast: Omit<LiveToastItem, 'id' | 'createdAt'>) => void;
}

const LiveNotificationContext = createContext<LiveNotificationContextType | undefined>(undefined);

/**
 * Play a subtle, elegant chime using the Web Audio API
 */
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Gentle two-tone melodic chime (E5 -> B5)
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(329.63, now); // E4

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);
  } catch {
    // AudioContext blocked or not allowed prior to user gesture
  }
}

export function LiveNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [toasts, setToasts] = useState<LiveToastItem[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (notif: any) => {
      const payload = notif.payloadJson || {};
      const type = notif.type || 'NOTIFICATION';

      let defaultTitle = 'New Notification';
      if (type === 'BOOKING_CONFIRMED') defaultTitle = 'Session Booked & Confirmed';
      else if (type === 'BOOKING_CANCELLED') defaultTitle = 'Session Cancelled';
      else if (type === 'BOOKING_RESCHEDULED') defaultTitle = 'Session Rescheduled';
      else if (type === 'NEW_MESSAGE') defaultTitle = `Message from ${payload.senderName || 'Contact'}`;

      const isLecturer = user?.role === 'LECTURER';
      let actionUrl = undefined;
      if (type.startsWith('BOOKING_')) {
        actionUrl = isLecturer ? '/lecturer/sessions' : '/student/dashboard';
      } else if (type === 'NEW_MESSAGE') {
        actionUrl = isLecturer ? '/lecturer/messages' : '/student/messages';
      }

      const toastItem: LiveToastItem = {
        id: notif.id || `toast-${Date.now()}-${Math.random()}`,
        type,
        title: payload.title || defaultTitle,
        message: payload.message || payload.preview || 'You have an update regarding your session.',
        actorName: payload.actorName || payload.senderName,
        actorRole: payload.actorRole,
        sessionDateFormatted: payload.sessionDateFormatted,
        sessionTimeFormatted: payload.sessionTimeFormatted,
        previousTimeFormatted: payload.previousTimeFormatted,
        reason: payload.reason,
        createdAt: notif.createdAt || new Date().toISOString(),
        actionUrl,
      };

      setToasts((prev) => {
        // Prevent duplicate toasts
        if (prev.some((t) => t.id === toastItem.id)) return prev;
        return [toastItem, ...prev.slice(0, 3)]; // Keep max 4 toasts
      });

      playNotificationChime();

      // Invalidate relevant React Query caches
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['studentBookings'] });
      queryClient.invalidateQueries({ queryKey: ['lecturerBookings'] });
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });

      // Auto dismiss after 9 seconds
      setTimeout(() => {
        dismissToast(toastItem.id);
      }, 9000);
    },
    [user?.role, queryClient, dismissToast],
  );

  const triggerManualToast = useCallback(
    (toastData: Omit<LiveToastItem, 'id' | 'createdAt'>) => {
      const id = `manual-${Date.now()}`;
      addToast({
        id,
        ...toastData,
        createdAt: new Date().toISOString(),
      });
    },
    [addToast],
  );

  // 1. Primary: Server-Sent Events (SSE) stream for instant real-time delivery
  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        const streamUrl = `${API_BASE_URL}/notifications/stream`;
        eventSource = new EventSource(streamUrl, { withCredentials: true });

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data || data.type === 'HEARTBEAT') return;

            if (data.id && !seenIdsRef.current.has(data.id)) {
              seenIdsRef.current.add(data.id);
              addToast(data);
            }
          } catch {
            // Silently handle json parse errors
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Attempt reconnect after 10s
          reconnectTimeout = setTimeout(connectSSE, 10000);
        };
      } catch {
        // SSE not supported or network error
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user, addToast]);

  // 2. Secondary: Fast Polling fallback (every 7 seconds)
  const { data: latestNotifications } = useQuery<any[]>({
    queryKey: ['liveNotificationPoll'],
    queryFn: () => apiFetch('/notifications'),
    refetchInterval: 7000,
    enabled: !!user,
  });

  useEffect(() => {
    if (!latestNotifications || !user) return;

    // Seed seenIds on the very first load to prevent firing toasts for historic notifications
    if (!initialLoadDoneRef.current) {
      latestNotifications.forEach((n) => seenIdsRef.current.add(n.id));
      initialLoadDoneRef.current = true;
      return;
    }

    // Check for newly arrived unread notifications
    latestNotifications.forEach((notif) => {
      if (!seenIdsRef.current.has(notif.id)) {
        seenIdsRef.current.add(notif.id);
        if (!notif.readAt) {
          addToast(notif);
        }
      }
    });
  }, [latestNotifications, user, addToast]);

  return (
    <LiveNotificationContext.Provider value={{ toasts, dismissToast, triggerManualToast }}>
      {children}

      {/* Floating Real-time Live Toast Container */}
      <div className="fixed top-20 right-4 sm:right-6 z-[9999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none">
        {toasts.map((toast) => {
          const isCancelled = toast.type === 'BOOKING_CANCELLED';
          const isRescheduled = toast.type === 'BOOKING_RESCHEDULED';
          const isConfirmed = toast.type === 'BOOKING_CONFIRMED';
          const isMessage = toast.type === 'NEW_MESSAGE';

          let borderAccent = 'border-emerald-500/40';
          let iconBg = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
          let IconComponent = CalendarCheck;
          let badgeColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
          let badgeText = 'Session Booked';

          if (isCancelled) {
            borderAccent = 'border-red-500/40';
            iconBg = 'bg-red-500/15 text-red-600 dark:text-red-400';
            IconComponent = CalendarX;
            badgeColor = 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20';
            badgeText = 'Session Cancelled';
          } else if (isRescheduled) {
            borderAccent = 'border-amber-500/40';
            iconBg = 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
            IconComponent = CalendarClock;
            badgeColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
            badgeText = 'Session Rescheduled';
          } else if (isMessage) {
            borderAccent = 'border-[hsl(var(--primary)/0.4)]';
            iconBg = 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]';
            IconComponent = MessageSquare;
            badgeColor = 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.2)]';
            badgeText = 'New Message';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full rounded-2xl border ${borderAccent} bg-[hsl(var(--card))/0.96] backdrop-blur-md shadow-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-top-3 flex flex-col gap-2.5 overflow-hidden relative`}
            >
              {/* Top Row: Icon, Badge, and Close Button */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeColor}`}>
                      {badgeText}
                    </span>
                    <h4 className="font-bold text-sm text-[hsl(var(--foreground))] mt-0.5 leading-snug">
                      {toast.title}
                    </h4>
                  </div>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Message Content */}
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-3">
                {toast.message}
              </p>

              {/* Time pill info if session event */}
              {(toast.sessionTimeFormatted || toast.previousTimeFormatted) && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] py-1 px-2 rounded-lg bg-[hsl(var(--muted)/0.6)] text-[hsl(var(--foreground))] font-medium">
                  {toast.sessionTimeFormatted && (
                    <span>
                      🕒 <strong>New Time:</strong> {toast.sessionTimeFormatted}
                    </span>
                  )}
                  {toast.previousTimeFormatted && (
                    <span className="text-[hsl(var(--muted-foreground))] line-through">
                      Was: {toast.previousTimeFormatted}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-1 pt-2 border-t border-[hsl(var(--border)/0.6)]">
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  Dismiss
                </button>
                {toast.actionUrl && (
                  <button
                    onClick={() => {
                      dismissToast(toast.id);
                      router.push(toast.actionUrl!);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-md transition-all flex items-center gap-1.5"
                  >
                    View Details <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </LiveNotificationContext.Provider>
  );
}

export function useLiveNotifications() {
  const context = useContext(LiveNotificationContext);
  if (!context) {
    throw new Error('useLiveNotifications must be used within a LiveNotificationProvider');
  }
  return context;
}

'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, API_BASE_URL, getAuthToken } from './api';

export interface UserPresenceData {
  userId: string;
  isOnline: boolean;
  lastSeen: string | null;
}

/**
 * Hook to automatically send heartbeats while user is active on the site,
 * and mark them offline when closing the tab or becoming hidden.
 */
export function usePresenceHeartbeat(enabled: boolean = true) {
  const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const ping = async () => {
      try {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          await apiFetch('/messages/presence/ping', { method: 'POST' });
        }
      } catch {
        // Silently ignore ping errors
      }
    };

    const markOffline = () => {
      try {
        // Try sendBeacon first, fallback to fetch with keepalive
        const url = `${API_BASE_URL}/messages/presence/offline`;
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(url);
        } else {
          const token = getAuthToken();
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          fetch(url, {
            method: 'POST',
            headers,
            credentials: 'include',
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Silently ignore
      }
    };

    // Initial ping
    ping();

    // Heartbeat interval (every 25 seconds)
    const interval = setInterval(ping, 25000);

    // Event listeners for window focus / visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        ping();
      } else {
        markOffline();
      }
    };

    const handleFocus = () => {
      ping();
    };

    const handleBeforeUnload = () => {
      markOffline();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled]);
}

/**
 * Hook to track live presence of a specific user with frequent polling while in view.
 */
export function useUserPresence(
  userId?: string,
  initialOnline?: boolean,
  initialLastSeen?: string | null,
) {
  const { data } = useQuery<UserPresenceData>({
    queryKey: ['userPresence', userId],
    queryFn: () => apiFetch(`/messages/presence/${userId}`),
    enabled: !!userId,
    refetchInterval: 6000,
    initialData:
      userId && initialOnline !== undefined
        ? {
            userId,
            isOnline: initialOnline,
            lastSeen: initialLastSeen || null,
          }
        : undefined,
  });

  return {
    isOnline: data?.isOnline ?? false,
    lastSeen: data?.lastSeen ?? null,
  };
}

/**
 * Helper to format last seen timestamp in a human-friendly format
 */
export function formatLastSeen(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Offline';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'Offline';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return 'Active just now';
  }

  if (diffMin < 60) {
    return `Last seen ${diffMin}m ago`;
  }

  if (diffHours < 12 && now.toDateString() === date.toDateString()) {
    return `Last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (now.getFullYear() === date.getFullYear()) {
    return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

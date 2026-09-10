'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, BookOpen, LogOut, Inbox, MessageSquare, CheckCheck, CalendarCheck, CalendarX, CalendarClock } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/whatsapp-icon';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Notification {
  id: string;
  type: string;
  payloadJson: {
    title?: string;
    message?: string;
    actorName?: string;
    threadId?: string;
    senderName?: string;
    preview?: string;
    messageId?: string;
    [key: string]: any;
  };
  readAt: string | null;
  createdAt: string;
  channel: string;
}

function getNotifLabel(type: string) {
  switch (type) {
    case 'NEW_MESSAGE': return 'New Message';
    case 'BOOKING_CONFIRMED': return 'Session Confirmed';
    case 'BOOKING_CANCELLED': return 'Session Cancelled';
    case 'BOOKING_RESCHEDULED': return 'Session Rescheduled';
    default: return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
}

function formatNotifTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function DashboardTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  let pageTitle = 'Dashboard';
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const last = segments[segments.length - 1];
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(last) ||
      /^[0-9a-f-]{20,}$/i.test(last);

    if (pathname.includes('/students/') && isUuid) {
      pageTitle = 'Student Performance';
    } else if (isUuid) {
      pageTitle = segments[segments.length - 2].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (segments.length === 2 && segments[0] === 'lecturer' && segments[1] === 'students') {
      pageTitle = 'My Students';
    } else {
      pageTitle = last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  const handleLogout = () => {
    document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setShowLogoutToast(true);
    setTimeout(() => { router.push('/'); }, 1500);
  };

  // Live notifications — poll every 30s
  const isInDashboard = pathname.startsWith('/student') || pathname.startsWith('/lecturer') || pathname.startsWith('/admin');
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => apiFetch('/notifications'),
    refetchInterval: 30000,
    enabled: !!user && isInDashboard,
  });

  const unreadNotifications = notifications.filter(n => !n.readAt);
  const unreadCount = unreadNotifications.length;

  const markAllReadMutation = useMutation({
    mutationFn: () => apiFetch('/notifications/mark-all-read', { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
    },
  });

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Determine messages href based on role
  const messagesHref = pathname.startsWith('/lecturer') ? '/lecturer/messages' : '/student/messages';

  const recentNotifs = notifications.slice(0, 8);

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 lg:px-6 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))/0.9] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)]">
              <BookOpen className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
          </Link>
          <h1 className="text-lg font-semibold">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">

          {/* Notification Bell with Live Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              id="notif-bell-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl animate-fade-in z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline font-medium"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification list */}
                {recentNotifs.length === 0 ? (
                  <div className="py-8 px-4 flex flex-col items-center text-center">
                    <Inbox className="h-10 w-10 text-[hsl(var(--muted-foreground)/0.4)] mb-3" />
                    <p className="text-sm font-medium mb-1">No notifications yet</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">You&apos;ll see updates about your sessions and messages here.</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {recentNotifs.map(notif => {
                      const isMsg = notif.type === 'NEW_MESSAGE';
                      const isCancelled = notif.type === 'BOOKING_CANCELLED';
                      const isRescheduled = notif.type === 'BOOKING_RESCHEDULED';
                      const isConfirmed = notif.type === 'BOOKING_CONFIRMED';
                      const threadId = notif.payloadJson?.threadId;

                      const href = isMsg
                        ? (threadId ? `${messagesHref}?threadId=${encodeURIComponent(threadId)}` : messagesHref)
                        : (pathname.startsWith('/lecturer') ? '/lecturer/sessions' : '/student/dashboard');

                      const previewText = notif.payloadJson?.message
                        || notif.payloadJson?.preview
                        || (notif.payloadJson?.actorName ? `Update from ${notif.payloadJson.actorName}` : 'Session update');

                      return (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[hsl(var(--muted))] cursor-pointer ${!notif.readAt ? 'bg-[hsl(var(--primary)/0.04)]' : ''}`}
                          onClick={() => {
                            if (!notif.readAt) markOneMutation.mutate(notif.id);
                            if (href) { router.push(href); setShowNotifications(false); }
                          }}
                        >
                          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-0.5 ${
                            isCancelled ? 'bg-red-500/15 text-red-600' :
                            isRescheduled ? 'bg-amber-500/15 text-amber-600' :
                            isConfirmed ? 'bg-emerald-500/15 text-emerald-600' :
                            isMsg ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]' :
                            'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]'
                          }`}>
                            {isCancelled ? <CalendarX className="h-4 w-4" /> :
                             isRescheduled ? <CalendarClock className="h-4 w-4" /> :
                             isConfirmed ? <CalendarCheck className="h-4 w-4" /> :
                             isMsg ? <MessageSquare className="h-4 w-4" /> :
                             <Bell className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs font-semibold truncate ${!notif.readAt ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--foreground)/0.7)]'}`}>
                                {notif.payloadJson?.title || getNotifLabel(notif.type)}
                              </p>
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))] flex-shrink-0">
                                {formatNotifTime(notif.createdAt)}
                              </span>
                            </div>
                            {isMsg ? (
                              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                                <span className="font-medium text-[hsl(var(--foreground)/0.8)]">{notif.payloadJson.senderName}</span>
                                {': '}{notif.payloadJson.preview}
                              </p>
                            ) : (
                              <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 mt-0.5">
                                {previewText}
                              </p>
                            )}
                          </div>
                          {!notif.readAt && (
                            <div className="flex-shrink-0 mt-2 h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer link */}
                {recentNotifs.length > 0 && (
                  <div className="border-t border-[hsl(var(--border))] px-4 py-2.5">
                    <Link
                      href={messagesHref}
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-[hsl(var(--primary))] hover:underline font-medium"
                    >
                      Go to Messages →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {user && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] text-xs mr-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-[hsl(var(--foreground))] max-w-[140px] truncate">{user.email}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] text-[10px] font-bold uppercase tracking-wider">
                {user.role}
              </span>
            </div>
          )}

          {/* WhatsApp Support Button */}
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noopener noreferrer"
            title="Contact Support on WhatsApp"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/25 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <WhatsAppIcon className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Contact Support</span>
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#25D366]" />
            </span>
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {showLogoutToast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-fade-in">
          <div className="px-5 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-lg flex items-center gap-2 text-sm font-medium">
            <LogOut className="h-4 w-4 text-[hsl(var(--success))]" />
            You have been logged out
          </div>
        </div>
      )}
    </>
  );
}



'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, Inbox, MessageSquare, CheckCheck, Calendar, CalendarCheck, CalendarX, CalendarClock } from 'lucide-react';
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
    [key: string]: unknown;
  };
  readAt: string | null;
  createdAt: string;
  channel: string;
}

interface TopbarProfile {
  fullName: string;
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
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
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
      const titles: Record<string, string> = { config: 'Configuration', book: 'Book Session', finance: 'Financial Reports', audit: 'Audit Log', users: 'User Management', requests: 'Requests & Support', support: 'Support & Help', materials: 'Course Materials', awards: 'Awards & Badges', feedback: 'Session Feedback' };
      pageTitle = titles[last] || last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  const handleLogout = async () => {
    await logout();
  };

  // Live notifications — poll every 30s
  const isInDashboard = pathname.startsWith('/student') || pathname.startsWith('/lecturer') || pathname.startsWith('/admin');
  const isStudentRoute = pathname.startsWith('/student');
  const isLecturerRoute = pathname.startsWith('/lecturer');
  const dashboardHref = pathname.startsWith('/admin') ? '/admin/dashboard' : isLecturerRoute ? '/lecturer/dashboard' : '/student/dashboard';
  const roleLabel = isStudentRoute ? 'Student' : isLecturerRoute ? 'Lecturer' : 'Admin';
  const isDashboardHome = pathname === dashboardHref;
  const isStudentDashboard = pathname === '/student/dashboard';
  const { data: profile } = useQuery<TopbarProfile>({
    queryKey: ['profile', isLecturerRoute ? 'lecturer' : 'student'],
    queryFn: () => apiFetch(isLecturerRoute ? '/profile/lecturer' : '/profile/student'),
    enabled: !!user && (isStudentRoute || isLecturerRoute),
    retry: 1,
  });
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

  useEffect(() => {
    if (!showNotifications) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        document.getElementById('notif-bell-btn')?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showNotifications]);

  // Determine messages href based on role
  const messagesHref = pathname.startsWith('/admin') ? '/admin/requests' : pathname.startsWith('/lecturer') ? '/lecturer/messages' : '/student/messages';

  const recentNotifs = notifications.slice(0, 8);
  const displayName = profile?.fullName || user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Account';
  const firstName = displayName.split(' ')[0];
  const topbarTitle = isDashboardHome ? `Welcome Back ${firstName}` : pageTitle;

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b h-[72px] border-[#d6e0db] bg-white px-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={dashboardHref} className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095F46] lg:hidden" aria-label={`${roleLabel} dashboard home`}>
            <Image
              src="/images/ilmbit-logo-green.png"
              alt="ILMBIT"
              width={30}
              height={39}
              className="h-9 w-auto object-contain"
            />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-stone-950">{topbarTitle}</h1>
            {isDashboardHome && (
              <p className="mt-0.5 hidden text-sm text-[#56635c] sm:block">{roleLabel} dashboard · {displayName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isStudentDashboard && (
            <Link
              href="/student/courses"
              className="hidden min-h-10 items-center justify-center gap-2 rounded-full bg-[#095F46] px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#074c38] hover:shadow-md sm:inline-flex"
            >
              <Calendar className="h-4 w-4" /> Book Session
            </Link>
          )}

          {/* Notification Bell with Live Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              id="notif-bell-btn"
              aria-label="Notifications"
              aria-expanded={showNotifications}
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative transition-colors flex h-10 w-10 items-center justify-center rounded-full border border-[#d6e0db] text-[#202823] hover:bg-[#f5f7f6]"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-24px)] sm:w-96 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl animate-fade-in z-50 overflow-hidden">
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
                        : (pathname.startsWith('/admin') ? '/admin/sessions' : pathname.startsWith('/lecturer') ? '/lecturer/sessions' : '/student/dashboard');

                      const previewText = notif.payloadJson?.message
                        || notif.payloadJson?.preview
                        || (notif.payloadJson?.actorName ? `Update from ${notif.payloadJson.actorName}` : 'Session update');

                      return (
                        <button
                          type="button"
                          key={notif.id}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--muted))] ${!notif.readAt ? 'bg-[hsl(var(--primary)/0.04)]' : ''}`}
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
                        </button>
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



          <button
            aria-label="Logout"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors min-h-10 rounded-full border border-red-100 px-4 text-[hsl(var(--destructive))] hover:bg-red-50"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>


    </>
  );
}

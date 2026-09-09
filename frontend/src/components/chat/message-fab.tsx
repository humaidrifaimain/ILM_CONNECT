'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';

export default function MessageFAB() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  // Hide on message pages or live video rooms
  const isHidden =
    !user ||
    pathname.includes('/messages') ||
    pathname.includes('/room') ||
    pathname.startsWith('/auth');

  // Determine chat target URL based on user role / current portal
  const chatHref = pathname.startsWith('/lecturer') || user?.role === 'LECTURER'
    ? '/lecturer/messages'
    : '/student/messages';

  // Live unread message count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['unreadMessageCount'],
    queryFn: () => apiFetch('/messages/unread-count'),
    refetchInterval: 8000,
    enabled: !!user && !isHidden,
  });

  const unreadCount = unreadData?.count ?? 0;
  const hasUnread = unreadCount > 0;

  if (isHidden) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center justify-end">
      <Link
        href={chatHref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={`Open Messages${hasUnread ? `, ${unreadCount} unread` : ''}`}
        className="relative group focus:outline-none"
      >
        {/* Expanded Tooltip pill on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-2"
            >
              <span>Messages</span>
              {hasUnread && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ambient glow effect when unread */}
        {hasUnread && (
          <span className="absolute -inset-1 rounded-full bg-red-500/30 blur-md animate-pulse pointer-events-none" />
        )}

        {/* Floating Action Button */}
        <motion.div
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`relative h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 ${
            hasUnread
              ? 'bg-gradient-to-tr from-[hsl(168,85%,24%)] via-[hsl(168,80%,30%)] to-[hsl(168,65%,38%)] shadow-[hsl(168,80%,26%)/0.4]'
              : 'bg-gradient-to-tr from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] shadow-[hsl(168,80%,26%)/0.3] hover:shadow-[hsl(168,80%,26%)/0.5]'
          }`}
        >
          {/* Subtle icon bounce when unread */}
          <MessageSquare className={`h-6 w-6 transition-transform group-hover:scale-110 ${hasUnread ? 'animate-bounce' : ''}`} style={{ animationDuration: '2.5s' }} />

          {/* Unread count badge */}
          <AnimatePresence>
            {hasUnread && (
              <motion.div
                key="fab-unread-badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute -top-1 -right-1 flex items-center justify-center"
              >
                {/* Ping wave */}
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />

                {/* Badge pill */}
                <span className="relative min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white font-extrabold text-[11px] flex items-center justify-center ring-2 ring-[hsl(var(--card))] shadow-md shadow-red-500/40">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    </div>
  );
}

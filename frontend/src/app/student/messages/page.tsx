'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { usePresenceHeartbeat, useUserPresence, formatLastSeen } from '@/lib/use-presence';
import { Send, MessageSquare, Loader2, ArrowLeft, Info, CheckCheck, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Thread {
  threadId: string;
  lastMessage: { id: string; content: string; senderId: string; createdAt: string };
  otherUser: {
    id: string;
    name: string;
    role: string;
    initials: string;
    isOnline?: boolean;
    lastSeen?: string | null;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender: {
    id: string;
    role: string;
    studentProfile?: { fullName: string };
    lecturerProfile?: { fullName: string };
  };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function StudentMessagesContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const urlThreadId = searchParams.get('threadId');

  // Maintain active online heartbeat while on page
  usePresenceHeartbeat(!!user);

  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  // Live presence for selected participant
  const { isOnline: isOtherUserOnline, lastSeen: otherUserLastSeen } = useUserPresence(
    selectedThread?.otherUser.id,
    selectedThread?.otherUser.isOnline,
    selectedThread?.otherUser.lastSeen,
  );

  const [input, setInput] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  // Preserve unread status during active reading session so user clearly sees what's new before smooth auto-fade
  const [sessionUnreadIds, setSessionUnreadIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialAutoSelectDone = useRef(false);

  const { data: profile } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: () => apiFetch('/profile/student'),
  });

  const { data: threads = [], isLoading: threadsLoading } = useQuery<Thread[]>({
    queryKey: ['messageThreads'],
    queryFn: () => apiFetch('/messages/threads'),
    refetchInterval: 10000,
    enabled: !!user,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['messages', selectedThread?.threadId],
    queryFn: () => apiFetch(`/messages/${selectedThread!.threadId}`),
    refetchInterval: 3000,
    enabled: !!selectedThread,
  });

  // Mark thread as read
  const markReadMutation = useMutation({
    mutationFn: (threadId: string) =>
      apiFetch(`/messages/${threadId}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Automatically fade out unread indicators once user is viewing with active tab
  const triggerAutoFade = useCallback((threadId: string) => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    const startTimer = () => {
      fadeTimeoutRef.current = setTimeout(() => {
        markReadMutation.mutate(threadId);
        setSessionUnreadIds(new Set());
      }, 2500); // 2.5s display window before smooth fade away
    };

    const isTabActive = () => {
      if (typeof document === 'undefined') return true;
      return document.visibilityState === 'visible' && document.hasFocus();
    };

    if (isTabActive()) {
      startTimer();
    } else {
      const handleTabActivated = () => {
        if (isTabActive()) {
          window.removeEventListener('focus', handleTabActivated);
          document.removeEventListener('visibilitychange', handleTabActivated);
          startTimer();
        }
      };
      window.addEventListener('focus', handleTabActivated);
      document.addEventListener('visibilitychange', handleTabActivated);
    }
  }, [markReadMutation]);

  // Clean up auto-fade timer on conversation change or unmount
  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [selectedThread?.threadId]);

  // Automatically select thread from URL or first available thread on desktop
  useEffect(() => {
    if (threads.length === 0) return;

    if (urlThreadId) {
      const match = threads.find((t) => t.threadId === urlThreadId);
      if (match && selectedThread?.threadId !== match.threadId) {
        setSelectedThread(match);
        setMobileView('chat');
        if (match.unreadCount > 0) {
          triggerAutoFade(match.threadId);
        }
        return;
      }
    }

    // On initial load without selection on larger screens, select thread with unread or first thread
    if (!initialAutoSelectDone.current && !selectedThread && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      initialAutoSelectDone.current = true;
      const unreadThread = threads.find((t) => t.unreadCount > 0);
      const target = unreadThread || threads[0];
      setSelectedThread(target);
      if (target.unreadCount > 0) {
        triggerAutoFade(target.threadId);
      }
    }
  }, [threads, urlThreadId, selectedThread, triggerAutoFade]);

  // Track unread messages in the active conversation and auto-fade
  useEffect(() => {
    if (messages.length > 0 && user && selectedThread) {
      const newUnreads = messages
        .filter((m) => m.recipientId === user.id && !m.readAt)
        .map((m) => m.id);

      if (newUnreads.length > 0) {
        setSessionUnreadIds((prev) => {
          const hasNew = newUnreads.some((id) => !prev.has(id));
          if (!hasNew) return prev;
          const next = new Set(prev);
          newUnreads.forEach((id) => next.add(id));
          return next;
        });

        // Trigger automatic smooth fade away once tab is activated / viewed
        triggerAutoFade(selectedThread.threadId);
      }
    }
  }, [messages, user, selectedThread, triggerAutoFade]);

  const sendMutation = useMutation({
    mutationFn: ({ recipientId, content, threadId }: { recipientId: string; content: string; threadId?: string }) =>
      apiFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({ recipientId, content, threadId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedThread?.threadId] });
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
      setInput('');
    },
  });

  const handleSelectThread = useCallback((thread: Thread) => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    setSelectedThread(thread);
    setMobileView('chat');
    setSessionUnreadIds(new Set());
    if (thread.unreadCount > 0) {
      triggerAutoFade(thread.threadId);
    }
  }, [triggerAutoFade]);

  const handleDismissUnread = () => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    setSessionUnreadIds(new Set());
    if (selectedThread) {
      markReadMutation.mutate(selectedThread.threadId);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !selectedThread || sendMutation.isPending) return;
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    setSessionUnreadIds(new Set());
    sendMutation.mutate({
      recipientId: selectedThread.otherUser.id,
      content: trimmed,
      threadId: selectedThread.threadId,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const assignedLecturerId = profile?.assignedLecturerId;
  const assignedLecturerName = profile?.assignedLecturer?.fullName || 'Your Maulavi';

  const handleStartFirstConversation = () => {
    if (!assignedLecturerId) return;
    const syntheticThread: Thread = {
      threadId: [user!.id, assignedLecturerId].sort().join('_'),
      lastMessage: { id: '', content: 'No messages yet', senderId: '', createdAt: new Date().toISOString() },
      otherUser: {
        id: assignedLecturerId,
        name: assignedLecturerName,
        role: 'LECTURER',
        initials: assignedLecturerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
      },
      unreadCount: 0,
    };
    setSelectedThread(syntheticThread);
    setMobileView('chat');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  // Account role mismatch check (e.g. lecturer browsing student page)
  if (user.role !== 'STUDENT') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] p-6 text-center animate-fade-in">
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 max-w-md shadow-lg">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">Lecturer Account Active</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4 leading-relaxed">
            You are currently signed in as <span className="font-semibold text-[hsl(var(--foreground))]">{user.email}</span> (Lecturer). To view the Student Portal, please sign in with your student account (e.g. in an Incognito window for pair-testing).
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-2">
            <Link
              href="/lecturer/messages"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow transition-all"
            >
              Go to Lecturer Messages →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate unread items for active thread (incoming messages from lecturer)
  const activeUnreadCount = messages.filter(
    (m) => (m.sender?.role === 'LECTURER' || m.recipientId === user.id) && (!m.readAt || sessionUnreadIds.has(m.id))
  ).length;

  const firstUnreadIndex = messages.findIndex(
    (m) => (m.sender?.role === 'LECTURER' || m.recipientId === user.id) && (!m.readAt || sessionUnreadIds.has(m.id))
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 lg:-m-6 overflow-hidden">
      {/* Thread List Sidebar */}
      <div
        className={`w-full lg:w-80 xl:w-96 border-r border-[hsl(var(--border))] flex flex-col bg-[hsl(var(--card))] flex-shrink-0 ${
          mobileView === 'chat' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="px-4 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Messages</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Chat with your Maulavi</p>
            </div>
            <AnimatePresence>
              {threads.some((t) => t.unreadCount > 0) && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-sm animate-pulse"
                >
                  {threads.reduce((s, t) => s + t.unreadCount, 0)} unread
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {threadsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-[hsl(var(--primary))]" />
              </div>
              <p className="font-semibold text-sm mb-1">No conversations yet</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
                Start a conversation with your assigned Maulavi
              </p>
              {assignedLecturerId && (
                <button
                  onClick={handleStartFirstConversation}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg transition-all"
                >
                  Message {assignedLecturerName}
                </button>
              )}
            </div>
          ) : (
            <div className="py-2">
              {threads.map((thread) => {
                const isSelected = selectedThread?.threadId === thread.threadId;
                const hasUnread = thread.unreadCount > 0;
                return (
                  <button
                    key={thread.threadId}
                    onClick={() => handleSelectThread(thread)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'bg-[hsl(var(--primary)/0.1)] border-r-2 border-[hsl(var(--primary))]'
                        : hasUnread
                        ? 'bg-red-500/[0.05] border-l-4 border-red-500 hover:bg-red-500/[0.08]'
                        : 'hover:bg-[hsl(var(--muted))]'
                    }`}
                  >
                    {/* Avatar with Presence Indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[hsl(168,65%,45%)] to-[hsl(168,50%,55%)] flex items-center justify-center text-white font-bold text-sm">
                        {thread.otherUser.initials}
                      </div>

                      {/* Online / Offline dot */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[hsl(var(--card))] flex items-center justify-center transition-colors ${
                          thread.otherUser.isOnline
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                            : 'bg-zinc-400 dark:bg-zinc-600'
                        }`}
                        title={thread.otherUser.isOnline ? 'Online' : formatLastSeen(thread.otherUser.lastSeen)}
                      >
                        {thread.otherUser.isOnline && (
                          <span className="h-full w-full rounded-full bg-emerald-400 animate-ping opacity-60" />
                        )}
                      </span>

                      <AnimatePresence>
                        {hasUnread && (
                          <motion.span
                            key={`avatar-badge-${thread.threadId}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[hsl(var(--card))] shadow-sm"
                          >
                            {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Thread info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`text-sm truncate transition-colors duration-300 ${
                              hasUnread ? 'font-bold text-[hsl(var(--foreground))]' : 'font-semibold text-[hsl(var(--foreground)/0.8)]'
                            }`}
                          >
                            {thread.otherUser.name}
                          </span>
                          {thread.otherUser.isOnline && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" title="Online" />
                          )}
                        </div>
                        <span
                          className={`text-[10px] flex-shrink-0 ml-2 transition-colors duration-300 ${
                            hasUnread ? 'font-semibold text-red-500' : 'text-[hsl(var(--muted-foreground))]'
                          }`}
                        >
                          {formatTime(thread.lastMessage.createdAt)}
                        </span>
                      </div>
                      <p
                        className={`text-xs truncate transition-colors duration-300 ${
                          hasUnread ? 'font-semibold text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'
                        }`}
                      >
                        {thread.lastMessage.senderId === user.id ? 'You: ' : ''}
                        {thread.lastMessage.content || 'No messages yet'}
                      </p>
                      <AnimatePresence>
                        {hasUnread && (
                          <motion.span
                            key={`thread-pill-${thread.threadId}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
                            className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            {thread.unreadCount} unread message{thread.unreadCount > 1 ? 's' : ''}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area ("Message Window") */}
      <div className={`flex-1 flex flex-col ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
        {!selectedThread ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-[hsl(var(--muted-foreground)/0.4)]" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Select a conversation</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-xs">
              Choose a conversation from the list or message your Maulavi to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <button
                onClick={() => setMobileView('list')}
                className="lg:hidden p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative flex-shrink-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[hsl(168,65%,45%)] to-[hsl(168,50%,55%)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {selectedThread.otherUser.initials}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[hsl(var(--card))] transition-colors ${
                    isOtherUserOnline
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                      : 'bg-zinc-400 dark:bg-zinc-600'
                  }`}
                  title={isOtherUserOnline ? 'Online' : formatLastSeen(otherUserLastSeen)}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{selectedThread.otherUser.name}</p>
                  {/* Unread badge directly in chat window header with smooth fade-out */}
                  <AnimatePresence>
                    {activeUnreadCount > 0 && (
                      <motion.span
                        key="header-unread-pill"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.4 } }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        {activeUnreadCount} UNREAD
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isOtherUserOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400 dark:bg-zinc-600'
                      }`}
                    />
                    <span
                      className={
                        isOtherUserOnline
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]'
                          : 'text-[hsl(var(--muted-foreground))] text-[11px]'
                      }
                    >
                      {isOtherUserOnline ? 'Online' : formatLastSeen(otherUserLastSeen)}
                    </span>
                  </span>
                  <span className="text-[hsl(var(--muted-foreground)/0.4)]">•</span>
                  <span className="text-[hsl(var(--muted-foreground))] text-[11px]">
                    {selectedThread.otherUser.role === 'LECTURER' ? 'Your Maulavi' : 'Student'}
                  </span>
                </div>
              </div>

              {/* Status indicator / Dismiss pill */}
              <div className="flex items-center gap-2">
                <AnimatePresence mode="wait">
                  {activeUnreadCount > 0 ? (
                    <motion.button
                      key="dismiss-btn"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
                      onClick={handleDismissUnread}
                      className="text-xs text-[hsl(var(--primary))] hover:underline font-semibold px-2 py-1 rounded hover:bg-[hsl(var(--primary)/0.1)] transition-colors"
                    >
                      Mark as read
                    </motion.button>
                  ) : (
                    <motion.div
                      key="all-read-pill"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] text-[10px] font-medium"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      All read
                    </motion.div>
                  )}
                </AnimatePresence>

                {isOtherUserOnline ? (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                    Active Now
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-[10px] font-medium border border-[hsl(var(--border))]">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    {formatLastSeen(otherUserLastSeen)}
                  </div>
                )}
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {/* Safeguarding notice */}
              <div className="flex items-center gap-2 mx-auto max-w-sm px-3 py-2 rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-xs text-center mb-4">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Messages are monitored to ensure a safe learning environment.</span>
              </div>

              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    No messages yet. Say Assalamu Alaikum! 👋
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => {
                    const isFromLecturer = msg.sender?.role === 'LECTURER';
                    const isMine = !isFromLecturer && (msg.sender?.role === 'STUDENT' || msg.senderId === user.id);
                    const isUnread = !isMine && (!msg.readAt || sessionUnreadIds.has(msg.id));
                    const showDate =
                      idx === 0 ||
                      new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();
                    const showUnreadDivider = idx === firstUnreadIndex;

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="text-center py-3">
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-3 py-1 rounded-full">
                              {new Date(msg.createdAt).toLocaleDateString([], {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        )}

                        {/* Unread Divider Bar with smooth auto-fade exit */}
                        <AnimatePresence>
                          {showUnreadDivider && (
                            <motion.div
                              key="unread-divider-bar"
                              initial={{ opacity: 0, height: 0, scale: 0.95 }}
                              animate={{ opacity: 1, height: 'auto', scale: 1 }}
                              exit={{ opacity: 0, height: 0, scale: 0.95, transition: { duration: 0.5, ease: 'easeInOut' } }}
                              className="overflow-hidden my-4 py-1"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-red-500/50 to-red-500" />
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-md shadow-red-500/20">
                                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                                  New / Unread Messages Below
                                </span>
                                <div className="flex-1 h-[1.5px] bg-gradient-to-l from-transparent via-red-500/50 to-red-500" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMine && (
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[hsl(168,65%,45%)] to-[hsl(168,50%,55%)] flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 mr-2 mt-1">
                              {selectedThread.otherUser.initials}
                            </div>
                          )}

                          <div className="max-w-[75%] sm:max-w-[65%]">
                            {/* Message Bubble with smooth border/ring highlight transition */}
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words transition-all duration-700 ${
                                isMine
                                  ? 'bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] text-white rounded-br-sm'
                                  : isUnread
                                  ? 'bg-[hsl(var(--card))] border-2 border-red-500/60 shadow-md shadow-red-500/10 ring-2 ring-red-500/20 text-[hsl(var(--foreground))] rounded-bl-sm font-medium'
                                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-bl-sm'
                              }`}
                            >
                              {msg.content}
                            </div>

                            {/* Message Meta / Status Label */}
                            <div
                              className={`flex items-center gap-1.5 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}
                            >
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>

                              {/* Unread indicator on incoming messages with smooth fade-out */}
                              <AnimatePresence>
                                {!isMine && isUnread && (
                                  <motion.span
                                    key={`unread-pill-${msg.id}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.4 } }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm"
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                    UNREAD
                                  </motion.span>
                                )}
                              </AnimatePresence>

                              {/* Read / Unread status on sent messages */}
                              {isMine && msg.readAt && (
                                <span className="text-[10px] text-[hsl(var(--primary))] font-medium flex items-center gap-0.5">
                                  <CheckCheck className="h-3 w-3" />
                                  Read
                                </span>
                              )}
                              {isMine && !msg.readAt && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-medium border border-amber-500/20">
                                  <Clock className="h-2.5 w-2.5" />
                                  Unread by {selectedThread.otherUser.name || 'Maulavi'}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Enter to send)"
                  rows={1}
                  style={{ resize: 'none' }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all min-h-[44px] max-h-32 overflow-y-auto"
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sendMutation.isPending}
                  className="h-11 w-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all flex-shrink-0"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function StudentMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      }
    >
      <StudentMessagesContent />
    </Suspense>
  );
}

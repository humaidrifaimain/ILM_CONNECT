'use client';

import { useState } from 'react';
import {
  Search,
  UserPlus,
  RefreshCw,
  CheckCircle,
  Clock,
  MessageSquare,
  Send,
  X,
  User,
  GraduationCap,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Loader2,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/ui/loading-screen';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/components/ui/portal';

interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  userId: string;
  type: string;
  reason: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  user: {
    id: string;
    email: string;
    role: string;
    studentProfile?: {
      fullName?: string;
      country?: string;
      phone?: string;
      currentTier?: string;
    } | null;
    lecturerProfile?: {
      fullName?: string;
      qualifications?: string;
    } | null;
  };
  messages?: TicketMessage[];
}

export default function AdminRequestsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'LECTURER'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Fetch tickets with 10-second silent background polling
  const { data: tickets = [], isLoading, refetch } = useQuery<SupportTicket[]>({
    queryKey: ['adminSupportTickets'],
    queryFn: () => apiFetch('/support/tickets'),
    refetchInterval: 10000,
  });

  // Keep selectedTicket synced with query data
  const currentSelectedTicket = selectedTicket
    ? tickets.find((t) => t.id === selectedTicket.id) || selectedTicket
    : null;

  // Counts for tabs
  const studentTicketsCount = tickets.filter((t) => t.user?.role === 'STUDENT').length;
  const lecturerTicketsCount = tickets.filter((t) => t.user?.role === 'LECTURER').length;

  const filtered = tickets.filter((req) => {
    const role = req.user?.role || 'STUDENT';
    const fullName =
      role === 'LECTURER'
        ? req.user?.lecturerProfile?.fullName || req.user?.email || ''
        : req.user?.studentProfile?.fullName || req.user?.email || '';
    const email = req.user?.email || '';
    const reason = req.reason || '';

    const matchSearch =
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      reason.toLowerCase().includes(search.toLowerCase()) ||
      req.id.toLowerCase().includes(search.toLowerCase());

    const matchRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'STUDENT' && role === 'STUDENT') ||
      (roleFilter === 'LECTURER' && role === 'LECTURER');

    const matchStatus = statusFilter === 'ALL' || req.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await apiFetch(`/support/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await queryClient.invalidateQueries({ queryKey: ['adminSupportTickets'] });
      toast.success('Status Updated', `Ticket status updated to ${newStatus}.`);
    } catch (err: any) {
      toast.error('Update Failed', err?.message || 'Failed to update ticket status');
    }
  };

  const handleSendReply = async (newStatus?: string) => {
    if (!currentSelectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await apiFetch(`/support/tickets/${currentSelectedTicket.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          message: replyText.trim(),
          newStatus: newStatus || undefined,
        }),
      });
      setReplyText('');
      await queryClient.invalidateQueries({ queryKey: ['adminSupportTickets'] });
      toast.success('Reply Sent', 'Your message has been delivered to the user.');
    } catch (err: any) {
      toast.error('Failed to send reply', err?.message || 'Could not post message');
    } finally {
      setSendingReply(false);
    }
  };

  const getDisplayName = (req: SupportTicket) => {
    if (req.user?.role === 'LECTURER') {
      return req.user?.lecturerProfile?.fullName || req.user?.email.split('@')[0] || 'Lecturer';
    }
    return req.user?.studentProfile?.fullName || req.user?.email.split('@')[0] || 'Student';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Operational Requests & Support</h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm">
            Manage student and lecturer inquiries, reassignment requests, and send direct replies.
          </p>
        </div>
      </div>

      {/* ─── Role Separation Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-2 overflow-x-auto">
        <button
          onClick={() => setRoleFilter('ALL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            roleFilter === 'ALL'
              ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
              : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'
          }`}
        >
          <span>All Requests</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${roleFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-black/10 text-[hsl(var(--muted-foreground))]'}`}>
            {tickets.length}
          </span>
        </button>

        <button
          onClick={() => setRoleFilter('STUDENT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            roleFilter === 'STUDENT'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Student Requests</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${roleFilter === 'STUDENT' ? 'bg-white/20 text-white' : 'bg-black/10 text-[hsl(var(--muted-foreground))]'}`}>
            {studentTicketsCount}
          </span>
        </button>

        <button
          onClick={() => setRoleFilter('LECTURER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            roleFilter === 'LECTURER'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          <span>Lecturer / Scholar Requests</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${roleFilter === 'LECTURER' ? 'bg-white/20 text-white' : 'bg-black/10 text-[hsl(var(--muted-foreground))]'}`}>
            {lecturerTicketsCount}
          </span>
        </button>
      </div>

      {/* ─── Search & Status Filters ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search by requester name, email, keyword, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {['ALL', 'PENDING', 'IN_REVIEW', 'RESOLVED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'
              }`}
            >
              {status === 'ALL'
                ? 'All Statuses'
                : status === 'PENDING'
                ? 'Pending'
                : status === 'IN_REVIEW'
                ? 'In Review'
                : 'Resolved'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Requests Table ─── */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <th className="text-left py-3.5 px-5">Requester & Role</th>
                  <th className="text-left py-3.5 px-5">Request Type</th>
                  <th className="text-left py-3.5 px-5">Messages / Replies</th>
                  <th className="text-left py-3.5 px-5">Status</th>
                  <th className="text-right py-3.5 px-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filtered.map((req) => {
                  const isLecturer = req.user?.role === 'LECTURER';
                  const displayName = getDisplayName(req);
                  const msgCount = req.messages?.length || 0;
                  const isResolved = req.status === 'RESOLVED';
                  const isInReview = req.status === 'IN_REVIEW';

                  return (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedTicket(req)}
                      className="cursor-pointer transition-colors hover:bg-[hsl(var(--muted)/0.4)] group"
                    >
                      {/* Requester Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm ${
                              isLecturer
                                ? 'bg-gradient-to-br from-purple-600 to-indigo-700'
                                : 'bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,55%,42%)]'
                            }`}
                          >
                            {displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[hsl(var(--foreground))]">
                                {displayName}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isLecturer
                                    ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                }`}
                              >
                                {isLecturer ? (
                                  <>
                                    <GraduationCap className="h-3 w-3" /> Scholar / Lecturer
                                  </>
                                ) : (
                                  <>
                                    <User className="h-3 w-3" /> Student
                                  </>
                                )}
                              </span>
                            </div>
                            <div className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-2 mt-0.5">
                              <span>{req.user?.email}</span>
                              <span>•</span>
                              <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Request Type & Preview */}
                      <td className="py-3.5 px-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {req.type === 'LECTURER_CHANGE' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold text-xs">
                                <RefreshCw className="h-3 w-3" /> Lecturer Change
                              </span>
                            ) : req.type.includes('TECHNICAL') ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold text-xs">
                                <AlertCircle className="h-3 w-3" /> {req.type.replace(/_/g, ' ')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold text-xs">
                                <HelpCircle className="h-3 w-3" /> {req.type.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          {req.reason && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1 max-w-[260px]">
                              {req.reason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Message count & activity */}
                      <td className="py-3.5 px-5">
                        {msgCount > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-bold">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{msgCount} {msgCount === 1 ? 'Message' : 'Messages'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[hsl(var(--muted-foreground))] inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> No replies yet
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full ${
                            isResolved
                              ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
                              : isInReview
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {isResolved ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : isInReview ? (
                            <Sparkles className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {isResolved ? 'Resolved' : isInReview ? 'In Review' : 'Pending'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedTicket(req)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] hover:bg-[hsl(var(--primary)/0.18)] transition-all"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> View & Reply
                          </button>

                          {req.status !== 'RESOLVED' ? (
                            <button
                              onClick={() => handleStatusUpdate(req.id, 'RESOLVED')}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
                              title="Mark Resolved"
                            >
                              Resolve
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusUpdate(req.id, 'PENDING')}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-600 border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
                              title="Reopen Ticket"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[hsl(var(--muted-foreground))]">
                      <div className="h-12 w-12 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-sm">No operational requests match your filter.</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        Try resetting the search or selecting &ldquo;All Requests&rdquo;.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── DETAIL & REPLY MODAL WINDOW ─── */}
      <Portal>
        <AnimatePresence>
          {currentSelectedTicket && (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedTicket(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl max-h-[88vh] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto"
              >
                {/* Modal Top Header */}
                <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--muted)/0.3)] shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                      currentSelectedTicket.user?.role === 'LECTURER'
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-700'
                        : 'bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,55%,42%)]'
                    }`}
                  >
                    {getDisplayName(currentSelectedTicket).substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[hsl(var(--foreground))]">
                        {getDisplayName(currentSelectedTicket)}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          currentSelectedTicket.user?.role === 'LECTURER'
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {currentSelectedTicket.user?.role === 'LECTURER' ? 'Scholar Lecturer' : 'Student'}
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Ticket #{currentSelectedTicket.id.slice(0, 8)} • {new Date(currentSelectedTicket.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full ${
                      currentSelectedTicket.status === 'RESOLVED'
                        ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
                        : currentSelectedTicket.status === 'IN_REVIEW'
                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {currentSelectedTicket.status}
                  </span>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="h-8 w-8 rounded-full hover:bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--muted-foreground))] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Requester Details Summary Card */}
                <div className="p-4 rounded-2xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))] block">Email Address:</span>
                    <span className="font-semibold text-[hsl(var(--foreground))] truncate block">
                      {currentSelectedTicket.user?.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))] block">Type / Category:</span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {currentSelectedTicket.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))] block">Country / Tier:</span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {currentSelectedTicket.user?.studentProfile?.country || currentSelectedTicket.user?.studentProfile?.currentTier || 'Standard Global'}
                    </span>
                  </div>
                </div>

                {/* Original Request Box */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Original Submitted Request
                  </h3>
                  <div className="p-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs text-[hsl(var(--foreground))] whitespace-pre-line leading-relaxed">
                    {currentSelectedTicket.reason || 'No description provided.'}
                  </div>
                </div>

                {/* Conversation Thread */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                    <span>Replies & Communications</span>
                    <span className="text-[11px] font-normal lowercase text-[hsl(var(--muted-foreground))]">
                      {currentSelectedTicket.messages?.length || 0} messages
                    </span>
                  </h3>

                  <div className="space-y-3">
                    {(!currentSelectedTicket.messages || currentSelectedTicket.messages.length === 0) && (
                      <div className="p-6 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-dashed border-[hsl(var(--border))] text-center text-xs text-[hsl(var(--muted-foreground))]">
                        No replies exchanged yet. Use the reply box below to send an official response to this {currentSelectedTicket.user?.role === 'LECTURER' ? 'scholar' : 'student'}.
                      </div>
                    )}

                    {currentSelectedTicket.messages?.map((msg) => {
                      const isAdminSender =
                        msg.senderRole === 'ADMIN' || msg.senderRole === 'SUPER_ADMIN';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAdminSender ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))] mb-1 px-1">
                            <span className="font-bold text-[hsl(var(--foreground))]">
                              {msg.senderName}
                            </span>
                            <span>•</span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-semibold ${
                                isAdminSender
                                  ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]'
                                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                              }`}
                            >
                              {isAdminSender ? 'Official Support Desk' : msg.senderRole}
                            </span>
                            <span>•</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                              isAdminSender
                                ? 'bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] text-white shadow-sm rounded-tr-none'
                                : 'bg-[hsl(var(--muted)/0.7)] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-tl-none'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Reply Composer Bar */}
              <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] space-y-3 shrink-0">
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Write an official reply message to ${getDisplayName(currentSelectedTicket)}...`}
                    className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] placeholder:text-[hsl(var(--muted-foreground))]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Quick Status:</span>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(currentSelectedTicket.id, 'IN_REVIEW')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        currentSelectedTicket.status === 'IN_REVIEW'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
                      }`}
                    >
                      In Review
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(currentSelectedTicket.id, 'RESOLVED')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        currentSelectedTicket.status === 'RESOLVED'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                      }`}
                    >
                      Resolved
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      disabled={sendingReply || !replyText.trim()}
                      onClick={() => handleSendReply('RESOLVED')}
                      className="px-3.5 py-2 rounded-xl font-bold text-xs border border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/10 transition-all disabled:opacity-50"
                    >
                      Reply & Mark Resolved
                    </button>

                    <button
                      type="button"
                      disabled={sendingReply || !replyText.trim()}
                      onClick={() => handleSendReply()}
                      className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {sendingReply ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" /> Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  </div>
  );
}

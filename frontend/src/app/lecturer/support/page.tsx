'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  HelpCircle,
  Users,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Phone,
  ExternalLink,
  ShieldCheck,
  FileText,
  Sparkles,
  Info,
  Loader2,
  Headphones,
  GraduationCap,
  X,
  AlertCircle,
} from 'lucide-react';
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
  messages?: TicketMessage[];
}

const LECTURER_ISSUE_CATEGORIES = [
  { value: 'TECHNICAL_LIVEKIT', label: 'Video Classroom / Audio Issues' },
  { value: 'STUDENT_REASSIGNMENT', label: 'Student Reassignment / Level Mismatch' },
  { value: 'PAYOUT_EARNINGS', label: 'Earnings, Payouts & Banking Inquiries' },
  { value: 'AVAILABILITY_SCHEDULE', label: 'Availability & Slot Adjustments' },
  { value: 'CURRICULUM_MATERIALS', label: 'Curriculum & Teaching Materials' },
  { value: 'GENERAL_LECTURER_SUPPORT', label: 'General Scholar Assistance' },
];

function LecturerSupportContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'contact';

  const [activeTab, setActiveTab] = useState<'contact' | 'tickets'>(
    initialTab === 'contact' || initialTab === 'tickets' ? initialTab : 'contact'
  );

  const [issueCategory, setIssueCategory] = useState(LECTURER_ISSUE_CATEGORIES[0].value);
  const [issueSubject, setIssueSubject] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSubmitted, setIssueSubmitted] = useState(false);

  // Fetch lecturer tickets with 10s silent background updates
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ['myLecturerSupportTickets'],
    queryFn: () => apiFetch('/support/my-tickets'),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [lecturerReply, setLecturerReply] = useState('');
  const [sendingLecturerReply, setSendingLecturerReply] = useState(false);

  // Sync selectedTicket with live query
  const currentSelectedTicket = selectedTicket
    ? tickets.find((t) => t.id === selectedTicket.id) || selectedTicket
    : null;

  const handleSendLecturerReply = async () => {
    if (!currentSelectedTicket || !lecturerReply.trim()) return;
    setSendingLecturerReply(true);
    try {
      await apiFetch(`/support/tickets/${currentSelectedTicket.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: lecturerReply.trim() }),
      });
      setLecturerReply('');
      await queryClient.invalidateQueries({ queryKey: ['myLecturerSupportTickets'] });
    } catch (err: any) {
      console.error(err);
    } finally {
      setSendingLecturerReply(false);
    }
  };

  const createTicketMutation = useMutation({
    mutationFn: (data: { type: string; reason: string }) =>
      apiFetch('/support/request', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLecturerSupportTickets'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueSubject.trim() || !issueDescription.trim()) return;
    const formattedReason = `[Scholar Support - ${issueCategory}] ${issueSubject.trim()}\n\n${issueDescription.trim()}`;
    createTicketMutation.mutate(
      { type: issueCategory, reason: formattedReason },
      {
        onSuccess: () => {
          setIssueSubmitted(true);
          setIssueSubject('');
          setIssueDescription('');
        },
      }
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold">Scholar Support & Coordination</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Submit scholar assistance inquiries, student reassignment requests, or connect with academic operations.
        </p>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex border-b border-[hsl(var(--border))] overflow-x-auto gap-2">
        {[
          { id: 'contact', label: 'Support Request Form', icon: MessageSquare },
          { id: 'tickets', label: `My Tickets (${tickets.length})`, icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all ${
                isActive
                  ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                  : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: FORM ─── */}
      {activeTab === 'contact' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="p-6 sm:p-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-[hsl(168,80%,26%)/0.12] text-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Submit Scholar Inquiry</h2>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                      Our academic operations team will assist you with student coordination, curriculum, or technical requirements.
                    </p>
                  </div>
                </div>

                {issueSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 rounded-2xl bg-[hsl(var(--success)/0.08)] border border-[hsl(var(--success)/0.3)] text-center space-y-3"
                  >
                    <div className="h-12 w-12 rounded-full bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))] mx-auto flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">Inquiry Submitted!</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto leading-relaxed">
                      Your inquiry has been logged. Our academic coordinators will review and reply within a few hours.
                    </p>
                    <button
                      onClick={() => setIssueSubmitted(false)}
                      className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[hsl(var(--primary))] text-white hover:opacity-90 transition-all"
                    >
                      Submit Another Request
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={issueCategory}
                        onChange={(e) => setIssueCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                      >
                        {LECTURER_ISSUE_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={issueSubject}
                        onChange={(e) => setIssueSubject(e.target.value)}
                        placeholder="Brief summary of your inquiry"
                        className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                        Details <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={5}
                        required
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                        placeholder="Please specify details (e.g. Student name if requesting reassignment, date/time, or specific technical questions)..."
                        className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={createTicketMutation.isPending || !issueSubject.trim() || !issueDescription.trim()}
                      className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {createTicketMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Send to Faculty Support
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Common Policy & Tips Card */}
            <div>
              <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3 text-xs">
                <h3 className="font-bold text-sm text-[hsl(var(--foreground))] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[hsl(var(--primary))]" /> Common Solutions & Policy
                </h3>
                <div className="space-y-3 text-xs text-[hsl(var(--muted-foreground))]">
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))] mb-0.5">Student Level or Schedule Conflict?</p>
                    <p className="leading-relaxed">You may request student reassignment without any penalty to your faculty standing.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))] mb-0.5">Classroom Audio/Video Issues?</p>
                    <p className="leading-relaxed">Check browser camera and mic permissions before entering LiveKit classrooms.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scholar WhatsApp Coordinator Card & Faculty Hotline Card Below Desk */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scholar WhatsApp Coordinator Card */}
            <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#25D366]/5 rounded-bl-full pointer-events-none" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">Scholar WhatsApp Coordinator</h3>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Academic Operations Desk</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#25D366] animate-pulse" /> Fastest Channel
                </span>
              </div>

              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Reach the Academic Operations coordinator on WhatsApp for immediate assistance regarding live sessions, slot releases, or student attendance.
              </p>

              <div className="space-y-1.5 p-3 rounded-xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">Operating Hours:</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">Mon – Sat: 8:00 AM – 10:00 PM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">Typical Response:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Within 10 minutes</span>
                </div>
              </div>

              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-xs text-white bg-[#25D366] hover:bg-[#20ba59] shadow-md shadow-[#25D366]/20 transition-all hover:scale-[1.01]"
              >
                <Phone className="h-3.5 w-3.5" /> Message WhatsApp Coordinator <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </a>
            </div>

            {/* Faculty Hotline Card */}
            <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm space-y-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">Faculty Direct Hotline</h3>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Toll-Free Telephone Line</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                  Coming Soon
                </span>
              </div>

              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Dedicated telephone lines for scholars will be published shortly. For immediate assistance right now, please reach out on WhatsApp.
              </p>

              <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">Academic Desk Email:</span>
                <a
                  href="mailto:support@ilmconnect.com"
                  className="font-semibold text-[hsl(var(--primary))] hover:underline"
                >
                  support@ilmconnect.com
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: TICKETS ─── */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-bold text-lg text-[hsl(var(--foreground))]">Scholar Ticket History</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Track previous communications, administrative replies, and resolution status for your requests.
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] self-start sm:self-auto">
                {tickets.length} {tickets.length === 1 ? 'Ticket' : 'Tickets'} Total
              </span>
            </div>

            {ticketsLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Clock className="h-10 w-10 text-[hsl(var(--muted-foreground)/0.4)] mx-auto" />
                <p className="text-sm font-semibold">No faculty tickets logged yet</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                  If you experience classroom technical issues or need student reassignment, submit a request via the form above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
                <table className="w-full min-w-[700px] text-left">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Subject & Details</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Operations Replies</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {tickets.map((t) => {
                      const isResolved = t.status === 'RESOLVED';
                      const isInReview = t.status === 'IN_REVIEW';
                      const msgCount = t.messages?.length || 0;
                      const hasAdminReply = t.messages?.some(
                        (m) => m.senderRole === 'ADMIN' || m.senderRole === 'SUPER_ADMIN'
                      );

                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTicket(t)}
                          className="hover:bg-[hsl(var(--muted)/0.4)] cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                              {t.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-xs font-medium text-[hsl(var(--foreground))] line-clamp-1 max-w-[280px]">
                              {t.reason || 'No description provided'}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {hasAdminReply ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                                <MessageSquare className="h-3 w-3" /> {msgCount} {msgCount === 1 ? 'Message' : 'Messages'} (Reply from Admin)
                              </span>
                            ) : msgCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] font-bold text-[11px]">
                                <MessageSquare className="h-3 w-3" /> {msgCount} {msgCount === 1 ? 'Message' : 'Messages'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Awaiting initial reply</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                isResolved
                                  ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
                                  : isInReview
                                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {isResolved ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicket(t);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] group-hover:bg-[hsl(var(--primary))] group-hover:text-white transition-all"
                            >
                              <MessageSquare className="h-3.5 w-3.5" /> View & Chat
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── LECTURER TICKET DETAIL & REPLY MODAL ─── */}
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
                className="w-full max-w-2xl max-h-[85vh] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto"
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--muted)/0.3)] shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300">
                      {currentSelectedTicket.type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        currentSelectedTicket.status === 'RESOLVED'
                          ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {currentSelectedTicket.status}
                    </span>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    Logged on {new Date(currentSelectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedTicket(null)}
                  className="h-8 w-8 rounded-full hover:bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--muted-foreground))] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Conversation Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Original Reason Box */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Original Inquired Details
                  </h4>
                  <div className="p-4 rounded-2xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))] whitespace-pre-line leading-relaxed">
                    {currentSelectedTicket.reason || 'No description provided.'}
                  </div>
                </div>

                {/* Message Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                    <span>Conversation with Operations Desk</span>
                    <span className="text-[11px] font-normal lowercase">
                      {currentSelectedTicket.messages?.length || 0} messages
                    </span>
                  </h4>

                  <div className="space-y-3">
                    {(!currentSelectedTicket.messages || currentSelectedTicket.messages.length === 0) && (
                      <div className="p-5 rounded-2xl bg-[hsl(var(--muted)/0.2)] border border-dashed border-[hsl(var(--border))] text-center text-xs text-[hsl(var(--muted-foreground))]">
                        Your request has been routed to Academic Operations. An administrator will review and post updates here.
                      </div>
                    )}

                    {currentSelectedTicket.messages?.map((msg) => {
                      const isAdminSender =
                        msg.senderRole === 'ADMIN' || msg.senderRole === 'SUPER_ADMIN';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAdminSender ? 'items-start' : 'items-end'}`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))] mb-1 px-1">
                            <span className="font-bold text-[hsl(var(--foreground))]">
                              {isAdminSender ? 'Academic Operations' : 'You'}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div
                            className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                              isAdminSender
                                ? 'bg-gradient-to-br from-purple-700 to-indigo-800 text-white shadow-sm rounded-tl-none'
                                : 'bg-[hsl(var(--muted)/0.8)] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-tr-none'
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

              {/* Reply Composer */}
              <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] space-y-3 shrink-0">
                <textarea
                  rows={2}
                  value={lecturerReply}
                  onChange={(e) => setLecturerReply(e.target.value)}
                  placeholder="Type a reply message to Academic Operations..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] placeholder:text-[hsl(var(--muted-foreground))]"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Updates in real-time every 10 seconds.
                  </span>
                  <button
                    type="button"
                    disabled={sendingLecturerReply || !lecturerReply.trim()}
                    onClick={handleSendLecturerReply}
                    className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {sendingLecturerReply ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" /> Send Reply to Admin
                      </>
                    )}
                  </button>
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

export default function LecturerSupportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      }
    >
      <LecturerSupportContent />
    </Suspense>
  );
}

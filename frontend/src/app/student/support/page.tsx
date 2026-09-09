'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  HelpCircle,
  RefreshCw,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  FileText,
  Sparkles,
  ChevronRight,
  Info,
  ArrowRight,
  Loader2,
  Headphones,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SupportTicket {
  id: string;
  userId: string;
  type: string;
  reason: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

const LECTURER_CHANGE_REASONS = [
  'Scheduling / Timing mismatch with my routine',
  'Prefer a different teaching pace (slower / faster)',
  'Language or accent preference for explanation',
  'Need specific specialization (e.g. Advanced Tajweed, Hifz, Qirat)',
  'Prefer a different teaching style or approach',
  'Other personal reason',
];

const ISSUE_CATEGORIES = [
  { value: 'TECHNICAL_ISSUE', label: 'Technical & Video Call Issues' },
  { value: 'BOOKING_SESSION', label: 'Booking & Scheduling Help' },
  { value: 'BILLING_PAYMENT', label: 'Billing, Fees & Subscription' },
  { value: 'COURSE_MATERIALS', label: 'Curriculum & Study Materials' },
  { value: 'FEEDBACK_SUGGESTION', label: 'Feedback & Improvement Idea' },
  { value: 'GENERAL_SUPPORT', label: 'General Questions & Other' },
];

function StudentSupportContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'change-lecturer';

  const [activeTab, setActiveTab] = useState<'change-lecturer' | 'contact' | 'direct' | 'tickets'>(
    initialTab === 'change-lecturer' || initialTab === 'contact' || initialTab === 'direct' || initialTab === 'tickets'
      ? initialTab
      : 'change-lecturer'
  );

  // Form states for Lecturer Change Request
  const [changeReason, setChangeReason] = useState(LECTURER_CHANGE_REASONS[0]);
  const [changeDetails, setChangeDetails] = useState('');
  const [preferredDays, setPreferredDays] = useState('');
  const [changeSubmitted, setChangeSubmitted] = useState(false);

  // Form states for General Issue Contact Form
  const [issueCategory, setIssueCategory] = useState(ISSUE_CATEGORIES[0].value);
  const [issueSubject, setIssueSubject] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSubmitted, setIssueSubmitted] = useState(false);

  // Fetch Student Profile (to know assigned lecturer)
  const { data: profile } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: () => apiFetch('/profile/student'),
    enabled: !!user,
  });

  // Fetch user's support tickets
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ['mySupportTickets'],
    queryFn: () => apiFetch('/support/my-tickets'),
    enabled: !!user,
  });

  // Mutation: Submit Support Ticket
  const createTicketMutation = useMutation({
    mutationFn: (data: { type: string; reason: string }) =>
      apiFetch('/support/request', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySupportTickets'] });
    },
  });

  const assignedLecturer = profile?.assignedLecturer;

  const handleChangeLecturerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedReason = `Reason: ${changeReason}\nPreferences: ${preferredDays || 'Flexible'}\nAdditional Notes: ${changeDetails || 'None provided'}`;
    createTicketMutation.mutate(
      { type: 'LECTURER_CHANGE', reason: formattedReason },
      {
        onSuccess: () => {
          setChangeSubmitted(true);
          setChangeDetails('');
          setPreferredDays('');
        },
      }
    );
  };

  const handleGeneralIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueSubject.trim() || !issueDescription.trim()) return;
    const formattedReason = `[${issueCategory}] ${issueSubject.trim()}\n\n${issueDescription.trim()}`;
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
      {/* ─── Hero Banner with Islamic Aesthetic ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(168,85%,22%)] via-[hsl(168,75%,28%)] to-[hsl(168,60%,36%)] text-white p-6 sm:p-10 shadow-xl shadow-[hsl(168,80%,26%)/0.15]">
        {/* Decorative Background Mosque / Star Glow */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top_right,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-emerald-100 border border-white/20 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            IlmConnect Care & Student Advisory
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            How can we support your Quranic journey?
          </h1>
          <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
            Whether you need to adjust your learning scholar, report a technical issue, or speak with student advisory on WhatsApp, we are here to assist you promptly.
          </p>
        </div>
      </div>

      {/* ─── 3 Key Action Quick Cards (TL Requirements) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Change Lecturer */}
        <button
          onClick={() => {
            setActiveTab('change-lecturer');
            setChangeSubmitted(false);
          }}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'change-lecturer'
              ? 'bg-[hsl(var(--card))] border-[hsl(var(--primary))] shadow-lg ring-1 ring-[hsl(var(--primary))]'
              : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-11 w-11 rounded-xl bg-[hsl(168,80%,26%)/0.12] text-[hsl(var(--primary))] flex items-center justify-center font-bold">
              <RefreshCw className={`h-5 w-5 ${activeTab === 'change-lecturer' ? 'rotate-180 transition-transform duration-700' : ''}`} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
              1-Click Request
            </span>
          </div>
          <h2 className="font-bold text-base mb-1 text-[hsl(var(--foreground))]">Change Lecturer Request</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            Need a different teaching pace or timing? Request a seamless, confidential scholar reassignment.
          </p>
        </button>

        {/* Card 2: Contact Form */}
        <button
          onClick={() => {
            setActiveTab('contact');
            setIssueSubmitted(false);
          }}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'contact'
              ? 'bg-[hsl(var(--card))] border-[hsl(var(--primary))] shadow-lg ring-1 ring-[hsl(var(--primary))]'
              : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              Submit Issue
            </span>
          </div>
          <h2 className="font-bold text-base mb-1 text-[hsl(var(--foreground))]">Contact Form for Issues</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            Report technical errors, booking troubles, billing questions, or provide valuable feedback.
          </p>
        </button>

        {/* Card 3: WhatsApp & Phone Support */}
        <button
          onClick={() => setActiveTab('direct')}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'direct'
              ? 'bg-[hsl(var(--card))] border-[#25D366] shadow-lg ring-1 ring-[#25D366]'
              : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:border-[#25D366]/60 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-11 w-11 rounded-xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center font-bold">
              <Phone className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366]">
              Direct Contact
            </span>
          </div>
          <h2 className="font-bold text-base mb-1 text-[hsl(var(--foreground))]">Direct WhatsApp & Hotline</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            Chat instantly with support coordinators via WhatsApp or view hotline information.
          </p>
        </button>
      </div>

      {/* ─── Tabs Navigation Bar ─── */}
      <div className="flex border-b border-[hsl(var(--border))] overflow-x-auto gap-2">
        {[
          { id: 'change-lecturer', label: 'Change Lecturer Request', icon: RefreshCw },
          { id: 'contact', label: 'Contact Support Form', icon: MessageSquare },
          { id: 'direct', label: 'WhatsApp & Direct Hotline', icon: Phone },
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

      {/* ─── TAB 1: CHANGE LECTURER REQUEST ─── */}
      {activeTab === 'change-lecturer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 sm:p-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-[hsl(168,80%,26%)/0.12] text-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Request a Lecturer Change</h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                    We want your learning journey to be completely comfortable. If you wish to be matched with a different scholar, please share your preferences below.
                  </p>
                </div>
              </div>

              {changeSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-2xl bg-[hsl(var(--success)/0.08)] border border-[hsl(var(--success)/0.3)] text-center space-y-3"
                >
                  <div className="h-12 w-12 rounded-full bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))] mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">Request Received Successfully!</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto leading-relaxed">
                    Our academic coordinator has received your change request. We will review our scholar roster to find the ideal match for your preferred timing and notify you within 24 hours.
                  </p>
                  <button
                    onClick={() => setChangeSubmitted(false)}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[hsl(var(--primary))] text-white hover:opacity-90 transition-all"
                  >
                    Submit Another Note
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleChangeLecturerSubmit} className="space-y-5">
                  {/* Current Lecturer Card */}
                  <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(168,65%,45%)] to-[hsl(168,50%,55%)] flex items-center justify-center text-white font-bold text-sm">
                        {assignedLecturer?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ML'}
                      </div>
                      <div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Current Assigned Scholar</p>
                        <p className="font-bold text-sm text-[hsl(var(--foreground))]">
                          {assignedLecturer?.fullName || 'Assigned Maulavi'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-[10px] font-semibold">
                      Active
                    </span>
                  </div>

                  {/* Primary Reason Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                      Reason for Request <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      {LECTURER_CHANGE_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preferred Days / Timings */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                      Preferred Days & Times (Optional)
                    </label>
                    <input
                      type="text"
                      value={preferredDays}
                      onChange={(e) => setPreferredDays(e.target.value)}
                      placeholder="e.g. Weekday evenings after 7:00 PM, or Saturday mornings"
                      className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>

                  {/* Additional Notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                      Specific Requirements or Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={changeDetails}
                      onChange={(e) => setChangeDetails(e.target.value)}
                      placeholder="Share any details about your preferred teaching style, language preference, or study goals..."
                      className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>

                  {/* Safeguarding & Confidentiality Banner */}
                  <div className="p-3.5 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-start gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                    <ShieldCheck className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-[hsl(var(--foreground))]">100% Confidential:</strong> Your feedback is reviewed exclusively by the head administration team. Your current scholar is never notified of personal reasons or criticisms.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={createTicketMutation.isPending}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createTicketMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting Request...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Submit Lecturer Change Request
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
              <h3 className="font-bold text-sm text-[hsl(var(--foreground))] flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[hsl(var(--primary))]" /> How Change Requests Work
              </h3>
              <ol className="text-xs text-[hsl(var(--muted-foreground))] space-y-3 list-decimal list-inside leading-relaxed">
                <li>
                  <strong className="text-[hsl(var(--foreground))]">Review:</strong> Our academic team examines your preferred timings and language requirements.
                </li>
                <li>
                  <strong className="text-[hsl(var(--foreground))]">Matching:</strong> We assign an accredited scholar from our roster who specializes in your Quranic goals.
                </li>
                <li>
                  <strong className="text-[hsl(var(--foreground))]">Continuity:</strong> Your study progress, lesson notes, and completed session blocks transfer seamlessly.
                </li>
              </ol>
            </div>

            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 text-amber-900 dark:text-amber-200">
              <p className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <Clock className="h-4 w-4" /> Average Turnaround Time
              </p>
              <p className="leading-relaxed">
                Scholar reassignments are typically confirmed within 12 to 24 hours without disrupting your existing booking schedule.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: GENERAL CONTACT FORM ─── */}
      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 sm:p-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Contact Support Desk</h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                    Have an issue with your account, classes, or billing? Submit a ticket and our support specialists will help you resolve it.
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
                  <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">Support Ticket Logged!</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto leading-relaxed">
                    Your inquiry has been submitted directly to our support team. You can check the status of your ticket anytime under the &ldquo;My Tickets&rdquo; tab.
                  </p>
                  <div className="flex justify-center gap-3 mt-4">
                    <button
                      onClick={() => setIssueSubmitted(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] transition-all"
                    >
                      Submit Another Issue
                    </button>
                    <button
                      onClick={() => setActiveTab('tickets')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[hsl(var(--primary))] text-white hover:opacity-90 transition-all"
                    >
                      View My Tickets →
                    </button>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleGeneralIssueSubmit} className="space-y-5">
                  {/* Category Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                      Issue Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={issueCategory}
                      onChange={(e) => setIssueCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      {ISSUE_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject Line */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                      Subject / Summary <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={issueSubject}
                      onChange={(e) => setIssueSubject(e.target.value)}
                      placeholder="e.g. Video call disconnected during Tajweed lesson"
                      className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                      Detailed Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      placeholder="Please provide specifics: when it happened, error messages, or what you need assistance with..."
                      className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={createTicketMutation.isPending || !issueSubject.trim() || !issueDescription.trim()}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createTicketMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting Ticket...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Submit Support Ticket
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick FAQ / Info */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
              <h3 className="font-bold text-sm text-[hsl(var(--foreground))] flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[hsl(var(--primary))]" /> Common Solutions
              </h3>
              <div className="space-y-3 text-xs text-[hsl(var(--muted-foreground))]">
                <div>
                  <p className="font-semibold text-[hsl(var(--foreground))] mb-0.5">Camera or Microphone Issues?</p>
                  <p className="leading-relaxed">Check your browser site permissions to allow audio/video for IlmConnect before entering the room.</p>
                </div>
                <div>
                  <p className="font-semibold text-[hsl(var(--foreground))] mb-0.5">Need to Reschedule a Class?</p>
                  <p className="leading-relaxed">You can cancel or reschedule any scheduled session directly from your Sessions calendar up to 6 hours before class starts.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: DIRECT WHATSAPP & PHONE HOTLINE ─── */}
      {activeTab === 'direct' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WhatsApp Direct Card */}
          <div className="p-6 sm:p-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#25D366]/5 rounded-bl-full pointer-events-none" />

            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center flex-shrink-0">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#25D366] animate-pulse" /> Recommended
                </span>
                <h2 className="text-xl font-bold mt-1">Direct WhatsApp Support</h2>
              </div>
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Connect directly with our Student Advisory & Technical Desk on WhatsApp for fast, friendly responses regarding your class schedules, bookings, or questions.
            </p>

            <div className="space-y-2 p-4 rounded-xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Operating Hours:</span>
                <span className="font-semibold">Mon – Sat: 8:00 AM – 10:00 PM (GMT+5:30)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Typical Response Time:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Within 15 minutes</span>
              </div>
            </div>

            {/* WhatsApp Link Button */}
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-bold text-sm text-white bg-[#25D366] hover:bg-[#20ba59] shadow-lg shadow-[#25D366]/20 transition-all hover:scale-[1.01]"
            >
              <Phone className="h-4 w-4" /> Open WhatsApp Support <ExternalLink className="h-4 w-4 opacity-80" />
            </a>
          </div>

          {/* Support Phone Hotline Card (No number added yet as instructed) */}
          <div className="p-6 sm:p-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm space-y-5 relative overflow-hidden">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <Headphones className="h-6 w-6" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                  Coming Soon
                </span>
                <h2 className="text-xl font-bold mt-1">Direct Phone Hotline</h2>
              </div>
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Our toll-free telephone support service is currently undergoing line integration. Official telephone contact numbers will be activated and published here shortly.
            </p>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Support Telephone Line
              </p>
              <p className="leading-relaxed">
                Direct phone numbers will be available soon. For immediate assistance right now, please use the WhatsApp button or submit an online support request.
              </p>
            </div>

            {/* Email backup */}
            <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">Official Support Email:</span>
              <a
                href="mailto:support@ilmconnect.com"
                className="font-semibold text-[hsl(var(--primary))] hover:underline"
              >
                support@ilmconnect.com
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: MY TICKETS ─── */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <h2 className="font-bold text-lg mb-1">Your Support History</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Track the progress of your submitted inquiries and lecturer change requests.
            </p>

            {ticketsLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="h-14 w-14 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center mx-auto">
                  <Clock className="h-6 w-6" />
                </div>
                <p className="font-semibold text-sm">No support tickets found</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                  You haven&apos;t submitted any requests yet. If you need any assistance, use the tabs above.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--border))] mt-4">
                {tickets.map((t) => {
                  const isResolved = t.status === 'RESOLVED';
                  const isPending = t.status === 'PENDING';
                  return (
                    <div key={t.id} className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                          {t.type.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              isResolved
                                ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
                                : isPending
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'bg-red-500/15 text-red-600'
                            }`}
                          >
                            {t.status}
                          </span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-[hsl(var(--foreground))] whitespace-pre-line leading-relaxed">
                        {t.reason || 'No description provided'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentSupportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      }
    >
      <StudentSupportContent />
    </Suspense>
  );
}

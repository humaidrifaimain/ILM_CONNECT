'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { toast } from '@/components/ui/toast';
import { ScheduleCalendar } from '@/components/classroom/schedule-calendar';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useDialogAccessibility } from '@/lib/use-dialog-accessibility';
import { getSessionStatus } from '@/lib/session-status';
import {
  Search,
  Clock,
  AlertTriangle,
  FileText,
  CalendarClock,
  CalendarX,
  Play,
  X,
  UserX,
  Lock,
} from 'lucide-react';

type StatusFilter = 'all' | 'scheduled' | 'completed' | 'no_show_student' | 'no_show_lecturer' | 'canceled';

type LecturerSession = {
  id: string;
  startsAt: string;
  endsAt?: string;
  status: string;
  student?: { fullName: string };
  tier?: string;
  notes?: string | { sharedNotes?: string };
  rescheduledAt?: string | null;
};


const TIME_OPTIONS = Array.from({ length: 69 }, (_, index) => {
  const start = new Date(2000, 0, 1, 10, index * 10);
  const end = new Date(start.getTime() + 40 * 60_000);
  const format = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return { value: format(start), label: `${format(start)} to ${format(end)}` };
});

export default function LecturerSessionsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const queryClient = useQueryClient();
  const { data: bookings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['lecturerBookings'],
    queryFn: () => apiFetch('/bookings/lecturer'),
  });

  const { data: shiftProfile } = useQuery<{ hourlyAvailabilityJson?: number[] }>({
    queryKey: ['lecturerProfile'],
    queryFn: () => apiFetch('/profile/lecturer'),
  });
  const shiftHours = Array.isArray(shiftProfile?.hourlyAvailabilityJson)
    ? shiftProfile.hourlyAvailabilityJson.map(Number)
    : [];

  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession = bookings.find((session: { id: string }) => session.id === selectedSessionId);
  const sessionDialog = useDialogAccessibility(!!selectedSession, () => setSelectedSessionId(null));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  // Notes Modal State
  const [notesModal, setNotesModal] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Reschedule Modal State
  const [rescheduleModal, setRescheduleModal] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Cancel Modal State
  const [cancelModal, setCancelModal] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Absent Modal State
  const [absentModal, setAbsentModal] = useState<any>(null);
  const [absentReason, setAbsentReason] = useState('');
  const [isSubmittingAbsent, setIsSubmittingAbsent] = useState(false);
  const [absentError, setAbsentError] = useState<string | null>(null);
  const notesDialog = useDialogAccessibility(!!notesModal, () => { if (!isSavingNotes) setNotesModal(null); });
  const rescheduleDialog = useDialogAccessibility(!!rescheduleModal, () => { if (!isRescheduling) setRescheduleModal(null); });
  const cancelDialog = useDialogAccessibility(!!cancelModal, () => { if (!isCanceling) setCancelModal(null); });
  const absentDialog = useDialogAccessibility(!!absentModal, () => { if (!isSubmittingAbsent) setAbsentModal(null); });

  const filtered = bookings.filter((s: any) => {
    const studentName = s.student?.fullName || 'Unknown Student';
    const subject = s.tier || 'Session';
    const matchSearch =
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      subject.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status.toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSaveNotes = async () => {
    if (!notesModal) return;
    setIsSavingNotes(true);
    try {
      await apiFetch(`/bookings/${notesModal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: noteText }),
      });
      await queryClient.invalidateQueries({ queryKey: ['lecturerBookings'] });
      toast.success('Notes Saved', 'Session notes updated successfully.');
      setNotesModal(null);
    } catch (err: any) {
      toast.error('Failed to Save Notes', err?.message || 'Please check your connection.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleModal || !rescheduleDate) {
      setRescheduleError('Please select a new date.');
      toast.error('Date Required', 'Please select a new date.');
      return;
    }

    setIsRescheduling(true);
    setRescheduleError(null);

    try {
      const [timePart, meridiem] = rescheduleTime.split(' ');
      const [hStr, mStr] = timePart.split(':');
      let hour = parseInt(hStr, 10);
      if (meridiem === 'PM' && hour !== 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;

      const [year, month, day] = rescheduleDate.split('-');
      const newStartsAt = new Date(Number(year), Number(month) - 1, Number(day), hour, parseInt(mStr, 10));

      if (newStartsAt <= new Date()) {
        setRescheduleError('Please select a future date and time.');
        toast.error('Invalid Date', 'Please select a future date and time.');
        setIsRescheduling(false);
        return;
      }

      await apiFetch(`/bookings/${rescheduleModal.id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({
          startsAt: newStartsAt.toISOString(),
          reason: rescheduleReason || 'Lecturer schedule adjustment',
        }),
      });

      await queryClient.invalidateQueries({ queryKey: ['lecturerBookings'] });
      toast.success('Session Rescheduled', 'Student has been notified of the new schedule.');
      setRescheduleModal(null);
      setRescheduleReason('');
    } catch (err: any) {
      const msg = err.message || 'Failed to reschedule session';
      setRescheduleError(msg);
      toast.error('Reschedule Failed', msg);
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelModal) return;
    setIsCanceling(true);
    setCancelError(null);

    try {
      await apiFetch(`/bookings/${cancelModal.id}`, {
        method: 'DELETE',
        body: JSON.stringify({
          reason: cancelReason || 'Lecturer cancellation',
        }),
      });

      await queryClient.invalidateQueries({ queryKey: ['lecturerBookings'] });
      toast.success('Session Cancelled', 'The session was successfully cancelled.');
      setCancelModal(null);
      setCancelReason('');
    } catch (err: any) {
      const msg = err.message || 'Failed to cancel session';
      setCancelError(msg);
      toast.error('Cancellation Failed', msg);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleMarkAbsentSubmit = async () => {
    if (!absentModal) return;
    setIsSubmittingAbsent(true);
    setAbsentError(null);

    try {
      await apiFetch(`/bookings/${absentModal.id}/absent`, {
        method: 'POST',
        body: JSON.stringify({
          reason: absentReason || 'Student did not attend the scheduled session.',
        }),
      });

      await queryClient.invalidateQueries({ queryKey: ['lecturerBookings'] });
      toast.success('Student Marked Absent', 'Attendance recorded. Student has been notified.');
      setAbsentModal(null);
      setAbsentReason('');
    } catch (err: any) {
      const msg = err.message || 'Failed to mark student as absent';
      setAbsentError(msg);
      toast.error('Action Failed', msg);
    } finally {
      setIsSubmittingAbsent(false);
    }
  };

  if (isError) return <div role="alert" className="space-y-3"><p>Unable to load your sessions.</p><button className="rounded-lg border px-4 py-2" onClick={() => void refetch()}>Retry</button></div>;
  const renderSessionCard = (s: LecturerSession) => {
    const startsAtDate = new Date(s.startsAt);
    const endsAtDate = new Date(s.endsAt || new Date(startsAtDate.getTime() + 40 * 60 * 1000));
    const now = new Date();
    const startsAtTime = startsAtDate.getTime();
    const endsAtTime = endsAtDate.getTime();
    const nowTime = now.getTime();

    const isPast = endsAtTime < nowTime;
    const effectiveStatus = s.status;

    const cfg = getSessionStatus(effectiveStatus, s.rescheduledAt);
    const studentName = s.student?.fullName || 'Unknown Student';
    const subject = s.tier || 'Session';
    const isScheduled = effectiveStatus === 'SCHEDULED' && !isPast;

    // Lecturer 6-hour policy:
    // 1. Reschedule: Allowed at least 6 hours before start, OR within 6 hours after class ends.
    const isBeforeRescheduleAllowed = startsAtTime - nowTime >= 6 * 60 * 60 * 1000;
    const isAfterRescheduleAllowed = nowTime >= endsAtTime && (nowTime - endsAtTime) <= 6 * 60 * 60 * 1000;
    const canReschedule = ['SCHEDULED', 'IN_PROGRESS', 'NO_SHOW_STUDENT'].includes(s.status) && (isBeforeRescheduleAllowed || isAfterRescheduleAllowed);

    // 2. Pre-session lock indicator (< 6h before start, while still upcoming):
    const isPreSessionLocked = !isPast && !isBeforeRescheduleAllowed && s.status !== 'CANCELED';

    // 3. Cancellation: Allowed strictly >= 6 hours before start
    const canCancel = isScheduled && isBeforeRescheduleAllowed;

    return (
      <div
        key={s.id}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm transition-all hover:border-[hsl(var(--primary)/0.3)]"
      >
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[hsl(168,80%,26%/0.2)] to-[hsl(168,60%,35%/0.1)] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[hsl(var(--primary))] uppercase border border-[hsl(168,80%,26%/0.2)]">
            {studentName.substring(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-words font-bold text-base text-[hsl(var(--foreground))]">{studentName}</span>
              <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${cfg.color} whitespace-nowrap`}>
                {cfg.label}
              </span>
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{subject}</div>
            <div className="text-xs text-[hsl(var(--foreground)/0.8)] font-medium mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
              {mounted ? (
                `${startsAtDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })} · ${startsAtDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })} – ${endsAtDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              ) : (
                <span>Loading date...</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[hsl(var(--border))]">
          {['SCHEDULED', 'IN_PROGRESS'].includes(s.status) && (
            <Link
              href={`/lecturer/sessions/${s.id}/room`}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#095F46] hover:bg-[#074c38] hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Join Class
            </Link>
          )}

          {/* Reschedule button: available >= 6h before start OR <= 6h after completion */}
          {canReschedule && (
            <button
              onClick={() => {
                setSelectedSessionId(null);
                setRescheduleModal(s);
                const sessionStartDate = new Date(s.startsAt);
                const todayStr = new Date().toISOString().split('T')[0];
                const initialDate = sessionStartDate < new Date() ? todayStr : sessionStartDate.toISOString().split('T')[0];
                setRescheduleDate(initialDate);
                setRescheduleReason('');
                setRescheduleError(null);
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-amber-200 dark:border-amber-900/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 transition-all flex items-center gap-1.5"
              title={isAfterRescheduleAllowed ? 'Reschedule within 6-hour post-session window' : 'Reschedule Session (6+ hours before start)'}
            >
              <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
              {isAfterRescheduleAllowed ? 'Reschedule (6h window)' : 'Reschedule'}
            </button>
          )}

          {startsAtTime <= nowTime && ['SCHEDULED', 'IN_PROGRESS'].includes(s.status) && (
            <button
              onClick={() => {
                setSelectedSessionId(null);
                setAbsentModal(s);
                setAbsentReason('');
                setAbsentError(null);
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-amber-200 dark:border-amber-900/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 transition-all flex items-center gap-1.5"
              title="Mark Student Absent"
            >
              <UserX className="h-3.5 w-3.5" /> Absent
            </button>
          )}

          {/* Cancel button: available strictly >= 6h before start */}
          {canCancel && (
            <button
              onClick={() => {
                setSelectedSessionId(null);
                setCancelModal(s);
                setCancelReason('');
                setCancelError(null);
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-900/40 bg-red-500/5 hover:bg-red-500/10 text-red-700 dark:text-red-400 transition-all flex items-center gap-1.5"
              title="Cancel Session (Allowed up to 6 hours before start)"
            >
              <CalendarX className="h-3.5 w-3.5" /> Cancel
            </button>
          )}

          {/* Locked notice within 6h of session start */}
          {isPreSessionLocked && (
            <Link
              href="/lecturer/support?tab=contact"
              className="px-3 py-2 rounded-xl text-xs font-medium border border-amber-200 dark:border-amber-900/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 transition-colors flex items-center gap-1.5"
              title="Locked within 6 hours before class. Contact Admin for emergency reschedule or cancel."
            >
              <Lock className="h-3.5 w-3.5 text-amber-500" /> Locked (&lt;6h) · Contact Support
            </Link>
          )}

          {(effectiveStatus === 'COMPLETED' || effectiveStatus === 'NO_SHOW_STUDENT') && (
            <button
              onClick={() => {
                setSelectedSessionId(null);
                setNotesModal(s);
                setNoteText(typeof s.notes === 'string' ? s.notes : s.notes?.sharedNotes || '');
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors flex items-center gap-1.5"
              title="View/Add Notes"
            >
              <FileText className="h-3.5 w-3.5" /> Notes
            </button>
          )}
        </div>
      </div>
    );

  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage your schedule, conduct live classes, and update student sessions.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search by student or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'scheduled', 'completed', 'no_show_student', 'canceled'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'
              }`}
            >
              {s === 'all' ? 'All' : s === 'no_show_student' ? 'Conducted No-show' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-stone-100 p-1 w-fit">
        {(['calendar', 'list'] as const).map(item => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)} className={`rounded-md px-4 py-2 text-sm capitalize ${view === item ? 'bg-white font-bold shadow-sm' : 'text-stone-600'}`}>{item}</button>)}
      </div>
      {view === 'calendar' && !isLoading && <ScheduleCalendar events={filtered.map((session: LecturerSession) => ({
        id: session.id, startsAt: session.startsAt, endsAt: session.endsAt,
        title: session.tier ? `${session.tier} session` : 'Quran session', subtitle: session.student?.fullName || 'Student',
        tone: session.status.toLowerCase() === 'completed' ? 'purple' as const : 'blue' as const,
        reserveBreak: session.status !== 'CANCELED',
        status: session.status, rescheduledAt: session.rescheduledAt,
        onClick: () => setSelectedSessionId(session.id),
      }))}
        visibleHours={shiftHours}
        isCellDisabled={(date) => date.getHours() < 10 || date.getHours() >= 22 || (shiftHours.length > 0 && !shiftHours.includes(date.getHours()))}
        getCellDisabledReason={(date) => date.getHours() < 10 || date.getHours() >= 22 || (shiftHours.length > 0 && !shiftHours.includes(date.getHours())) ? 'Outside your shift' : undefined}
        ariaLabel="Lecturer sessions calendar" />}
      {/* Sessions list */}
      <div className="space-y-3">
        {isLoading && (
          <LoadingScreen message="Loading Sessions..." subtitle="Fetching your scheduled and upcoming classes" />
        )}
        {!isLoading && view === 'list' &&
          filtered.map(renderSessionCard)}

        {view === 'list' && filtered.length === 0 && (
          <div className="p-12 rounded-2xl border border-dashed border-[hsl(var(--border))] text-center bg-[hsl(var(--card))]">
            <Clock className="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground)/0.6)] mb-3" />
            <p className="font-semibold text-base mb-1">No sessions found</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Try adjusting your status or search filters</p>
          </div>
        )}
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedSessionId(null)}>
          <div ref={sessionDialog} role="dialog" aria-modal="true" aria-label="Session details" tabIndex={-1} className="w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6 shadow-xl" onClick={event => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Session details</h2>
              <button type="button" aria-label="Close session details" onClick={() => setSelectedSessionId(null)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] focus-visible:outline-2 focus-visible:outline-[#095F46]"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            {renderSessionCard(selectedSession)}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setRescheduleModal(null)}
        >
          <div
            ref={rescheduleDialog} role="dialog" aria-modal="true" aria-label="Reschedule Session" tabIndex={-1}
            className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-lg">Reschedule Session</h3>
              </div>
              <button
                onClick={() => setRescheduleModal(null)}
                aria-label="Close reschedule dialog"
                className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
              Rescheduling for student{' '}
              <strong className="text-[hsl(var(--foreground))]">{rescheduleModal.student?.fullName}</strong>. The student
              will receive an immediate live pop-up notification, email, and WhatsApp update.
            </p>

            {rescheduleError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {rescheduleError}
              </div>
            )}

            <div className="p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Reschedule Policy:</span> Lecturers can reschedule up to 6 hours before class start, or within 6 hours after class concludes. Outside these windows, please contact Support.
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                  Select New Date
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                  Select New Time
                </label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                  Note / Reason for Student (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule conflict, moving 1 hour earlier"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRescheduleModal(null)}
                disabled={isRescheduling}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleSubmit}
                disabled={isRescheduling}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Session Modal */}
      {cancelModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setCancelModal(null)}
        >
          <div
            ref={cancelDialog} role="dialog" aria-modal="true" aria-label="Cancel Session" tabIndex={-1}
            className="bg-[hsl(var(--card))] rounded-2xl border border-red-500/20 shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <CalendarX className="h-5 w-5 text-red-500" />
                <h3 className="font-bold text-lg text-red-600 dark:text-red-400">Cancel Session</h3>
              </div>
              <button
                onClick={() => setCancelModal(null)}
                aria-label="Close cancellation dialog"
                className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
              Are you sure you want to cancel the session with{' '}
              <strong className="text-[hsl(var(--foreground))]">{cancelModal.student?.fullName}</strong>?
              The student will be notified immediately via live pop-up, email, and WhatsApp.
            </p>

            {cancelError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {cancelError}
              </div>
            )}

            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-800 dark:text-red-300">
              <span className="font-semibold">Cancellation Policy:</span> Lecturers can cancel scheduled classes up to 6 hours before start time. Inside 6 hours, please contact Support.
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                Reason for Cancellation (will be sent to student)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Unforeseen faculty engagement, please reschedule at your convenience..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCancelModal(null)}
                disabled={isCanceling}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50"
              >
                Keep Session
              </button>
              <button
                onClick={handleCancelSubmit}
                disabled={isCanceling}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isCanceling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Student Absent Modal */}
      {absentModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setAbsentModal(null)}
        >
          <div
            ref={absentDialog} role="dialog" aria-modal="true" aria-label="Record student absence" tabIndex={-1}
            className="bg-[hsl(var(--card))] rounded-2xl border border-amber-500/20 shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-lg text-amber-700 dark:text-amber-400">Mark Student Absent</h3>
              </div>
              <button
                onClick={() => setAbsentModal(null)}
                aria-label="Close attendance dialog"
                className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
              Mark student{' '}
              <strong className="text-[hsl(var(--foreground))]">{absentModal.student?.fullName || 'Student'}</strong> as absent for this scheduled class?
              This will record a <span className="font-semibold text-amber-600 dark:text-amber-400">Student No-Show</span>, update attendance history, and notify the student immediately.
            </p>

            {absentError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {absentError}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                Absence Reason / Remarks (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Student did not join within 15 minutes of scheduled time..."
                value={absentReason}
                onChange={(e) => setAbsentReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAbsentModal(null)}
                disabled={isSubmittingAbsent}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50"
              >
                Keep Session
              </button>
              <button
                onClick={handleMarkAbsentSubmit}
                disabled={isSubmittingAbsent}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingAbsent ? 'Marking Absent...' : 'Confirm Absent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setNotesModal(null)}
        >
          <div
            ref={notesDialog} role="dialog" aria-modal="true" aria-label="Session Notes" tabIndex={-1}
            className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-1">Session Notes</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              {notesModal.tier || 'Session'} · {notesModal.student?.fullName}
            </p>
            <textarea
              rows={4}
              aria-label="Session notes" maxLength={10000}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your notes about this session..."
              className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setNotesModal(null)}
                disabled={isSavingNotes}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#095F46] hover:bg-[#074c38] transition-colors disabled:opacity-50"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

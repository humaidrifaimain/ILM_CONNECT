'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import {
  Video,
  Search,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  CalendarClock,
  CalendarX,
  Play,
  X,
  ChevronRight,
} from 'lucide-react';

type StatusFilter = 'all' | 'scheduled' | 'completed' | 'no_show_student' | 'no_show_lecturer' | 'canceled';

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  canceled: { label: 'Canceled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  no_show_student: { label: 'No-Show (Student)', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  no_show_lecturer: { label: 'No-Show (Lecturer)', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const TIME_OPTIONS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM',
];

export default function LecturerSessionsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const queryClient = useQueryClient();
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['lecturerBookings'],
    queryFn: () => apiFetch('/bookings/lecturer'),
  });

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
      queryClient.invalidateQueries({ queryKey: ['lecturerBookings'] });
      setNotesModal(null);
    } catch {
      alert('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleModal || !rescheduleDate) {
      setRescheduleError('Please select a new date.');
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
      setRescheduleModal(null);
      setRescheduleReason('');
    } catch (err: any) {
      setRescheduleError(err.message || 'Failed to reschedule session');
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
      setCancelModal(null);
      setCancelReason('');
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel session');
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sessions Management</h1>
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
              {s === 'all' ? 'All' : s === 'no_show_student' ? 'No-Show' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        {isLoading && <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading sessions...</div>}
        {!isLoading &&
          filtered.map((s: any) => {
            const cfg = statusConfig[s.status.toLowerCase()] || statusConfig.scheduled;
            const studentName = s.student?.fullName || 'Unknown Student';
            const subject = s.tier || 'Session';
            const isScheduled = s.status === 'SCHEDULED';
            const isInProgress = s.status === 'IN_PROGRESS';

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
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[hsl(var(--foreground))] truncate">{studentName}</span>
                      <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${cfg.color} whitespace-nowrap`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{subject}</div>
                    <div className="text-xs text-[hsl(var(--foreground)/0.8)] font-medium mt-1 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                      {mounted ? (
                        `${new Date(s.startsAt).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })} · ${new Date(s.startsAt).toLocaleTimeString('en-US', {
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
                  {(isScheduled || isInProgress) && (
                    <Link
                      href={`/lecturer/sessions/${s.id}/room`}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Join Class
                    </Link>
                  )}

                  {isScheduled && (
                    <>
                      <button
                        onClick={() => {
                          setRescheduleModal(s);
                          setRescheduleDate(new Date(s.startsAt).toISOString().split('T')[0]);
                          setRescheduleError(null);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] transition-all flex items-center gap-1.5"
                        title="Reschedule Session"
                      >
                        <CalendarClock className="h-3.5 w-3.5 text-amber-500" /> Reschedule
                      </button>

                      <button
                        onClick={() => {
                          setCancelModal(s);
                          setCancelError(null);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-900/40 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-all flex items-center gap-1.5"
                        title="Cancel Session"
                      >
                        <CalendarX className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </>
                  )}

                  {s.status === 'COMPLETED' && (
                    <button
                      onClick={() => {
                        setNotesModal(s);
                        setNoteText(s.notes?.sharedNotes || s.notes || '');
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
          })}

        {filtered.length === 0 && (
          <div className="p-12 rounded-2xl border border-dashed border-[hsl(var(--border))] text-center bg-[hsl(var(--card))]">
            <Clock className="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground)/0.6)] mb-3" />
            <p className="font-semibold text-base mb-1">No sessions found</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Try adjusting your status or search filters</p>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setRescheduleModal(null)}
        >
          <div
            className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-md w-full p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-lg">Reschedule Session</h3>
              </div>
              <button
                onClick={() => setRescheduleModal(null)}
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

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                  Select New Date
                </label>
                <input
                  type="date"
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
                    <option key={t} value={t}>
                      {t}
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
            className="bg-[hsl(var(--card))] rounded-2xl border border-red-500/20 shadow-2xl max-w-md w-full p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <CalendarX className="h-5 w-5 text-red-500" />
                <h3 className="font-bold text-lg text-red-600 dark:text-red-400">Cancel Session</h3>
              </div>
              <button
                onClick={() => setCancelModal(null)}
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

      {/* Notes Modal */}
      {notesModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setNotesModal(null)}
        >
          <div
            className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-xl max-w-md w-full p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-1">Session Notes</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              {notesModal.tier || 'Session'} — {notesModal.student?.fullName}
            </p>
            <textarea
              rows={4}
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
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] disabled:opacity-50"
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

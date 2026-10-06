'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Video, X, Calendar, List, Edit, Trash2, AlertTriangle, Lock, Play, HelpCircle, MessageSquareText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ScheduleCalendar } from '@/components/classroom/schedule-calendar';
import { BookingCalendar } from '@/components/classroom/booking-calendar';
import { StudentIconTile, StudentPageHeader, studentUi } from '@/components/student/student-dashboard-ui';
import { useDialogAccessibility } from '@/lib/use-dialog-accessibility';

type ViewMode = 'list' | 'calendar';

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-[#e8f0ed] text-[#095F46]' },
  completed: { label: 'Completed', color: 'bg-[#10BF8D]/12 text-[#095F46]' },
  canceled: { label: 'Canceled', color: 'bg-rose-100 text-rose-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  no_show_student: { label: 'Conducted (Absent)', color: 'bg-amber-100 text-amber-800 border border-amber-300/60' },
  no_show_lecturer: { label: 'Lecturer No-show', color: 'bg-rose-100 text-rose-700' },
};


const LOCK_HOURS = 12;

function isWithinLockWindow(startsAt: string) {
  const start = new Date(startsAt).getTime();
  const now = Date.now();
  return start - now < LOCK_HOURS * 60 * 60 * 1000;
}

export default function StudentSessionsPage() {
  const params = useParams();
  const courseId = (params?.courseId as string) || 'beginner-qaida';
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewMode>('list');
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  const [isCanceling, setIsCanceling] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const [assignedLecturer, setAssignedLecturer] = useState<any>(null);
  const [lecturerTimeshift, setLecturerTimeshift] = useState<number[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  const [studentTier, setStudentTier] = useState<string>('STANDARD');
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ilm-sessions-view');
    if (saved === 'calendar' || saved === 'list') setView(saved);
  }, []);
  const handleViewChange = (v: ViewMode) => { setView(v); localStorage.setItem('ilm-sessions-view', v); };

  const { data: rawBookings, isLoading, isError: bookingsError, refetch: retryBookings } = useQuery({
    queryKey: ['studentBookings'],
    queryFn: () => apiFetch('/bookings/student'),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: calendarProfile } = useQuery<{ assignedLecturer?: { hourlyAvailabilityJson?: number[] } }>({
    queryKey: ['profile', 'student'],
    queryFn: () => apiFetch('/profile/student'),
  });
  const calendarShiftHours = Array.isArray(calendarProfile?.assignedLecturer?.hourlyAvailabilityJson)
    ? calendarProfile.assignedLecturer.hourlyAvailabilityJson.map(Number)
    : [];

  const sessions = useMemo(() => {
    if (!rawBookings) return [];
    const now = new Date();
    return rawBookings.map((b: any) => {
      const endsAtDate = new Date(b.endsAt || new Date(new Date(b.startsAt).getTime() + 40 * 60 * 1000));
      const isPast = endsAtDate < now;
      const effectiveStatus = b.status.toLowerCase();
      return {
        id: b.id,
        subject: b.subject || 'Quran Session',
        status: effectiveStatus,
        isPast,
        startsAt: b.startsAt,
        endsAt: b.endsAt || endsAtDate.toISOString(),
        lecturerName: b.lecturer?.fullName || b.lecturer?.name || 'Assigned Lecturer',
        lecturerId: b.lecturerId || b.lecturer?.userId,
        lecturerDetails: b.lecturer,
        canReview: Boolean(b.livekitRoomName) && effectiveStatus !== 'canceled',
        rating: b.rating,
      };
    });
  }, [rawBookings]);

  useEffect(() => {
    if (showReschedule && selectedSession) {
      setIsLoadingCalendar(true);
      Promise.all([
        apiFetch('/profile/student').catch(() => null),
        apiFetch(`/availability/${selectedSession.lecturerId || 'placeholder'}`).catch(() => null),
      ]).then(([profile, slots]) => {
        if (profile) {
          setStudentTier(profile.currentTier || 'STANDARD');
          const lecturer = profile.assignedLecturer || selectedSession.lecturerDetails;
          if (lecturer) {
             setAssignedLecturer({
               userId: lecturer.userId || lecturer.id,
               name: lecturer.fullName || lecturer.name,
               title: lecturer.qualifications || lecturer.title || 'Quran Instructor',
               hourlyAvailabilityJson: lecturer.hourlyAvailabilityJson || []
             });
             const timeshiftHours = Array.isArray(lecturer.hourlyAvailabilityJson)
               ? lecturer.hourlyAvailabilityJson.map(Number)
               : [];
             setLecturerTimeshift(timeshiftHours);
          }
        }
        if (slots) setAvailabilitySlots(slots);
        setIsLoadingCalendar(false);
      });
    }
  }, [showReschedule, selectedSession]);

  const closeDetail = useCallback(() => {
    setSelectedSession(null);
    setShowCancelConfirm(false);
    setShowReschedule(false);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
  }, []);
  const detailDialog = useDialogAccessibility(!!selectedSession && !showCancelConfirm && !showReschedule, closeDetail);
  const cancelDialog = useDialogAccessibility(!!selectedSession && showCancelConfirm, closeDetail);
  const rescheduleDialog = useDialogAccessibility(!!selectedSession && showReschedule, closeDetail);

  const handleCancelSession = async () => {
    if (!selectedSession) return;
    setIsCanceling(true);
    setActionErrorMessage(null);
    try {
      await apiFetch(`/bookings/${selectedSession.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['studentBookings'] });
      setActionSuccessMessage('Session has been canceled.');
      toast.success('Session Cancelled', 'Your scheduled session has been removed.');
      setTimeout(() => {
        closeDetail();
      }, 1200);
    } catch (err: any) {
      const msg = err.message || 'Failed to cancel session';
      setActionErrorMessage(msg);
      toast.error('Cancellation Failed', msg);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleRescheduleConfirm = async (selectedSlots: string[]) => {
    if (!selectedSession || selectedSlots.length === 0) return;
    setIsRescheduling(true);
    setActionErrorMessage(null);
    try {
      const [dateStr, time] = selectedSlots[0].split('|');
      const [year, month, day] = dateStr.split('-');
      const [hourStr, minStr] = time.split(':');
      const startsAtDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hourStr), Number(minStr));

      await apiFetch(`/bookings/${selectedSession.id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ startsAt: startsAtDate.toISOString() }),
      });

      await queryClient.invalidateQueries({ queryKey: ['studentBookings'] });
      setActionSuccessMessage('Session has been rescheduled successfully!');
      toast.success('Session Rescheduled', 'Your session timing has been updated.');
      setTimeout(() => {
        closeDetail();
      }, 1200);
    } catch (err: any) {
      const msg = err.message || 'Failed to reschedule session';
      setActionErrorMessage(msg);
      toast.error('Reschedule Failed', msg);
    } finally {
      setIsRescheduling(false);
    }
  };

  useEffect(() => {
    if (!selectedSession) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetail(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [selectedSession, closeDetail]);

  return (
    <>
    <div className={studentUi.page}>
      <StudentPageHeader
        eyebrow="Schedule"
        title="My Sessions"
        description="Review upcoming, completed, and rescheduled Quran sessions."
        action={
          <div className="flex rounded-full border border-[#d6e0db] bg-[#f5f7f6] p-1">
          <button onClick={() => handleViewChange('list')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${view === 'list' ? 'bg-white text-[#202823] shadow-sm' : 'text-[#56635c]'}`}>
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button onClick={() => handleViewChange('calendar')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${view === 'calendar' ? 'bg-white text-[#202823] shadow-sm' : 'text-[#56635c]'}`}>
            <Calendar className="h-3.5 w-3.5" /> Calendar
          </button>
        </div>
        }
      />

      {bookingsError && <div role="alert" className="space-y-3 p-5 text-sm text-[#202823]"><p>Your sessions could not be loaded.</p><button type="button" onClick={() => void retryBookings()} className="rounded-md border border-[#b9cac2] px-4 py-2 font-semibold text-[#095F46]">Try again</button></div>}
      {/* List View */}
      {!bookingsError && view === 'list' && (
        <div className="space-y-3">
          {isLoading ? (
            <LoadingScreen message="Loading Sessions..." subtitle="Fetching your scheduled classes and learning calendar" />
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d6e0db] bg-white py-12 text-center">
              <Calendar className="mx-auto mb-3 h-8 w-8 text-[#095F46]" />
              <p className="text-sm font-bold text-[#202823]">No sessions booked</p>
              <p className="mb-4 mt-1 text-xs text-[#56635c]">You haven&apos;t scheduled any sessions yet.</p>
              <Link href={`/student/courses/${courseId}/sessions/book`} className="text-sm font-bold text-[#095F46] hover:underline">Book a session now</Link>
            </div>
          ) : sessions.map((s: any) => {
            const cfg = statusConfig[s.status] || statusConfig.scheduled;
            const canJoin = s.status === 'scheduled' || s.status === 'in_progress';
            return (
              <div
                key={s.id}
                className="flex w-full cursor-pointer flex-col justify-between gap-4 rounded-xl border border-[#d6e0db] bg-white p-4 text-left shadow-sm transition-all hover:border-[#b9cac2] hover:shadow-md sm:flex-row sm:items-center"
              >
                <button type="button" onClick={() => setSelectedSession(s)} aria-label={`Open session details for ${new Date(s.startsAt).toLocaleString()}`} className="flex min-w-0 items-center gap-4 text-left focus-visible:outline-2 focus-visible:outline-[#095F46]">
                  <StudentIconTile icon={Video} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[#202823]">{s.subject}</div>
                    <div className="text-xs text-[#56635c]">with {s.lecturerName} · {new Date(s.startsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div className="text-xs text-[#56635c]">{new Date(s.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — {new Date(s.endsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </button>

                <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.color}`}>{cfg.label}</span>
                  {s.status === 'scheduled' && !s.isPast && !isWithinLockWindow(s.startsAt) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedSession(s); setShowReschedule(true); }}
                      className={studentUi.secondaryButton}
                    >
                      <Edit className="h-3 w-3" /> Reschedule
                    </button>
                  )}
                  {canJoin && (
                    <Link
                      href={`/student/courses/${courseId}/sessions/${s.id}/room`}
                      className={studentUi.primaryButton}
                    >
                      <Play className="h-3 w-3 fill-current" /> Join Class
                    </Link>
                  )}
                  {s.canReview && (
                    <Link
                      href={`/student/courses/${courseId}/feedback?sessionId=${s.id}`}
                      className={studentUi.secondaryButton}
                    >
                      <MessageSquareText className="h-3.5 w-3.5" /> {s.rating ? 'Edit Review' : 'Write Review'}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* Calendar View */}
      {!bookingsError && view === 'calendar' && (
        <ScheduleCalendar events={sessions.map((session: { id: string; startsAt: string; endsAt: string; subject: string; lecturerName: string; status: string }) => ({
          id: session.id, startsAt: session.startsAt, endsAt: session.endsAt, title: session.subject,
          subtitle: session.lecturerName, tone: session.status === 'completed' ? 'purple' as const : 'blue' as const,
          onClick: () => setSelectedSession(session),
        }))} visibleHours={calendarShiftHours} ariaLabel="Student sessions calendar" />
      )}
    </div>

      {/* Session Detail Modal */}
      {selectedSession && !showCancelConfirm && !showReschedule && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={closeDetail}>
          <div ref={detailDialog} role="dialog" aria-modal="true" aria-label="Session details" tabIndex={-1} className="w-full max-w-sm rounded-xl border border-[#d6e0db] bg-white p-5 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{selectedSession.subject}</h3>
            <div className="space-y-2.5 text-sm mb-5">
              <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Lecturer</span><span className="font-medium">{selectedSession.lecturerName}</span></div>
              <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Date</span><span className="font-medium">{new Date(selectedSession.startsAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
              <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Time</span><span className="font-medium">{new Date(selectedSession.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — {new Date(selectedSession.endsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span></div>
              <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Status</span><span className={`px-2 py-0.5 text-xs rounded-full font-medium ${(statusConfig[selectedSession.status] || statusConfig.scheduled).color}`}>{(statusConfig[selectedSession.status] || statusConfig.scheduled).label}</span></div>
            </div>

            {selectedSession.status === 'no_show_student' && (
              <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/90 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 text-center space-y-2 mb-5">
                <div className="inline-flex p-2.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shadow-sm">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Session Conducted · You Were Absent
                </h4>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed max-w-xs mx-auto">
                  This session was conducted at its scheduled time, but you were absent. If you need any assistance, please message your instructor or book a new session.
                </p>
                <div className="pt-1.5">
                  <Link
                    href={`/student/courses/${courseId}/sessions/book`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-semibold transition-all shadow-sm"
                  >
                    <Calendar className="h-3.5 w-3.5" /> Book Next Session
                  </Link>
                </div>
              </div>
            )}

            {/* Active upcoming scheduled session controls */}
            {selectedSession.status === 'scheduled' && !selectedSession.isPast && (
              <>
                {isWithinLockWindow(selectedSession.startsAt) ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold">
                      <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      Session Locked (&lt; 12 Hours Before Start)
                    </div>
                    <p className="text-amber-800/80 dark:text-amber-300/80 leading-relaxed text-[11px]">
                      Student rescheduling and cancellations are locked within 12 hours of class start time. For emergency adjustments, please contact our support team.
                    </p>
                    <Link
                      href="/student/support?tab=contact"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-sm"
                    >
                      <HelpCircle className="h-3.5 w-3.5" /> Contact Admin & Support
                    </Link>
                  </div>
                ) : (
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setShowReschedule(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.05)] transition-colors"
                    >
                      <Edit className="h-4 w-4" /> Reschedule
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.15)]"
                    >
                      <Trash2 className="h-4 w-4" /> Cancel
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2 mt-2">
              {selectedSession.canReview && (
                <Link href={`/student/courses/${courseId}/feedback?sessionId=${selectedSession.id}`} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.07)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.12)] transition-colors flex items-center justify-center gap-1.5">
                  <MessageSquareText className="h-4 w-4" /> {selectedSession.rating ? 'Edit Review' : 'Write Review'}
                </Link>
              )}
              {(selectedSession.status === 'scheduled' || selectedSession.status === 'in_progress') && (
                <Link href={`/student/courses/${courseId}/sessions/${selectedSession.id}/room`} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#095F46] hover:shadow-md transition-all flex items-center justify-center gap-1.5">
                  <Play className="h-4 w-4 fill-current" /> Join Session
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation */}
      {showCancelConfirm && selectedSession && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={closeDetail}>
          <div ref={cancelDialog} role="dialog" aria-modal="true" aria-label="Cancel session" tabIndex={-1} className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-2xl max-w-sm w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="h-12 w-12 rounded-full bg-[hsl(var(--destructive)/0.1)] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-[hsl(var(--destructive))]" />
            </div>
            <h3 className="font-bold text-lg text-center mb-2">Cancel Session?</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mb-3">
              Are you sure you want to cancel your session &ldquo;{selectedSession.subject}&rdquo;?
            </p>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 text-center mb-4">
              <strong>Policy:</strong> Cancellations must be made at least 12 hours before class.
            </div>
            {actionSuccessMessage ? (
              <div className="p-3 rounded-xl bg-green-500/10 text-green-700 dark:text-green-300 text-sm font-semibold text-center mb-2">
                ✓ {actionSuccessMessage}
              </div>
            ) : (
              <>
                {actionErrorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs font-semibold mb-4 leading-relaxed">
                    ⚠️ {actionErrorMessage}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={isCanceling}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                  >
                    Keep Session
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelSession}
                    disabled={isCanceling}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[hsl(var(--destructive))] hover:opacity-90 transition-opacity"
                  >
                    {isCanceling ? 'Canceling...' : 'Confirm Cancel'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reschedule Flow */}
      {showReschedule && selectedSession && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={closeDetail}>
          <div ref={rescheduleDialog} role="dialog" aria-modal="true" aria-label="Reschedule session" tabIndex={-1} className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-2xl w-full max-w-4xl p-6 animate-fade-in my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-lg mb-1">Reschedule Session</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Choose a new date and time for &ldquo;{selectedSession.subject}&rdquo;</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReschedule(false)}
                className="p-1.5 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 mb-6 w-fit">
              <strong>Policy:</strong> Students can reschedule sessions up to 12 hours before start time.
            </div>
            {actionSuccessMessage ? (
              <div className="p-3 rounded-xl bg-green-500/10 text-green-700 dark:text-green-300 text-sm font-semibold text-center my-4">
                ✓ {actionSuccessMessage}
              </div>
            ) : (
              <>
                {actionErrorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs font-semibold mb-4 leading-relaxed">
                    ⚠️ {actionErrorMessage}
                  </div>
                )}

                {isLoadingCalendar ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))] mb-4" />
                    <p className="text-sm font-medium">Loading instructor availability...</p>
                  </div>
                ) : (
                  <BookingCalendar 
                    mode="reschedule"
                    assignedLecturer={assignedLecturer || {}}
                    lecturerTimeshift={lecturerTimeshift}
                    availabilitySlots={availabilitySlots}
                    studentBookings={(rawBookings || []).filter((booking: { id: string }) => booking.id !== selectedSession.id)}
                    studentTier={studentTier}
                    onConfirm={handleRescheduleConfirm}
                    isSubmitting={isRescheduling}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

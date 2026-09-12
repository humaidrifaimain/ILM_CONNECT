'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Video, CheckCircle, XCircle, Calendar, List, ChevronLeft, ChevronRight, Clock, Edit, Trash2, AlertTriangle, Lock, Play, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';

type ViewMode = 'list' | 'calendar';

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  canceled: { label: 'Canceled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  no_show_student: { label: 'Conducted (Absent)', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/50' },
  no_show_lecturer: { label: 'Lecturer No-show', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }

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
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ilm-sessions-view');
    if (saved === 'calendar' || saved === 'list') setView(saved);
  }, []);
  const handleViewChange = (v: ViewMode) => { setView(v); localStorage.setItem('ilm-sessions-view', v); };

  const { data: rawBookings, isLoading } = useQuery({
    queryKey: ['studentBookings'],
    queryFn: () => apiFetch('/bookings/student'),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const sessions = useMemo(() => {
    if (!rawBookings) return [];
    const now = new Date();
    return rawBookings.map((b: any) => {
      const endsAtDate = new Date(b.endsAt || new Date(new Date(b.startsAt).getTime() + 40 * 60 * 1000));
      const isPast = endsAtDate < now;
      let effectiveStatus = b.status.toLowerCase();
      if (effectiveStatus === 'scheduled' && isPast) {
        effectiveStatus = 'no_show_student';
      }
      return {
        id: b.id,
        subject: b.subject || 'Quran Session',
        status: effectiveStatus,
        isPast,
        startsAt: b.startsAt,
        endsAt: b.endsAt || endsAtDate.toISOString(),
        lecturerName: b.lecturer?.fullName || b.lecturer?.name || 'Assigned Lecturer',
      };
    });
  }, [rawBookings]);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDay(calYear, calMonth);
  const monthName = new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
  const prevMonth = () => { if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); } else setCalMonth(calMonth - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); } else setCalMonth(calMonth + 1); };
  const getSessionsForDay = (day: number) => sessions.filter((s: any) => { const d = new Date(s.startsAt); return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === day; });

  const closeDetail = useCallback(() => {
    setSelectedSession(null);
    setShowCancelConfirm(false);
    setShowReschedule(false);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
  }, []);

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

  const handleRescheduleSession = async () => {
    if (!selectedSession || !rescheduleDate) {
      setActionErrorMessage('Please select a new date for rescheduling');
      toast.error('Date Required', 'Please select a new date for rescheduling');
      return;
    }
    setIsRescheduling(true);
    setActionErrorMessage(null);
    try {
      let [hourStr, minStr] = rescheduleTime.split(' ')[0].split(':');
      let hour = parseInt(hourStr, 10);
      const isPM = rescheduleTime.includes('PM');
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;

      const [year, month, day] = rescheduleDate.split('-');
      const startsAtDate = new Date(Number(year), Number(month) - 1, Number(day), hour, parseInt(minStr, 10));

      if (startsAtDate <= new Date()) {
        setActionErrorMessage('Please select a future date and time');
        toast.error('Invalid Time', 'Please select a future date and time');
        setIsRescheduling(false);
        return;
      }

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Sessions</h1>
        <div className="flex rounded-xl bg-[hsl(var(--muted))] p-1">
          <button onClick={() => handleViewChange('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'list' ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button onClick={() => handleViewChange('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'calendar' ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
            <Calendar className="h-3.5 w-3.5" /> Calendar
          </button>
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-3">
          {isLoading ? (
            <LoadingScreen message="Loading Sessions..." subtitle="Fetching your scheduled classes and learning calendar" />
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <Calendar className="h-8 w-8 mx-auto text-[hsl(var(--muted-foreground))] opacity-50 mb-3" />
              <p className="text-sm font-medium">No sessions booked</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 mb-4">You haven't scheduled any sessions yet.</p>
              <Link href="/student/courses/beginner-qaida/sessions/book" className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline">Book a session now</Link>
            </div>
          ) : sessions.map((s: any) => {
            const cfg = statusConfig[s.status] || statusConfig.scheduled;
            const canJoin = (s.status === 'scheduled' || s.status === 'in_progress') && !s.isPast;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedSession(s)}
                className="w-full text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.4)] transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-[hsl(var(--primary-light))] flex items-center justify-center flex-shrink-0">
                    <Video className="h-5 w-5 text-[hsl(var(--primary))]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate text-[hsl(var(--foreground))]">{s.subject}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">with {s.lecturerName} · {new Date(s.startsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(s.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — {new Date(s.endsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${cfg.color}`}>{cfg.label}</span>
                  {canJoin && (
                    <Link
                      href={`/student/courses/${courseId}/sessions/${s.id}/room`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Play className="h-3 w-3 fill-current" /> Join Class
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--border))]">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]"><ChevronLeft className="h-4 w-4" /></button>
            <span className="font-semibold">{monthName}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="min-h-[80px] p-1 border-b border-r border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const daySessions = getSessionsForDay(day);
              const isToday = calYear === now.getFullYear() && calMonth === now.getMonth() && day === now.getDate();
              return (
                <div key={day} className={`min-h-[80px] p-1 border-b border-r border-[hsl(var(--border))] ${isToday ? 'bg-[hsl(var(--primary)/0.05)]' : ''}`}>
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'h-5 w-5 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center' : 'text-[hsl(var(--muted-foreground))]'}`}>{day}</div>
                  {daySessions.map((s: any) => (
                    <button key={s.id} onClick={() => setSelectedSession(s)} className={`w-full text-left px-1 py-0.5 rounded text-[10px] font-medium truncate mb-0.5 ${(statusConfig[s.status] || statusConfig.scheduled).color}`}>
                      {new Date(s.startsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} {s.subject?.split('—')[0].trim().slice(0,15)}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

      {/* Session Detail Modal */}
      {selectedSession && !showCancelConfirm && !showReschedule && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={closeDetail}>
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-sm w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{selectedSession.subject}</h3>
            <div className="space-y-2.5 text-sm mb-5">
              <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Lecturer</span><span className="font-medium">{selectedSession.lecturerName}</span></div>
              <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Date</span><span className="font-medium">{new Date(selectedSession.startsAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
              <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Time</span><span className="font-medium">{new Date(selectedSession.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — {new Date(selectedSession.endsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span></div>
              <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Status</span><span className={`px-2 py-0.5 text-xs rounded-full font-medium ${(statusConfig[selectedSession.status] || statusConfig.scheduled).color}`}>{(statusConfig[selectedSession.status] || statusConfig.scheduled).label}</span></div>
            </div>

            {/* If session was scheduled and is now past / missed */}
            {(selectedSession.status === 'no_show_student' || selectedSession.isPast) && (
              <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/90 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 text-center space-y-2 mb-5">
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

            <div className="flex gap-2">
              <button onClick={closeDetail} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">Close</button>
              {(selectedSession.status === 'scheduled' || selectedSession.status === 'in_progress') && !selectedSession.isPast && (
                <Link href={`/student/courses/${courseId}/sessions/${selectedSession.id}/room`} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] flex items-center justify-center gap-1.5">
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
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-sm w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={closeDetail}>
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-sm w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Reschedule Session</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">Choose a new date and time for &ldquo;{selectedSession.subject}&rdquo;</p>

            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 mb-4">
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
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[hsl(var(--foreground))]">New Date</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[hsl(var(--foreground))]">New Time Slot</label>
                    <select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                    >
                      <optgroup label="10 to 2 Shift (Morning)">
                        <option value="10:00 AM">10:00 – 10:40 AM</option>
                        <option value="11:00 AM">11:00 – 11:40 AM</option>
                        <option value="12:00 PM">12:00 – 12:40 PM</option>
                        <option value="01:00 PM">01:00 – 01:40 PM</option>
                      </optgroup>
                      <optgroup label="2 to 6 Shift (Afternoon)">
                        <option value="02:00 PM">02:00 – 02:40 PM</option>
                        <option value="03:00 PM">03:00 – 03:40 PM</option>
                        <option value="04:00 PM">04:00 – 04:40 PM</option>
                        <option value="05:00 PM">05:00 – 05:40 PM</option>
                      </optgroup>
                      <optgroup label="6 to 10 Shift (Evening)">
                        <option value="06:00 PM">06:00 – 06:40 PM</option>
                        <option value="07:00 PM">07:00 – 07:40 PM</option>
                        <option value="08:00 PM">08:00 – 08:40 PM</option>
                        <option value="09:00 PM">09:00 – 09:40 PM</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <Link
                    href={`/student/courses/${courseId}/sessions/book`}
                    className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1 font-medium"
                  >
                    Or pick an open slot from visual calendar →
                  </Link>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReschedule(false)}
                    disabled={isRescheduling}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRescheduleSession}
                    disabled={isRescheduling || !rescheduleDate}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-md disabled:opacity-50"
                  >
                    {isRescheduling ? 'Rescheduling...' : 'Confirm New Time'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

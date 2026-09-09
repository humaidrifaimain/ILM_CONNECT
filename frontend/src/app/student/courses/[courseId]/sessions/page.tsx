'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Video, CheckCircle, XCircle, Calendar, List, ChevronLeft, ChevronRight, Clock, Edit, Trash2, AlertTriangle, Lock } from 'lucide-react';
import Link from 'next/link';

type ViewMode = 'list' | 'calendar';

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  canceled: { label: 'Canceled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
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
  const [view, setView] = useState<ViewMode>('list');
  const [selectedSession, setSelectedSession] = useState<typeof sessions[0] | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ilm-sessions-view');
    if (saved === 'calendar' || saved === 'list') setView(saved);
  }, []);
  const handleViewChange = (v: ViewMode) => { setView(v); localStorage.setItem('ilm-sessions-view', v); };

  const { data: rawBookings, isLoading } = useQuery({
    queryKey: ['studentBookings'],
    queryFn: () => apiFetch('/bookings/student'),
  });

  const sessions = useMemo(() => {
    if (!rawBookings) return [];
    return rawBookings.map((b: any) => ({
      id: b.id,
      subject: b.subject || 'Quran Session',
      status: b.status.toLowerCase(),
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      lecturerName: b.lecturer?.fullName || b.lecturer?.name || 'Assigned Lecturer'
    }));
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

  const closeDetail = useCallback(() => { setSelectedSession(null); setShowCancelConfirm(false); setShowReschedule(false); }, []);

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
            <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <Calendar className="h-8 w-8 mx-auto text-[hsl(var(--muted-foreground))] opacity-50 mb-3" />
              <p className="text-sm font-medium">No sessions booked</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 mb-4">You haven't scheduled any sessions yet.</p>
              <Link href="/student/courses/beginner-qaida/sessions/book" className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline">Book a session now</Link>
            </div>
          ) : sessions.map((s: any) => {
            const cfg = statusConfig[s.status] || statusConfig.scheduled;
            return (
              <button key={s.id} onClick={() => setSelectedSession(s)} className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.3)] transition-colors">
                <div className="h-11 w-11 rounded-xl bg-[hsl(var(--primary-light))] flex items-center justify-center flex-shrink-0">
                  <Video className="h-5 w-5 text-[hsl(var(--primary))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.subject}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">with {s.lecturerName} · {new Date(s.startsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(s.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — {new Date(s.endsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${cfg.color}`}>{cfg.label}</span>
              </button>
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
                    <button key={s.id} onClick={() => setSelectedSession(s)} className={`w-full text-left px-1 py-0.5 rounded text-[10px] font-medium truncate mb-0.5 ${s.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
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

            {selectedSession.status === 'scheduled' && (
              <>
                {isWithinLockWindow(selectedSession.startsAt) && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-[hsl(var(--warning)/0.1)] text-xs text-[hsl(var(--warning))] mb-4">
                    <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    Edits and cancellations are locked within 12 hours of the session start time.
                  </div>
                )}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setShowReschedule(true)}
                    disabled={isWithinLockWindow(selectedSession.startsAt)}
                    title={isWithinLockWindow(selectedSession.startsAt) ? 'Edits and cancellations are locked within 12 hours of the session start time.' : 'Reschedule this session'}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isWithinLockWindow(selectedSession.startsAt) ? 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] opacity-50 cursor-not-allowed' : 'border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.05)]'}`}
                  >
                    <Edit className="h-4 w-4" /> Reschedule
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={isWithinLockWindow(selectedSession.startsAt)}
                    title={isWithinLockWindow(selectedSession.startsAt) ? 'Edits and cancellations are locked within 12 hours of the session start time.' : 'Cancel this session'}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isWithinLockWindow(selectedSession.startsAt) ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] opacity-50 cursor-not-allowed' : 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.15)]'}`}
                  >
                    <Trash2 className="h-4 w-4" /> Cancel
                  </button>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button onClick={closeDetail} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">Close</button>
              {selectedSession.status === 'scheduled' && (
                <Link href={`/student/courses/beginner-qaida/sessions/${selectedSession.id}/room`} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] flex items-center justify-center">Join Session</Link>
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
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mb-4">Are you sure you want to cancel your session &ldquo;{selectedSession.subject}&rdquo;? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">Keep Session</button>
              <button onClick={closeDetail} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[hsl(var(--destructive))]">Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Flow */}
      {showReschedule && selectedSession && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={closeDetail}>
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-sm w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Reschedule Session</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Choose a new date and time for &ldquo;{selectedSession.subject}&rdquo;</p>
            <div className="space-y-3 mb-4">
              <div><label className="block text-sm font-medium mb-1">New Date</label><input type="date" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">New Time</label><select className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"><option>08:00 AM</option><option>09:00 AM</option><option>10:00 AM</option><option>02:00 PM</option><option>03:00 PM</option><option>04:00 PM</option><option>05:00 PM</option></select></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReschedule(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">Cancel</button>
              <button onClick={closeDetail} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)]">Confirm New Time</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

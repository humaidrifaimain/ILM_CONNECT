'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar,
  Info,
  Loader2,
  X,
  User,
  Video,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';

function getWeekDates(weekOffset: number) {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sun, 1 = Mon...
  const distanceToMonday = (currentDay + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const timeSlots = [
  '10:00', '11:00', '12:00', '13:00', // 10 to 2 (Morning Shift)
  '14:00', '15:00', '16:00', '17:00', // 2 to 6 (Afternoon Shift)
  '18:00', '19:00', '20:00', '21:00', // 6 to 10 (Evening Shift)
];

function formatSlotRange(time: string) {
  const [hourStr] = time.split(':');
  const h = Number(hourStr);
  const start = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${start}:00 – ${start}:40 ${ampm}`;
}

export default function BookSessionPage() {
  const params = useParams();
  const courseId = (params?.courseId as string) || 'beginner-qaida';

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [assignedLecturer, setAssignedLecturer] = useState<any>(null);
  const [lecturerTimeshift, setLecturerTimeshift] = useState<number[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  const [studentBookings, setStudentBookings] = useState<any[]>([]);
  const [selectedBookedSession, setSelectedBookedSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const today = new Date();

  // Escape key closes the booked session modal
  useEffect(() => {
    if (!selectedBookedSession) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedBookedSession(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedBookedSession]);

  const assignedLecturerIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData(isInitial: boolean = false) {
      try {
        if (isInitial) {
          setIsLoading(true);
        } else {
          // If background polling and tab is hidden, skip to save network/resources
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            return;
          }
        }

        const [profile, bookings] = await Promise.all([
          apiFetch('/profile/student').catch(() => null),
          apiFetch('/bookings/student').catch(() => null),
        ]);

        if (!isMounted) return;

        if (bookings) {
          setStudentBookings(bookings);
        }

        let lecturer = profile?.assignedLecturer || bookings?.find((b: any) => new Date(b.startsAt) > new Date())?.lecturer;
        
        if (!lecturer && bookings?.length > 0) {
          lecturer = bookings[0].lecturer;
        }

        if (!lecturer) {
          const lecturers = await apiFetch('/profile/lecturers').catch(() => null);
          if (lecturers && lecturers.length > 0) {
            lecturer = lecturers[0];
          } else {
            lecturer = {
              userId: 'placeholder',
              fullName: 'Sheikh Ahmed Al-Farsi',
              qualifications: 'Senior Quran Instructor'
            };
          }
        }

        const lecturerData = {
           userId: lecturer.userId || lecturer.id,
           name: lecturer.fullName || lecturer.name,
           title: lecturer.qualifications || lecturer.title || 'Quran Instructor',
           hourlyAvailabilityJson: lecturer.hourlyAvailabilityJson || []
        };

        const timeshiftHours = Array.isArray(lecturerData.hourlyAvailabilityJson)
          ? lecturerData.hourlyAvailabilityJson.map(Number)
          : [];
        setLecturerTimeshift(timeshiftHours);
        setAssignedLecturer(lecturerData);
        assignedLecturerIdRef.current = lecturerData.userId;

        if (lecturerData.userId !== 'placeholder') {
           const slots = await apiFetch(`/availability/${lecturerData.userId}`).catch(() => null);
           if (isMounted && slots) {
             setAvailabilitySlots(slots);
           }
        }
      } catch (error: any) {
        if (isInitial) {
          if (error.message === 'Forbidden resource') {
            toast.error('Access Denied', 'You must be logged in as a Student to book sessions.');
          } else {
            console.warn('Failed to load booking data:', error);
          }
          setAssignedLecturer({ name: 'Sheikh Ahmed Al-Farsi', title: 'Senior Quran Instructor' });
        }
      } finally {
        if (isInitial && isMounted) {
          setIsLoading(false);
        }
      }
    }

    // Initial load
    loadData(true);

    // Auto-update calendar every 10 seconds silently in the background
    const interval = setInterval(() => {
      loadData(false);
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData(false);
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Filter active booked sessions that fall within the currently viewed week
  const bookedSessionsInWeek = useMemo(() => {
    return studentBookings.filter((b: any) => {
      if (b.status === 'CANCELED' || b.status === 'canceled') return false;
      const bStart = new Date(b.startsAt);
      return weekDates.some(
        (d) =>
          d.getFullYear() === bStart.getFullYear() &&
          d.getMonth() === bStart.getMonth() &&
          d.getDate() === bStart.getDate()
      );
    });
  }, [studentBookings, weekDates]);

  // Check if student already booked a session for this specific date and time slot
  const getBookedSessionForSlot = (dateStr: string, time: string) => {
    const [year, month, day] = dateStr.split('-');
    const [hour, min] = time.split(':');
    const targetDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));

    return studentBookings.find((b: any) => {
      if (b.status === 'CANCELED' || b.status === 'canceled') return false;
      const bStart = new Date(b.startsAt);
      return (
        bStart.getFullYear() === targetDate.getFullYear() &&
        bStart.getMonth() === targetDate.getMonth() &&
        bStart.getDate() === targetDate.getDate() &&
        bStart.getHours() === targetDate.getHours()
      );
    });
  };

  const isInTimeshift = (time: string) => {
    if (lecturerTimeshift.length === 0) return true; // no restriction if not set
    const [hour] = time.split(':');
    return lecturerTimeshift.includes(Number(hour));
  };

  const isAvailable = (dateStr: string, time: string) => {
    if (!isInTimeshift(time)) return false; // outside lecturer's timeshift
    const [year, month, day] = dateStr.split('-');
    const [hour, min] = time.split(':');
    const targetDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
    
    return availabilitySlots.some(slot => {
       const slotStart = new Date(slot.startsAt);
       return slotStart.getFullYear() === targetDate.getFullYear() &&
              slotStart.getMonth() === targetDate.getMonth() &&
              slotStart.getDate() === targetDate.getDate() &&
              slotStart.getHours() === targetDate.getHours() &&
              slot.status === 'OPEN';
    });
  };

  const toggleSlot = (key: string) => {
    const [dateStr, time] = key.split('|');
    if (getBookedSessionForSlot(dateStr, time)) return;

    if (selectedSlots.includes(key)) {
      setSelectedSlots(selectedSlots.filter(s => s !== key));
    } else {
      if (bookedSessionsInWeek.length + selectedSlots.length >= 6) {
        toast.info('Weekly Limit', 'You can select up to 6 sessions in a single week.');
        return;
      }
      setSelectedSlots([...selectedSlots, key]);
    }
  };

  const handleConfirmBooking = async () => {
    if (selectedSlots.length < 1) return;
    setIsSubmitting(true);
    try {
      for (const slotKey of selectedSlots) {
        const [dateStr, time] = slotKey.split('|');
        const [year, month, day] = dateStr.split('-');
        const [hour, min] = time.split(':');
        const startsAtDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
        const startsAt = startsAtDate.toISOString();
        
        await apiFetch('/bookings', {
          method: 'POST',
          body: JSON.stringify({
             lecturerId: assignedLecturer.userId,
             startsAt
          })
        });
      }
      try {
        const freshBookings = await apiFetch('/bookings/student');
        setStudentBookings(freshBookings || []);
      } catch (e) {}
      setSelectedSlots([]);
      setConfirmed(true);
      toast.success('Session(s) Booked!', 'Your sessions have been confirmed and added to your schedule.');
    } catch (error: any) {
      toast.error('Booking Failed', error.message || 'Failed to book session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSlotStatus = (key: string) => {
    if (selectedSlots.includes(key)) return 'selected';
    if (bookedSessionsInWeek.length + selectedSlots.length >= 6) return 'disabled';
    return 'available';
  };

  if (isLoading) {
    return (
      <LoadingScreen message="Loading Schedule..." subtitle="Fetching lecturer availability and open calendar slots" />
    );
  }

  return (
    <>
    <div className="space-y-6 animate-fade-in w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Book Session</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Select available time slots with your assigned lecturer</p>
        </div>
        <Link href="/student/dashboard" className="text-sm text-[hsl(var(--primary))] hover:underline">← Back to Dashboard</Link>
      </div>

      {/* Summary banner */}
      <div className="p-4 rounded-xl bg-[hsl(var(--primary-light))] border border-[hsl(var(--primary)/0.2)] flex items-start gap-3">
        <Info className="h-5 w-5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-[hsl(var(--primary))]">Book sessions with your assigned lecturer.</p>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">You can book multiple sessions across the week to fit your personal schedule.</p>
        </div>
      </div>

      {/* Assigned lecturer info */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,50%,45%)] flex items-center justify-center text-white font-bold text-sm">{assignedLecturer.name.split(' ').map((n: any)=>n[0]).join('').slice(0,2)}</div>
        <div>
          <div className="font-medium text-sm">{assignedLecturer.name}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">{assignedLecturer.title}</div>
        </div>
        <div className="ml-auto text-xs text-[hsl(var(--muted-foreground))]">Your assigned lecturer</div>
      </div>

      {/* Weekly sessions notice if any already booked */}
      {bookedSessionsInWeek.length > 0 && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-medium">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              You have <strong>{bookedSessionsInWeek.length}</strong> session{bookedSessionsInWeek.length > 1 ? 's' : ''} already booked in this week. Click on any booked slot below to view its details.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
            {Math.max(0, 6 - bookedSessionsInWeek.length)} more available this week
          </span>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <span className="font-semibold text-sm">{weekLabel}</span>
        <button onClick={() => setWeekOffset(weekOffset + 1)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs px-1">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[hsl(var(--success)/0.15)] border border-[hsl(var(--success)/0.4)]" />
          <span className="text-[hsl(var(--muted-foreground))]">Available Slot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
            ✓
          </span>
          <span className="text-[hsl(var(--foreground))] font-semibold">Already Booked (Click to view)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[hsl(var(--primary))] text-white flex items-center justify-center text-[9px]">
            ✓
          </span>
          <span className="text-[hsl(var(--muted-foreground))]">Selected for Booking</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[hsl(var(--muted)/0.4)]" />
          <span className="text-[hsl(var(--muted-foreground))]">Unavailable</span>
        </div>
        {lecturerTimeshift.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">🔒</span>
            <span className="text-[hsl(var(--muted-foreground))]">Outside Timeshift</span>
          </div>
        )}
      </div>

      {/* Time slot grid */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="py-3 px-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))]">Time</th>
              {weekDates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const isPast = d < today && !isToday;
                return (
                  <th key={i} className={`py-3 px-2 text-center text-xs font-semibold ${isPast ? 'text-[hsl(var(--muted-foreground)/0.4)]' : isToday ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                    <div>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</div>
                    <div className={`font-normal ${isToday ? 'font-medium' : ''}`}>{d.getDate()}/{d.getMonth()+1}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time) => {
              const inTimeshift = isInTimeshift(time);
              return (
              <tr key={time} className={`border-b border-[hsl(var(--border))] last:border-0 ${!inTimeshift ? 'opacity-40' : ''}`}>
                <td className="py-2 px-3 text-xs text-[hsl(var(--muted-foreground))]">
                  <div className="flex items-center gap-1.5">
                    {!inTimeshift && <span title="Outside lecturer's timeshift" className="text-xs">🔒</span>}
                    <div>
                      <div className="font-bold text-[hsl(var(--foreground))] whitespace-nowrap text-xs">
                        {formatSlotRange(time)}
                      </div>
                      <div className="text-[10px] text-[hsl(var(--primary))] font-medium whitespace-nowrap">
                        40 mins session
                      </div>
                    </div>
                  </div>
                </td>
                {weekDates.map((d, di) => {
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const key = `${dateStr}|${time}`;
                  const [year, month, day] = dateStr.split('-');
                  const [hour, min] = time.split(':');
                  const targetDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
                  const twelveHoursFromNow = new Date(today.getTime() + 12 * 60 * 60 * 1000);
                  const isPast = targetDate < twelveHoursFromNow;
                  const bookedSession = getBookedSessionForSlot(dateStr, time);
                  const avail = isAvailable(dateStr, time);
                  const status = getSlotStatus(key);

                  // Outside lecturer's timeshift — locked
                  if (!inTimeshift) {
                    return (
                      <td key={di} className="py-1 px-2">
                        <div
                          className="h-8 w-full rounded-lg bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border)/0.5)] flex items-center justify-center"
                          title="Outside lecturer's working timeshift"
                        >
                          <span className="text-[10px] text-[hsl(var(--muted-foreground)/0.4)]">—</span>
                        </div>
                      </td>
                    );
                  }

                  // 1st: Check if this slot is already booked by the student
                  if (bookedSession) {
                    return (
                      <td key={di} className="py-1 px-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBookedSession(bookedSession)}
                          className="h-8 w-full rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-500/60 transition-all text-xs font-semibold flex items-center justify-center gap-1 shadow-xs px-1 group cursor-pointer"
                          title={`Booked: ${bookedSession.subject || 'Quran Session'}. Click to view details`}
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="truncate text-[10px] font-bold uppercase tracking-tight">Booked</span>
                        </button>
                      </td>
                    );
                  }

                  if (isPast || !avail) {
                    return <td key={di} className="py-1 px-2"><div className="h-8 w-full rounded-lg bg-[hsl(var(--muted)/0.3)]" /></td>;
                  }

                  return (
                    <td key={di} className="py-1 px-2">
                      <button
                        type="button"
                        onClick={() => toggleSlot(key)}
                        disabled={status === 'disabled'}
                        className={`h-8 w-full rounded-lg transition-all text-xs font-medium ${
                          status === 'selected' ? 'bg-[hsl(var(--primary))] text-white shadow-md' :
                          status === 'disabled' ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground)/0.3)] cursor-not-allowed' :
                          'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)] hover:bg-[hsl(var(--success)/0.2)]'
                        }`}
                      >
                        {status === 'selected' ? '✓' : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected slots summary */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div>
          <div className="text-sm font-medium">{selectedSlots.length} slot{selectedSlots.length === 1 ? '' : 's'} selected</div>
          {selectedSlots.length > 0 && (
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {selectedSlots.map(s => {
                const [date, time] = s.split('|');
                return <span key={s} className="inline-block mr-3">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {time}</span>;
              })}
            </div>
          )}
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            {bookedSessionsInWeek.length >= 6
              ? 'Weekly booking allowance reached for this week'
              : 'Select your preferred available slot(s) to confirm booking'}
          </div>
        </div>
        <button
          type="button"
          onClick={handleConfirmBooking}
          disabled={selectedSlots.length < 1 || isSubmitting}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedSlots.length >= 1 ? 'text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'}`}
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : `Confirm Booking (${selectedSlots.length})`}
        </button>
      </div>
    </div>

      {/* 2nd: Already Booked Session Detail Popup Modal */}
      {selectedBookedSession && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedBookedSession(null)}
        >
          <div
            className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-md w-full p-6 animate-scale-in relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient accent background glow */}
            <div className="absolute top-0 right-0 h-32 w-32 bg-[hsl(var(--primary)/0.08)] rounded-bl-full pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                      <Check className="h-3 w-3" /> Already Booked
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] uppercase">
                      {selectedBookedSession.status || 'Confirmed'}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-[hsl(var(--foreground))] mt-1">
                    {selectedBookedSession.subject || 'Quran Tajweed & Recitation Session'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookedSession(null)}
                className="p-1.5 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Session Info Card */}
            <div className="space-y-3 p-4 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-sm mb-5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Lecturer
                </span>
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {selectedBookedSession.lecturer?.fullName || selectedBookedSession.lecturer?.name || assignedLecturer?.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Date
                </span>
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {new Date(selectedBookedSession.startsAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Time Slot
                </span>
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {new Date(selectedBookedSession.startsAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' — '}
                  {new Date(
                    selectedBookedSession.endsAt ||
                      new Date(new Date(selectedBookedSession.startsAt).getTime() + 40 * 60 * 1000)
                  ).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Classroom
                </span>
                <span className="text-xs font-semibold text-[hsl(var(--primary))] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LiveKit 1:1 Video Room
                </span>
              </div>
            </div>

            {/* Status / Guidance banner */}
            {(selectedBookedSession.status === 'no_show_student' ||
              selectedBookedSession.status === 'NO_SHOW_STUDENT' ||
              new Date(selectedBookedSession.endsAt || new Date(new Date(selectedBookedSession.startsAt).getTime() + 40 * 60 * 1000)) < new Date()) ? (
              <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/90 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 text-center space-y-1.5 mb-5">
                <div className="inline-flex p-2 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Session Conducted · You Were Absent
                </h4>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                  This session was conducted at its scheduled time, but you were absent. You may select another open slot to book your next session.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.2)] text-xs text-[hsl(var(--foreground)/0.8)] mb-5 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  This session slot is already booked and reserved for you. You can enter the classroom 5 minutes before the scheduled time from your sessions dashboard.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              {!(
                selectedBookedSession.status === 'no_show_student' ||
                selectedBookedSession.status === 'NO_SHOW_STUDENT' ||
                selectedBookedSession.status === 'canceled' ||
                selectedBookedSession.status === 'CANCELED' ||
                new Date(selectedBookedSession.endsAt || new Date(new Date(selectedBookedSession.startsAt).getTime() + 40 * 60 * 1000)) < new Date()
              ) && (
                <Link
                  href={`/student/courses/${courseId}/sessions/${selectedBookedSession.id}/room`}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-md transition-all flex items-center justify-center gap-1.5 order-first sm:order-none"
                >
                  <Video className="h-3.5 w-3.5" /> Enter Classroom
                </Link>
              )}
              <Link
                href={`/student/courses/${courseId}/sessions`}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-center transition-colors flex items-center justify-center gap-1.5"
              >
                Go to My Sessions <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedBookedSession(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmed && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmed(false)}>
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-sm w-full p-6 animate-fade-in text-center" onClick={e => e.stopPropagation()}>
            <div className="h-14 w-14 rounded-full bg-[hsl(var(--success)/0.15)] flex items-center justify-center mx-auto mb-4">
              <Check className="h-7 w-7 text-[hsl(var(--success))]" />
            </div>
            <h3 className="text-lg font-bold mb-2">Sessions Booked!</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{selectedSlots.length} session{selectedSlots.length > 1 ? 's' : ''} confirmed with {assignedLecturer.name}. You&apos;ll be able to join the internal classroom 5 minutes before the session starts.</p>
            <Link href="/student/dashboard" className="block w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)]">Return to Dashboard</Link>
          </div>
        </div>
      )}
    </>
  );
}

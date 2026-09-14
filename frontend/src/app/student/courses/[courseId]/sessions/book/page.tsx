'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, Calendar, Info, X, User, Video, ExternalLink, AlertTriangle, Clock, Lock, Play, HelpCircle, MessageSquareText } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { BookingCalendar } from '@/components/classroom/booking-calendar';

export default function BookSessionPage() {
  const params = useParams();
  const courseId = (params?.courseId as string) || 'beginner-qaida';

  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [assignedLecturer, setAssignedLecturer] = useState<any>(null);
  const [lecturerTimeshift, setLecturerTimeshift] = useState<number[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  const [studentBookings, setStudentBookings] = useState<any[]>([]);
  const [selectedBookedSession, setSelectedBookedSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [studentTier, setStudentTier] = useState<string>('STANDARD');

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
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            return;
          }
        }

        const [profile, bookings] = await Promise.all([
          apiFetch('/profile/student').catch(() => null),
          apiFetch('/bookings/student').catch(() => null),
        ]);

        if (!isMounted) return;

        if (profile) {
          setStudentTier(profile.currentTier || 'STANDARD');
        }

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

    loadData(true);

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

  const handleConfirmBooking = async (selectedSlots: string[]) => {
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
      
      setConfirmed(true);
      toast.success('Session(s) Booked!', 'Your sessions have been confirmed and added to your schedule.');
    } catch (error: any) {
      toast.error('Booking Failed', error.message || 'Failed to book session.');
    } finally {
      setIsSubmitting(false);
    }
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

      <BookingCalendar 
        mode="book"
        assignedLecturer={assignedLecturer}
        lecturerTimeshift={lecturerTimeshift}
        availabilitySlots={availabilitySlots}
        studentBookings={studentBookings}
        studentTier={studentTier}
        onConfirm={handleConfirmBooking}
        isSubmitting={isSubmitting}
        onSlotClick={(session) => setSelectedBookedSession(session)}
      />
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
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{confirmed} session confirmed with {assignedLecturer.name}. You&apos;ll be able to join the internal classroom 5 minutes before the session starts.</p>
            <Link href="/student/dashboard" className="block w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)]">Return to Dashboard</Link>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight, Check, Calendar, Info, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

function getWeekDates(weekOffset: number) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

export default function BookSessionPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [assignedLecturer, setAssignedLecturer] = useState<any>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const today = new Date();

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const profile = await apiFetch('/profile/student');
        const bookings = await apiFetch('/bookings/student');
        let lecturer = profile?.assignedLecturer || bookings?.find((b: any) => new Date(b.startsAt) > new Date())?.lecturer;
        
        if (!lecturer && bookings?.length > 0) {
          lecturer = bookings[0].lecturer;
        }

        if (!lecturer) {
          const lecturers = await apiFetch('/profile/lecturers');
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
           title: lecturer.qualifications || lecturer.title || 'Quran Instructor'
        };

        setAssignedLecturer(lecturerData);

        if (lecturerData.userId !== 'placeholder') {
           const slots = await apiFetch(`/availability/${lecturerData.userId}`);
           setAvailabilitySlots(slots || []);
        }
      } catch (error: any) {
        if (error.message === 'Forbidden resource') {
           alert('Access Denied: You must be logged in as a Student to book sessions.');
        } else {
           console.warn('Failed to load booking data:', error);
        }
        setAssignedLecturer({ name: 'Sheikh Ahmed Al-Farsi', title: 'Senior Quran Instructor' });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const isAvailable = (dateStr: string, time: string) => {
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

  const isValidPair = (day1: number, day2: number) => {
    const validPairs = [
      [1, 4], [4, 1],
      [2, 5], [5, 2],
      [3, 6], [6, 3],
    ];
    return validPairs.some(([d1, d2]) => day1 === d1 && day2 === d2);
  };

  const toggleSlot = (key: string) => {
    if (selectedSlots.includes(key)) {
      setSelectedSlots(selectedSlots.filter(s => s !== key));
    } else {
      if (selectedSlots.length >= 2) return;
      if (selectedSlots.length === 1) {
        const existingDate = new Date(selectedSlots[0].split('|')[0]);
        const newDate = new Date(key.split('|')[0]);
        if (!isValidPair(existingDate.getDay(), newDate.getDay())) return;
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
      setConfirmed(true);
    } catch (error: any) {
      alert(`Failed to book session: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSlotStatus = (key: string) => {
    if (selectedSlots.includes(key)) return 'selected';
    if (selectedSlots.length >= 2) return 'disabled';
    if (selectedSlots.length === 1) {
      const existingDate = new Date(selectedSlots[0].split('|')[0]);
      const newDate = new Date(key.split('|')[0]);
      if (!isValidPair(existingDate.getDay(), newDate.getDay())) return 'gap-blocked';
    }
    return 'available';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
        <p className="text-[hsl(var(--muted-foreground))]">Loading availability...</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6 animate-fade-in max-w-4xl">
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
          <p className="font-medium text-[hsl(var(--primary))]">You can book between <strong>1 and 2 sessions per week</strong> with your assigned lecturer.</p>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">A minimum 3-day gap is required between sessions booked in the same week.</p>
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
            {timeSlots.map((time) => (
              <tr key={time} className="border-b border-[hsl(var(--border))] last:border-0">
                <td className="py-1 px-4 text-xs text-[hsl(var(--muted-foreground))]">{time}</td>
                {weekDates.map((d, di) => {
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const key = `${dateStr}|${time}`;
                  const [year, month, day] = dateStr.split('-');
                  const [hour, min] = time.split(':');
                  const targetDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
                  const twelveHoursFromNow = new Date(today.getTime() + 12 * 60 * 60 * 1000);
                  const isPast = targetDate < twelveHoursFromNow;
                  const avail = isAvailable(dateStr, time);
                  const status = getSlotStatus(key);

                  if (isPast || !avail) {
                    return <td key={di} className="py-1 px-2"><div className="h-8 w-full rounded-lg bg-[hsl(var(--muted)/0.3)]" /></td>;
                  }

                  return (
                    <td key={di} className="py-1 px-2">
                      <button
                        onClick={() => toggleSlot(key)}
                        disabled={status === 'disabled' || status === 'gap-blocked'}
                        title={status === 'gap-blocked' ? 'Too close to your other session (3-day gap required)' : undefined}
                        className={`h-8 w-full rounded-lg transition-all text-xs font-medium ${
                          status === 'selected' ? 'bg-[hsl(var(--primary))] text-white shadow-md' :
                          status === 'gap-blocked' ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground)/0.3)] cursor-not-allowed' :
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected slots summary */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div>
          <div className="text-sm font-medium">{selectedSlots.length} of 2 slots selected</div>
          {selectedSlots.length > 0 && (
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {selectedSlots.map(s => {
                const [date, time] = s.split('|');
                return <span key={s} className="inline-block mr-3">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {time}</span>;
              })}
            </div>
          )}
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Minimum 1 session required to confirm</div>
        </div>
        <button
          onClick={handleConfirmBooking}
          disabled={selectedSlots.length < 1 || isSubmitting}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedSlots.length >= 1 ? 'text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'}`}
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Confirm Booking'}
        </button>
      </div>
    </div>

      {/* Confirmation */}
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

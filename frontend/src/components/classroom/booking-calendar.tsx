'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, Loader2, Info } from 'lucide-react';
import { toast } from '@/components/ui/toast';

export interface BookingCalendarProps {
  mode: 'book' | 'reschedule';
  assignedLecturer: any;
  lecturerTimeshift: number[];
  availabilitySlots: any[];
  studentBookings: any[];
  studentTier: string;
  onConfirm: (selectedSlots: string[]) => void;
  isSubmitting: boolean;
  onSlotClick?: (bookedSession: any) => void;
}

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

export function BookingCalendar({
  mode,
  assignedLecturer,
  lecturerTimeshift,
  availabilitySlots,
  studentBookings,
  studentTier,
  onConfirm,
  isSubmitting,
  onSlotClick
}: BookingCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const isPremium = studentTier.toUpperCase().includes('PREMIUM');
  const weeklyLimit = isPremium ? 3 : 2;
  const dailyLimit = 1;

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const today = new Date();

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
      if (mode === 'reschedule') {
        setSelectedSlots([key]); // Only 1 slot allowed for reschedule
        return;
      }

      if (bookedSessionsInWeek.length + selectedSlots.length >= weeklyLimit) {
        toast.info('Weekly Limit', `You can select up to ${weeklyLimit} sessions in a single week.`);
        return;
      }
      
      const targetDate = new Date(dateStr);
      const bookedOnThisDay = studentBookings.filter((b: any) => {
         if (b.status === 'CANCELED' || b.status === 'canceled') return false;
         const bStart = new Date(b.startsAt);
         return bStart.getFullYear() === targetDate.getFullYear() && bStart.getMonth() === targetDate.getMonth() && bStart.getDate() === targetDate.getDate();
      }).length;
      
      const selectedOnThisDay = selectedSlots.filter(s => s.startsWith(dateStr)).length;
      
      if (bookedOnThisDay + selectedOnThisDay >= dailyLimit) {
        toast.info('Daily Limit', `You can select up to ${dailyLimit} session per day.`);
        return;
      }
      
      setSelectedSlots([...selectedSlots, key]);
    }
  };

  const getSlotStatus = (key: string) => {
    const [dateStr] = key.split('|');
    if (selectedSlots.includes(key)) return 'selected';

    if (mode === 'reschedule') {
       return 'available';
    }

    if (bookedSessionsInWeek.length + selectedSlots.length >= weeklyLimit) return 'disabled';
    
    const targetDate = new Date(dateStr);
    const bookedOnThisDay = studentBookings.filter((b: any) => {
       if (b.status === 'CANCELED' || b.status === 'canceled') return false;
       const bStart = new Date(b.startsAt);
       return bStart.getFullYear() === targetDate.getFullYear() && bStart.getMonth() === targetDate.getMonth() && bStart.getDate() === targetDate.getDate();
    }).length;
    
    const selectedOnThisDay = selectedSlots.filter(s => s.startsWith(dateStr)).length;
    if (bookedOnThisDay + selectedOnThisDay >= dailyLimit) return 'disabled';
    
    return 'available';
  };

  return (
    <div className="space-y-6">
      {/* Weekly sessions notice if any already booked */}
      {bookedSessionsInWeek.length > 0 && mode === 'book' && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-medium">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              You have <strong>{bookedSessionsInWeek.length}</strong> session{bookedSessionsInWeek.length > 1 ? 's' : ''} already booked in this week. Click on any booked slot below to view its details.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
            {Math.max(0, weeklyLimit - bookedSessionsInWeek.length)} more available this week
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
        {mode === 'book' && (
          <div className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
              ✓
            </span>
            <span className="text-[hsl(var(--foreground))] font-semibold">Already Booked (Click to view)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[hsl(var(--primary))] text-white flex items-center justify-center text-[9px]">
            ✓
          </span>
          <span className="text-[hsl(var(--muted-foreground))]">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[hsl(var(--muted)/0.4)]" />
          <span className="text-[hsl(var(--muted-foreground))]">Unavailable</span>
        </div>
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
                  
                  // Rescheduling allows moving to dates >= 12 hours away
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
                          onClick={() => {
                             if (mode === 'reschedule') {
                               toast.info('Already booked', 'You already have a session booked at this time.');
                             } else if (onSlotClick) {
                               onSlotClick(bookedSession);
                             }
                          }}
                          className={`h-8 w-full rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 shadow-xs px-1 ${mode === 'book' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 cursor-pointer group hover:border-emerald-500/60 transition-all' : 'bg-[hsl(var(--muted)/0.2)] border-transparent text-[hsl(var(--muted-foreground))] cursor-not-allowed'}`}
                        >
                          {mode === 'book' && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] gap-4">
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
             {mode === 'book' ? (
                bookedSessionsInWeek.length >= weeklyLimit
                ? 'Weekly booking allowance reached for this week'
                : 'Select your preferred available slot(s) to confirm booking'
             ) : (
                'Select a new slot to reschedule your session'
             )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onConfirm(selectedSlots);
            if(mode === 'book') setSelectedSlots([]);
          }}
          disabled={selectedSlots.length < 1 || isSubmitting}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${selectedSlots.length >= 1 ? 'text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'}`}
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (mode === 'book' ? `Confirm Booking (${selectedSlots.length})` : 'Confirm New Time')}
        </button>
      </div>
    </div>
  );
}

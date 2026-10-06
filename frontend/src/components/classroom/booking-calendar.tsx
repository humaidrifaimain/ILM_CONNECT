'use client';

import { useState, useMemo } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { ScheduleCalendar, localDateKey, type ScheduleEvent } from './schedule-calendar';
import { toast } from '@/components/ui/toast';

interface CalendarLecturer { name?: string; fullName?: string; }
export interface CalendarSlot { id?: string; startsAt: string; endsAt?: string; status: string; }
export interface CalendarBooking { id: string; startsAt: string; endsAt: string; status: string; }

export interface BookingCalendarProps {
  mode: 'book' | 'reschedule';
  assignedLecturer: CalendarLecturer | null;
  lecturerTimeshift: number[];
  availabilitySlots: CalendarSlot[];
  studentBookings: CalendarBooking[];
  studentTier: string;
  onConfirm: (selectedSlots: string[]) => void;
  isSubmitting: boolean;
  onSlotClick?: (bookedSession: CalendarBooking) => void;
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

  const isPremium = /PREMIUM|FAST[\s_-]*TRACK/i.test(studentTier);
  const weeklyLimit = isPremium ? 3 : 2;
  const dailyLimit = 1;

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const today = new Date();

  // Filter active booked sessions that fall within the currently viewed week
  const bookedSessionsInWeek = useMemo(() => {
    return studentBookings.filter((b) => {
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

    return studentBookings.find((b) => {
      if (b.status === 'CANCELED' || b.status === 'canceled') return false;
      const bStart = new Date(b.startsAt);
      return (
        bStart.getFullYear() === targetDate.getFullYear() &&
        bStart.getMonth() === targetDate.getMonth() &&
        bStart.getDate() === targetDate.getDate() &&
        bStart.getHours() === targetDate.getHours() &&
        bStart.getMinutes() === targetDate.getMinutes()
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
              slotStart.getMinutes() === targetDate.getMinutes() &&
              slot.status === 'OPEN';
    });
  };

  const weekCountFor = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const monday = new Date(year, month - 1, day);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const nextMonday = new Date(monday); nextMonday.setDate(monday.getDate() + 7);
    const inWeek = (date: Date) => date >= monday && date < nextMonday;
    return studentBookings.filter(booking => booking.status.toUpperCase() !== 'CANCELED' && inWeek(new Date(booking.startsAt))).length
      + selectedSlots.filter(key => { const [y, m, d] = key.split('|')[0].split('-').map(Number); return inWeek(new Date(y, m - 1, d)); }).length;
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

      if (weekCountFor(dateStr) >= weeklyLimit) {
        toast.info('Weekly Limit', `You can select up to ${weeklyLimit} sessions in a single week.`);
        return;
      }
      
      const targetDate = new Date(...(dateStr.split('-').map(Number).map((value, index) => index === 1 ? value - 1 : value) as [number, number, number]));
      const bookedOnThisDay = studentBookings.filter((b) => {
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

    if (weekCountFor(dateStr) >= weeklyLimit) return 'disabled';
    
    const targetDate = new Date(...(dateStr.split('-').map(Number).map((value, index) => index === 1 ? value - 1 : value) as [number, number, number]));
    const bookedOnThisDay = studentBookings.filter((b) => {
       if (b.status === 'CANCELED' || b.status === 'canceled') return false;
       const bStart = new Date(b.startsAt);
       return bStart.getFullYear() === targetDate.getFullYear() && bStart.getMonth() === targetDate.getMonth() && bStart.getDate() === targetDate.getDate();
    }).length;
    
    const selectedOnThisDay = selectedSlots.filter(s => s.startsWith(dateStr)).length;
    if (bookedOnThisDay + selectedOnThisDay >= dailyLimit) return 'disabled';
    
    return 'available';
  };

  const calendarEvents: ScheduleEvent[] = [];
  for (const slot of availabilitySlots) {
    const startsAt = new Date(slot.startsAt);
    const dateStr = localDateKey(startsAt);
    const time = `${String(startsAt.getHours()).padStart(2, '0')}:${String(startsAt.getMinutes()).padStart(2, '0')}`;
    const key = `${dateStr}|${time}`;
    if (!isInTimeshift(time) || !isAvailable(dateStr, time) || getBookedSessionForSlot(dateStr, time) || startsAt.getTime() < today.getTime() + 12 * 3600000) continue;
    const status = getSlotStatus(key);
    calendarEvents.push({
      id: key, startsAt: slot.startsAt, endsAt: slot.endsAt || new Date(startsAt.getTime() + 40 * 60000).toISOString(),
      title: status === 'selected' ? 'Selected session' : 'Available session',
      subtitle: assignedLecturer?.name || assignedLecturer?.fullName || '40-minute session',
      tone: status === 'selected' ? 'purple' : 'green', selected: status === 'selected',
      disabled: status === 'disabled' || isSubmitting,
      onClick: () => toggleSlot(key),
    });
  }
  for (const booking of studentBookings) {
    if (booking.status?.toUpperCase() === 'CANCELED') continue;
    calendarEvents.push({
      id: booking.id, startsAt: booking.startsAt, endsAt: booking.endsAt,
      title: 'Booked session', subtitle: assignedLecturer?.name || assignedLecturer?.fullName,
      tone: 'blue', disabled: mode === 'reschedule', onClick: () => onSlotClick?.(booking),
    });
  }

  return (
    <div className="space-y-4">
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

      <ScheduleCalendar
        events={calendarEvents}
        startHour={10}
        visibleHours={lecturerTimeshift}
        onDateChange={(date) => {
          const monday = getWeekDates(0)[0];
          const nextMonday = new Date(date);
          nextMonday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
          nextMonday.setHours(0, 0, 0, 0);
          setWeekOffset(Math.round((nextMonday.getTime() - monday.getTime()) / (7 * 86400000)));
        }}
        isCellDisabled={(date) => !isInTimeshift(`${String(date.getHours()).padStart(2, '0')}:00`) || date.getTime() < today.getTime() + 12 * 3600000 || !isAvailable(localDateKey(date), `${String(date.getHours()).padStart(2, '0')}:00`)}
        getCellDisabledReason={(date) => {
          const time = `${String(date.getHours()).padStart(2, '0')}:00`;
          if (!isInTimeshift(time)) return 'Outside lecturer shift';
          if (date.getTime() < today.getTime()) return 'Past slot';
          if (date.getTime() < today.getTime() + 12 * 3600000) return '12-hour notice';
          if (!isAvailable(localDateKey(date), time)) return 'Unavailable';
          return undefined;
        }}
        ariaLabel="Book or reschedule a session"
      />

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

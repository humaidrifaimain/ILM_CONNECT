'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { ScheduleCalendar, type ScheduleEvent } from '@/components/classroom/schedule-calendar';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { availabilitySessionStarts, conflictsWithLecturerBreak, sessionFitsShift, SESSION_MINUTES } from '@/lib/session-timing';


// Lecturer working hours: 10 to 2, 2 to 6, and 6 to 10 (10:00 AM to 10:00 PM)
const hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function formatHourSlot(h: number) {
  const format = (hour: number) => new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${format(h)} – ${format(h + 1)}`;
}

function formatShiftName(shiftHours: number[]) {
  if (!Array.isArray(shiftHours) || shiftHours.length === 0) return '';
  const set = new Set(shiftHours.map(Number));
  const is10to2 = [10, 11, 12, 13].every((h) => set.has(h));
  const is2to6 = [14, 15, 16, 17].every((h) => set.has(h));
  const is6to10 = [18, 19, 20, 21].every((h) => set.has(h));
  const shifts: string[] = [];
  if (is10to2) shifts.push('10 to 2 (10:00 AM – 02:00 PM)');
  if (is2to6) shifts.push('2 to 6 (02:00 PM – 06:00 PM)');
  if (is6to10) shifts.push('6 to 10 (06:00 PM – 10:00 PM)');
  if (shifts.length === 3) return 'All Shifts (10:00 AM – 10:00 PM)';
  if (shifts.length > 0) return shifts.join(' + ');
  return shiftHours.map(formatHourSlot).join(', ');
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface AvailabilitySlot { id: string; startsAt: string; endsAt: string; status: string; }
interface AvailabilityProfile { userId?: string; hourlyAvailabilityJson?: number[]; }
const getSlotKey = (dayStr: string, hour: number, minute: number) => `${dayStr}@${hour}:${minute}`;
function shiftDate(instant: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
  const value = (name: string) => Number(parts.find(part => part.type === name)?.value);
  return new Date(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
}
function shiftInstant(date: Date) {
  return new Date(`${formatDateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00+05:30`);
}

export default function AvailabilityPage() {
  const [localSlots, setLocalSlots] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const queryClient = useQueryClient();
  const { data: rawDbSlots, isLoading, isError: slotsError, refetch: refetchSlots } = useQuery<AvailabilitySlot[]>({
    queryKey: ['availabilitySlots'],
    queryFn: () => apiFetch('/availability'),
  });

  // Fetch lecturer's own profile to get timeshift
  const { data: lecturerProfile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery<AvailabilityProfile>({
    queryKey: ['lecturerProfile'],
    queryFn: () => apiFetch('/profile/lecturer'),
  });
  const timeshift: number[] = Array.isArray(lecturerProfile?.hourlyAvailabilityJson)
    ? lecturerProfile.hourlyAvailabilityJson.map(Number)
    : [];

  // Map DB slots to our key format using consistent local dates
  const dbSlotsMap = useMemo(() => {
    const map = new Map<string, AvailabilitySlot>();
    if (Array.isArray(rawDbSlots)) {
      rawDbSlots.forEach((slot) => {
        const d = shiftDate(slot.startsAt);
        const dayStr = formatDateKey(d);
        const hour = d.getHours();
        map.set(getSlotKey(dayStr, hour, d.getMinutes()), slot);
      });
    }
    return map;
  }, [rawDbSlots]);

  const isAvailable = (key: string) => {
    if (localSlots[key] !== undefined) return localSlots[key];
    return dbSlotsMap.has(key);
  };

  const slotStart = (key: string) => {
    const [dayStr, time] = key.split('@');
    const [year, month, day] = dayStr.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute);
  };
  const slotDisabledReason = (date: Date) => {
    if (isSaving) return 'Saving changes';
    if (shiftInstant(date) <= new Date()) return 'Past time';
    if (!hours.includes(date.getHours()) || !sessionFitsShift(date, timeshift)) return 'Outside your shift';
    const key = getSlotKey(formatDateKey(date), date.getHours(), date.getMinutes());
    if (isAvailable(key)) return undefined;
    const end = new Date(date.getTime() + SESSION_MINUTES * 60_000);
    const activeKeys = new Set([...dbSlotsMap.keys(), ...Object.keys(localSlots)]);
    for (const otherKey of activeKeys) {
      if (!isAvailable(otherKey)) continue;
      const otherStart = slotStart(otherKey);
      const stored = dbSlotsMap.get(otherKey);
      const otherEnd = stored ? shiftDate(stored.endsAt) : new Date(otherStart.getTime() + SESSION_MINUTES * 60_000);
      if (conflictsWithLecturerBreak(date, end, otherStart, otherEnd)) return 'Session or reserved break';
    }
    return undefined;
  };

  const toggleSlot = (key: string) => {
    if (formatDateKey(slotStart(key)) < formatDateKey(shiftDate(new Date().toISOString()))) return;
    const dbSlot = dbSlotsMap.get(key);
    if (dbSlot?.status === 'BOOKED') {
      toast.info('Slot Booked', 'This slot is already booked for a student session and cannot be modified.');
      return;
    }
    setLocalSlots(prev => ({ ...prev, [key]: !isAvailable(key) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const creates: Array<() => Promise<unknown>> = [];
      const deletes: Array<() => Promise<unknown>> = [];

      Object.entries(localSlots).forEach(([key, active]) => {
        const hasInDb = dbSlotsMap.has(key);
        if (active && !hasInDb) {
          const startsAt = shiftInstant(slotStart(key));
          const endsAt = new Date(+startsAt + SESSION_MINUTES * 60000);

          creates.push(() => apiFetch('/availability', {
            method: 'POST',
            body: JSON.stringify({
              startsAt: startsAt.toISOString(),
              endsAt: endsAt.toISOString(),
              lecturerId: lecturerProfile?.userId,
            }),
          }));
        } else if (!active && hasInDb) {
          const slot = dbSlotsMap.get(key);
          if (slot && slot.status !== 'BOOKED') {
            deletes.push(() => apiFetch(`/availability/${slot.id}`, { method: 'DELETE' }));
          }
        }
      });

      if (creates.length === 0 && deletes.length === 0) {
        setLocalSlots({});
        toast.info('No Changes', 'No schedule modifications to save.');
        return;
      }

      const totalAttempts = creates.length + deletes.length;
      const deleted = await Promise.allSettled(deletes.map(remove => remove()));
      const created = await Promise.allSettled(creates.map(create => create()));
      const results = [...deleted, ...created];
      const rejected = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];

      await queryClient.invalidateQueries({ queryKey: ['availabilitySlots'] });
      setLocalSlots({});

      if (rejected.length > 0) {
        console.error('Failed to save some availability changes:', rejected);
        let firstReason = rejected[0]?.reason?.message || 'Some changes could not be applied';
        if (firstReason.toLowerCase().includes('forbidden')) {
          firstReason = 'Permission check failed. Please refresh or verify lecturer account session.';
        }
        if (rejected.length === totalAttempts) {
          toast.error('Save Failed', `${firstReason}`);
        } else {
          toast.error('Partial Save Notice', `${rejected.length} slot(s) could not be updated: ${firstReason}`);
        }
      } else {
        toast.success('Availability Confirmed!', 'Your teaching schedule has been successfully updated.');
      }
    } catch (err: unknown) {
      console.error('Failed to save availability:', err);
      let errMsg = err instanceof Error ? err.message : 'Failed to save availability changes.';
      if (errMsg.toLowerCase().includes('forbidden')) {
        errMsg = 'Permission check failed. Please refresh or verify lecturer account session.';
      }
      toast.error('Save Failed', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const calendarEvents: ScheduleEvent[] = [];
  const keys = new Set([...dbSlotsMap.keys(), ...Object.keys(localSlots)]);
  for (const key of keys) {
    if (!isAvailable(key)) continue;
    const dbSlot = dbSlotsMap.get(key);
    const startsAt = slotStart(key);
    const booked = dbSlot?.status === 'BOOKED';
    const past = formatDateKey(startsAt) < formatDateKey(shiftDate(new Date(now).toISOString()));
    calendarEvents.push({
      id: key, startsAt: startsAt.toISOString(), endsAt: dbSlot ? shiftDate(dbSlot.endsAt).toISOString() : new Date(startsAt.getTime() + 40 * 60000).toISOString(),
      title: booked ? 'Booked session' : past ? 'Past session' : 'Available session', subtitle: booked ? 'Reserved for a student' : past ? 'This time has passed' : '40-minute session',
      tone: booked ? 'blue' : localSlots[key] ? 'purple' : 'green', selected: !past && localSlots[key] === true, past,
      disabled: past || booked || isSaving, onClick: () => toggleSlot(key),
    });
  }

  if (slotsError || profileError) return <div role="alert" className="space-y-3"><p>Unable to load your availability and assigned shift.</p><button className="rounded-lg border px-4 py-2" onClick={() => { void refetchSlots(); void refetchProfile(); }}>Retry</button></div>;
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 text-sm leading-6 text-[#095F46]">
          <p>Click an empty time cell to add availability, or an available session to remove it. Booked sessions are locked. Save Changes to apply your edits.</p>
          <p>Each time slot is one 40-minute class.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button onClick={handleSave} disabled={isSaving || Object.keys(localSlots).length === 0} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#095F46] hover:bg-[#074c38] shadow-sm transition-all disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Timeshift Info & Shift Change Notice */}
      {timeshift.length > 0 ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-amber-900 dark:text-amber-200">
                Assigned Working Timeshift: {formatShiftName(timeshift)} (Asia/Colombo)
              </p>
              <p className="text-xs text-amber-900 dark:text-amber-200 mt-0.5">
                You can set availability during your assigned shift hours ({timeshift.map(h => `${h.toString().padStart(2,'0')}:00`).join(', ')}). Lecturers cannot self-modify their assigned shift. Need to switch shifts (e.g. 10 to 2, 2 to 6, 6 to 10)?
              </p>
            </div>
          </div>
          <Link
            href="/lecturer/support?tab=contact"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 transition-colors whitespace-nowrap flex-shrink-0 shadow-sm"
          >
            Request Shift Change
          </Link>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-blue-900 dark:text-blue-200">
                No Working Shift Assigned
              </p>
              <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                Working shifts (10 AM–2 PM, 2 PM–6 PM, 6 PM–10 PM) are designated by administration. Please contact administration to assign your schedule.
              </p>
            </div>
          </div>
          <Link
            href="/lecturer/support?tab=contact"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors whitespace-nowrap flex-shrink-0 shadow-sm"
          >
            Contact Admin
          </Link>
        </div>
      )}

      {(isLoading || profileLoading) && (
        <LoadingScreen message="Loading Schedule..." subtitle="Fetching your lecturer working hours & open slots" />
      )}

      {!isLoading && !profileLoading && <ScheduleCalendar
        events={calendarEvents}
        startHour={10}
        visibleHours={timeshift}
        getSessionStarts={(day) => availabilitySessionStarts(day, timeshift, calendarEvents)}
        onCellClick={(date) => toggleSlot(getSlotKey(formatDateKey(date), date.getHours(), date.getMinutes()))}
        isCellDisabled={(date) => !!slotDisabledReason(date)}
        getCellDisabledReason={slotDisabledReason}
        timezoneLabel="Times shown in Asia/Colombo"
        ariaLabel="Lecturer availability calendar"
      />}
    </div>
  );
}

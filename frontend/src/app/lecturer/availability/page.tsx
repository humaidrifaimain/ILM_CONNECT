'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar, List, Clock, Lock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';


type ViewMode = 'weekly' | 'monthly';
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Lecturer working hours: 10 to 2, 2 to 6, and 6 to 10 (10:00 AM to 10:00 PM)
const hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function formatHourSlot(h: number) {
  const start = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${start}:00 – ${start}:40 ${ampm}`;
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

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }
const getSlotKey = (dayStr: string, hour: number) => `${dayStr}@${hour}`;

export default function AvailabilityPage() {
  const [view, setView] = useState<ViewMode>('weekly');
  const [weekOffset, setWeekOffset] = useState(0);
  const [localSlots, setLocalSlots] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();
  const { data: rawDbSlots, isLoading } = useQuery<any[]>({
    queryKey: ['availabilitySlots'],
    queryFn: () => apiFetch('/availability'),
  });

  // Fetch lecturer's own profile to get timeshift
  const { data: lecturerProfile } = useQuery<any>({
    queryKey: ['lecturerProfile'],
    queryFn: () => apiFetch('/profile/lecturer'),
  });
  const timeshift: number[] = Array.isArray(lecturerProfile?.hourlyAvailabilityJson)
    ? lecturerProfile.hourlyAvailabilityJson.map(Number)
    : [];

  // Map DB slots to our key format using consistent local dates
  const dbSlotsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (Array.isArray(rawDbSlots)) {
      rawDbSlots.forEach((slot: any) => {
        const d = new Date(slot.startsAt);
        const dayStr = formatDateKey(d);
        const hour = d.getHours();
        map.set(getSlotKey(dayStr, hour), slot);
      });
    }
    return map;
  }, [rawDbSlots]);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const isAvailable = (key: string) => {
    if (localSlots[key] !== undefined) return localSlots[key];
    return dbSlotsMap.has(key);
  };

  const toggleSlot = (key: string) => {
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
      const creates: Promise<any>[] = [];
      const deletes: Promise<any>[] = [];

      Object.entries(localSlots).forEach(([key, active]) => {
        const hasInDb = dbSlotsMap.has(key);
        if (active && !hasInDb) {
          const [dayStr, hourStr] = key.split('@');
          const [year, month, dateNum] = dayStr.split('-').map(Number);
          const hour = parseInt(hourStr, 10);
          const startsAt = new Date(year, month - 1, dateNum, hour, 0, 0, 0);
          const endsAt = new Date(year, month - 1, dateNum, hour, 40, 0, 0); // 40-minute capped session slot

          creates.push(apiFetch('/availability', {
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
            deletes.push(apiFetch(`/availability/${slot.id}`, { method: 'DELETE' }));
          }
        }
      });

      if (creates.length === 0 && deletes.length === 0) {
        setLocalSlots({});
        toast.info('No Changes', 'No schedule modifications to save.');
        return;
      }

      const totalAttempts = creates.length + deletes.length;
      const results = await Promise.allSettled([...creates, ...deletes]);
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
    } catch (err: any) {
      console.error('Failed to save availability:', err);
      let errMsg = err?.message || 'Failed to save availability changes.';
      if (errMsg.toLowerCase().includes('forbidden')) {
        errMsg = 'Permission check failed. Please refresh or verify lecturer account session.';
      }
      toast.error('Save Failed', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const monthName = new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
  const prevMonth = () => { if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); } else setCalMonth(calMonth - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); } else setCalMonth(calMonth + 1); };

  const getSlotsCount = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    const dayStr = formatDateKey(d);
    return hours.filter(h => isAvailable(getSlotKey(dayStr, h))).length;
  };


  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Availability</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-[hsl(var(--muted))] p-1">
            <button onClick={() => setView('weekly')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'weekly' ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
              <List className="h-3.5 w-3.5" /> Weekly
            </button>
            <button onClick={() => setView('monthly')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'monthly' ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
              <Calendar className="h-3.5 w-3.5" /> Monthly
            </button>
          </div>
          <button onClick={handleSave} disabled={isSaving || Object.keys(localSlots).length === 0} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] text-sm">
        💡 Click cells to toggle availability. Green = available, empty = unavailable. Students will see these slots in their timezone. Make sure to click Save!
      </div>

      {/* Timeshift Info & Shift Change Notice */}
      {timeshift.length > 0 ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-amber-900 dark:text-amber-200">
                Assigned Working Timeshift: {formatShiftName(timeshift)}
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                You can set availability during your assigned shift hours ({timeshift.map(h => `${h.toString().padStart(2,'0')}:00`).join(', ')}). Lecturers cannot self-modify their assigned shift. Need to switch shifts (e.g. 10 to 2, 2 to 6, 6 to 10)?
              </p>
            </div>
          </div>
          <Link
            href="/lecturer/support?tab=contact"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors whitespace-nowrap flex-shrink-0 shadow-sm"
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

      {isLoading && (
        <LoadingScreen message="Loading Schedule..." subtitle="Fetching your lecturer working hours & open slots" />
      )}

      {/* WEEKLY VIEW */}
      {!isLoading && view === 'weekly' && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekOffset(weekOffset - 1)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
              <ChevronLeft className="h-4 w-4" /> Previous Week
            </button>
            <span className="font-semibold text-sm">{weekLabel}</span>
            <button onClick={() => setWeekOffset(weekOffset + 1)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
              Next Week <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-[hsl(var(--primary))] hover:underline">← Back to current week</button>
          )}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))]">Time</th>
                  {weekDates.map((d, i) => (
                    <th key={i} className="py-3 px-2 text-center text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                      <div>{shortDays[i]}</div>
                      <div className="font-normal">{d.getDate()}/{d.getMonth()+1}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
            {hours.map((h) => {
              const inTimeshift = timeshift.length === 0 || timeshift.includes(h);
              return (
              <tr key={h} className={`border-b border-[hsl(var(--border))] last:border-0 ${!inTimeshift ? 'opacity-40' : ''}`}>
                <td className="py-2 px-3 text-xs text-[hsl(var(--muted-foreground))]">
                  <div className="flex items-center gap-1.5">
                    {!inTimeshift && <span title="Outside your timeshift" className="text-xs">🔒</span>}
                    <div>
                      <div className="font-bold text-[hsl(var(--foreground))] whitespace-nowrap text-xs">
                        {formatHourSlot(h)}
                      </div>
                      <div className="text-[10px] text-[hsl(var(--primary))] font-medium whitespace-nowrap">
                        40 mins session
                      </div>
                    </div>
                  </div>
                </td>
                {weekDates.map((d, di) => {
                  const dayStr = formatDateKey(d);
                  const key = getSlotKey(dayStr, h);
                  const avail = isAvailable(key);
                  const dbSlot = dbSlotsMap.get(key);
                  const isBooked = dbSlot?.status === 'BOOKED';

                  if (!inTimeshift) {
                    return (
                      <td key={di} className="py-1 px-2 text-center">
                        <div
                          className="h-8 w-full rounded-lg bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border)/0.5)] flex items-center justify-center"
                          title="Outside your working timeshift"
                        >
                          <span className="text-[10px] text-[hsl(var(--muted-foreground)/0.4)]">—</span>
                        </div>
                      </td>
                    );
                  }

                  if (isBooked) {
                    return (
                      <td key={di} className="py-1 px-2 text-center">
                        <div
                          className="h-8 w-full rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-semibold"
                          title="Booked for a student session"
                        >
                          Booked
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={di} className="py-1 px-2 text-center">
                      <button onClick={() => toggleSlot(key)} className={`h-8 w-full rounded-lg transition-all text-xs font-medium ${avail ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground)/0.3)] hover:bg-[hsl(var(--border))]'}`}>
                        {avail ? '✓' : ''}
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
        </>
      )}

      {/* MONTHLY VIEW */}
      {!isLoading && view === 'monthly' && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--border))]">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]"><ChevronLeft className="h-4 w-4" /></button>
            <span className="font-semibold">{monthName}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[80px] p-2 border-b border-r border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const slotsCount = getSlotsCount(day);
              const isToday = calYear === now.getFullYear() && calMonth === now.getMonth() && day === now.getDate();
              const density = slotsCount / hours.length;
              return (
                <button key={day} onClick={() => {
                  const targetDate = new Date(calYear, calMonth, day);
                  const today = new Date();
                  const targetMonday = new Date(targetDate);
                  targetMonday.setDate(targetDate.getDate() - ((targetDate.getDay() + 6) % 7));
                  const todayMonday = new Date(today);
                  todayMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
                  const weekDiff = Math.round((targetMonday.getTime() - todayMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
                  setWeekOffset(weekDiff);
                  setView('weekly');
                }} className={`min-h-[80px] p-2 border-b border-r border-[hsl(var(--border))] text-left hover:bg-[hsl(var(--muted)/0.5)] transition-colors ${isToday ? 'bg-[hsl(var(--primary)/0.05)]' : ''}`}>

                  <div className={`text-xs font-medium mb-2 ${isToday ? 'h-5 w-5 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center' : ''}`}>{day}</div>
                  <div className={`h-2 rounded-full ${density > 0.5 ? 'bg-[hsl(var(--success)/0.4)]' : density > 0 ? 'bg-[hsl(var(--warning)/0.3)]' : 'bg-[hsl(var(--muted))]'}`} />
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">{slotsCount} slots</div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 px-5 py-3 text-xs text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))]">
            <div className="flex items-center gap-1.5"><div className="h-2 w-6 rounded-full bg-[hsl(var(--success)/0.4)]" /> High availability</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-6 rounded-full bg-[hsl(var(--warning)/0.3)]" /> Low availability</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-6 rounded-full bg-[hsl(var(--muted))]" /> No slots</div>
            <span className="ml-auto">Click a day to edit slots</span>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

type ViewMode = 'weekly' | 'monthly';
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

function getWeekDates(weekOffset: number) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }
const getSlotKey = (dayStr: string, hour: number) => `${dayStr}-${hour}`;

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

  // Map DB slots to our key format
  const dbSlotsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (Array.isArray(rawDbSlots)) {
      rawDbSlots.forEach((slot: any) => {
        const d = new Date(slot.startsAt);
        const dayStr = d.toISOString().split('T')[0];
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
    setLocalSlots(prev => ({ ...prev, [key]: !isAvailable(key) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const creates: any[] = [];
      const deletes: any[] = [];

      Object.entries(localSlots).forEach(([key, active]) => {
        const hasInDb = dbSlotsMap.has(key);
        if (active && !hasInDb) {
          const [dayStr, hourStr] = key.split('-');
          const d = new Date(dayStr);
          d.setHours(parseInt(hourStr), 0, 0, 0);
          const endsAt = new Date(d);
          endsAt.setHours(d.getHours() + 1);
          creates.push(apiFetch('/availability', {
            method: 'POST',
            body: JSON.stringify({ startsAt: d.toISOString(), endsAt: endsAt.toISOString() }),
          }));
        } else if (!active && hasInDb) {
          const slotId = dbSlotsMap.get(key).id;
          deletes.push(apiFetch(`/availability/${slotId}`, { method: 'DELETE' }));
        }
      });

      await Promise.all([...creates, ...deletes]);
      await queryClient.invalidateQueries({ queryKey: ['availabilitySlots'] });
      setLocalSlots({});
    } catch (err) {
      alert('Failed to save some availability changes.');
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
    const dayStr = d.toISOString().split('T')[0];
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

      {isLoading && <div className="text-[hsl(var(--muted-foreground))] text-sm p-4">Loading your schedule...</div>}

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
                {hours.map((h) => (
                  <tr key={h} className="border-b border-[hsl(var(--border))] last:border-0">
                    <td className="py-1 px-4 text-xs text-[hsl(var(--muted-foreground))]">{`${h.toString().padStart(2,'0')}:00`}</td>
                    {weekDates.map((d, di) => {
                      // Use local ISO format without timezone shift to match exact date components reliably
                      const d2 = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
                      const key = getSlotKey(d2.toISOString().split('T')[0], h);
                      const avail = isAvailable(key);
                      return (
                        <td key={di} className="py-1 px-2 text-center">
                          <button onClick={() => toggleSlot(key)} className={`h-8 w-full rounded-lg transition-all text-xs font-medium ${avail ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground)/0.3)] hover:bg-[hsl(var(--border))]'}`}>
                            {avail ? '✓' : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
                  const d = new Date(calYear, calMonth, day);
                  const today = new Date();
                  const diff = Math.floor((d.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000));
                  setWeekOffset(diff);
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

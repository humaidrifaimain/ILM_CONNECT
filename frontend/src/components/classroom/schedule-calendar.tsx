'use client';

import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, LockKeyhole } from 'lucide-react';
import { getSessionStatus, type SessionTone } from '@/lib/session-status';

export interface ScheduleEvent {
  id: string;
  startsAt: string;
  endsAt?: string;
  title: string;
  subtitle?: string;
  tone?: SessionTone;
  status?: string;
  rescheduledAt?: string | null;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  reserveBreak?: boolean;
}

type CalendarView = 'day' | 'week' | 'month';
const colors = {
  blue: 'border-[#b9cac2] bg-[#e8f0ed] text-[#0b3027]',
  purple: 'border-[#095F46] bg-[#d4f4e7] text-[#095F46]',
  green: 'border-[#b4dfce] bg-[#effaf5] text-[#095F46]',
  amber: 'border-amber-400 bg-amber-50 text-amber-900',
  red: 'border-rose-400 bg-rose-50 text-rose-900',
};
export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function addDays(date: Date, days: number) {
  const next = new Date(date); next.setDate(next.getDate() + days); return next;
}
function weekStart(date: Date) {
  const next = addDays(date, -((date.getDay() + 6) % 7)); next.setHours(0, 0, 0, 0); return next;
}
function timeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function eventLayout(events: ScheduleEvent[]) {
  const positions = new Map<string, { column: number; count: number }>();
  let group: { id: string; column: number }[] = [];
  let columns: number[] = [];
  const finish = () => {
    group.forEach(event => positions.set(event.id, { column: event.column, count: columns.length }));
    group = []; columns = [];
  };
  for (const event of events) {
    const start = Date.parse(event.startsAt);
    const end = event.endsAt ? Date.parse(event.endsAt) : start + 40 * 60000;
    if (columns.length && columns.every(until => until <= start)) finish();
    let column = columns.findIndex(until => until <= start);
    if (column < 0) column = columns.length;
    columns[column] = end;
    group.push({ id: event.id, column });
  }
  finish();
  return positions;
}

export function ScheduleCalendar({ events, startHour = 8, endHour = 22, visibleHours, onCellClick, isCellDisabled, getCellDisabledReason, onDateChange, cellStepMinutes = 60, breakMinutes = 0, ariaLabel = 'Session calendar', timezoneLabel = 'Times shown in your device’s timezone' }: {
  events: ScheduleEvent[];
  startHour?: number;
  endHour?: number;
  visibleHours?: number[];
  onCellClick?: (date: Date) => void;
  isCellDisabled?: (date: Date) => boolean;
  getCellDisabledReason?: (date: Date) => string | undefined;
  onDateChange?: (date: Date) => void;
  ariaLabel?: string;
  timezoneLabel?: string;
  cellStepMinutes?: 10 | 60;
  breakMinutes?: number;
}) {
  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>('week');
  const today = new Date();
  const start = view === 'day' ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : view === 'month' ? weekStart(new Date(date.getFullYear(), date.getMonth(), 1)) : weekStart(date);
  const days = Array.from({ length: view === 'month' ? 42 : view === 'day' ? 1 : 7 }, (_, i) => addDays(start, i));
  const moveTo = (next: Date) => { setDate(next); onDateChange?.(next); };
  const navigate = (direction: number) => {
    const next = view === 'month' ? new Date(date.getFullYear(), date.getMonth() + direction, 1) : addDays(date, direction * (view === 'week' ? 7 : 1));
    moveTo(next);
  };
  const allowedEvents = visibleHours ? events.filter(event => visibleHours.includes(new Date(event.startsAt).getHours())) : events;
  const eventsForDay = (day: Date) => allowedEvents.filter(event => localDateKey(new Date(event.startsAt)) === localDateKey(day));
  const visibleEvents = allowedEvents.filter(event => days.some(day => localDateKey(day) === localDateKey(new Date(event.startsAt))));
  // Include early/late sessions rather than silently hiding them outside working hours.
  const firstHour = Math.min(startHour, ...visibleEvents.map(event => new Date(event.startsAt).getHours()));
  const endMinute = (event: ScheduleEvent) => {
    const begins = new Date(event.startsAt);
    const ends = new Date(event.endsAt || begins.getTime() + 40 * 60000);
    return localDateKey(ends) !== localDateKey(begins) ? 24 * 60 : ends.getHours() * 60 + ends.getMinutes();
  };
  const lastHour = Math.min(24, Math.max(endHour, ...visibleEvents.map(event => Math.ceil(endMinute(event) / 60))));
  const hours = visibleHours ? [...new Set(visibleHours)].filter(hour => Number.isInteger(hour) && hour >= 0 && hour < 24).sort((a, b) => a - b) : Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  if (breakMinutes > 0) {
    for (const event of visibleEvents) {
      if (event.reserveBreak === false) continue;
      const begins = new Date(event.startsAt);
      const ends = new Date(event.endsAt || begins.getTime() + 40 * 60000);
      for (const edge of [new Date(ends.getTime() + breakMinutes * 60000 - 1)]) {
        if (localDateKey(edge) === localDateKey(begins) && !hours.includes(edge.getHours())) hours.push(edge.getHours());
      }
    }
    hours.sort((a, b) => a - b);
  }
  const hourHeight = cellStepMinutes === 10 ? 288 : 108;
  const dayWidths = days.map(day => {
    const dayEvents = eventsForDay(day);
    const concurrent = Math.max(1, ...dayEvents.map(event => dayEvents.filter(other => Date.parse(other.startsAt) <= Date.parse(event.startsAt) && Date.parse(other.endsAt || new Date(Date.parse(other.startsAt) + 40 * 60000).toISOString()) > Date.parse(event.startsAt)).length));
    return Math.max(view === 'day' ? 232 : 210, concurrent * 190);
  });
  const timedColumns = `88px ${dayWidths.map(width => `minmax(${width}px, 1fr)`).join(' ')}`;
  const cellHeight = hourHeight * cellStepMinutes / 60;
  const eventStates = [...new Map(events.filter(event => event.status).map(event => {
    const state = getSessionStatus(event.status!, event.rescheduledAt);
    return [state.label, state] as const;
  })).values()];
  const eventCard = (event: ScheduleEvent, compact = false) => {
    const state = event.status ? getSessionStatus(event.status, event.rescheduledAt) : null;
    return (
    <button type="button" style={{ borderRadius: 8, fontSize: 12, opacity: 1 }} title={`${event.title}${event.subtitle ? ` · ${event.subtitle}` : ''}${event.disabled ? ' · Locked' : ''}`} disabled={event.disabled} onClick={event.onClick} aria-pressed={event.selected || undefined}
      aria-label={`${event.title}, ${new Date(event.startsAt).toLocaleDateString()}, ${timeLabel(new Date(event.startsAt))}${state ? `, ${state.label}` : ''}${event.subtitle ? `, ${event.subtitle}` : ''}`}
      className={`flex h-full w-full flex-col items-stretch justify-start overflow-hidden rounded-md border text-left text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095F46] ${colors[state?.tone || event.tone || 'blue']} ${event.selected ? 'ring-2 ring-[#095F46]' : ''} ${event.disabled ? 'cursor-default' : 'hover:brightness-95'}`}>
      <span className={`block whitespace-nowrap border-b border-current/10 px-2 py-1 font-semibold leading-tight tabular-nums ${compact ? 'text-[10px]' : ''}`}>{timeLabel(new Date(event.startsAt))}{!compact && event.endsAt ? ` – ${timeLabel(new Date(event.endsAt))}` : ''}</span>
      <span className="flex items-center gap-1 px-2 py-1 font-semibold leading-tight">{event.disabled && <LockKeyhole className="h-3 w-3 shrink-0" />}<span className="truncate">{state ? `${state.label} · ` : ''}{event.title}</span>{event.selected && <span aria-hidden="true" className="ml-auto">✓</span>}</span>
    </button>
  ); };

  return (
    <section aria-label={ariaLabel} className="min-w-0 max-w-full overflow-hidden rounded-xl border border-[#e4e7eb] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3"><h2 className="text-lg font-bold text-stone-900">{date.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2><button type="button" onClick={() => moveTo(new Date())} className="rounded-md border border-[#e4e7eb] px-3 py-2 text-sm font-semibold hover:bg-stone-50">Today</button></div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-[#f5f6f8] p-1" aria-label="Calendar view">{(['day', 'week', 'month'] as const).map(item => <button type="button" key={item} aria-pressed={view === item} onClick={() => setView(item)} className={`rounded-md px-3 py-2 text-sm capitalize ${view === item ? 'bg-white font-bold text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}>{item.charAt(0).toUpperCase() + item.slice(1)}</button>)}</div>
          <span className="flex items-center gap-2 rounded-lg border border-[#e4e7eb] px-3 py-2 text-xs font-semibold text-stone-600"><CalendarDays className="h-4 w-4" />{view === 'month' ? date.toLocaleDateString([], { month: 'long', year: 'numeric' }) : `${days[0].toLocaleDateString([], { day: 'numeric', month: 'short' })} – ${days[days.length - 1].toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`}</span>
        </div>
      </div>
      {hours.length === 0 && <p className="border-t border-[#d6e0db] p-6 text-center text-sm text-[#56635c]">No working shift assigned. Contact administration to set your calendar hours.</p>}
      <div className="max-h-[720px] overflow-auto">
        <div style={{ minWidth: view === 'month' ? 840 : 88 + dayWidths.reduce((total, width) => total + width, 0) }}>
          <div className="sticky top-0 z-30 grid border-y border-[#e4e7eb] bg-white" style={{ gridTemplateColumns: view === 'month' ? '88px repeat(7, minmax(0, 1fr))' : timedColumns }}>
            <div className="flex items-center justify-center gap-1"><button type="button" aria-label={`Previous ${view}`} onClick={() => navigate(-1)} className="rounded p-2 hover:bg-stone-100"><ChevronLeft className="h-4 w-4" /></button><button type="button" aria-label={`Next ${view}`} onClick={() => navigate(1)} className="rounded p-2 hover:bg-stone-100"><ChevronRight className="h-4 w-4" /></button></div>
            {(view === 'month' ? days.slice(0, 7) : days).map(day => <div key={localDateKey(day)} className={`border-l border-[#e4e7eb] px-2 py-5 text-center text-xs font-semibold uppercase ${localDateKey(day) === localDateKey(today) && view !== 'month' ? 'bg-[#e8f0ed] text-[#095F46]' : 'text-stone-500'}`}>{day.toLocaleDateString([], { weekday: 'short' })}{view !== 'month' ? ` ${day.getDate()}` : ''}</div>)}
          </div>
          {view === 'month' ? <div className="grid grid-cols-7 border-l-[88px] border-l-white">{days.map(day => <div key={localDateKey(day)} className={`min-h-32 border-b border-l border-[#e4e7eb] p-2 ${day.getMonth() !== date.getMonth() ? 'bg-stone-50' : ''}`}><button type="button" onClick={() => { moveTo(day); setView('day'); }} className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${localDateKey(day) === localDateKey(today) ? 'bg-[#095F46] text-white' : 'hover:bg-stone-100'}`}>{day.getDate()}</button><div className="space-y-1">{eventsForDay(day).map(event => <div key={event.id}>{eventCard(event, true)}</div>)}</div></div>)}</div> :
            <div className="grid" style={{ gridTemplateColumns: timedColumns }}>
              <div>{hours.map(hour => <div key={hour} style={{ height: hourHeight }} className="border-b border-[#e4e7eb] px-3 pt-3 text-right text-xs text-stone-500">{timeLabel(new Date(2000, 0, 1, hour)).replace(':00', '')}</div>)}</div>
              {days.map(day => {
                const dayEvents = eventsForDay(day).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
                const positions = eventLayout(dayEvents);
                return <div key={localDateKey(day)} className="relative border-l border-[#e4e7eb]" style={{ height: hours.length * hourHeight }}>
                  {hours.flatMap(hour => Array.from({ length: 60 / cellStepMinutes }, (_, index) => {
                    const cellDate = new Date(day); cellDate.setHours(hour, index * cellStepMinutes, 0, 0);
                    const disabled = isCellDisabled?.(cellDate) ?? false;
                    const reason = getCellDisabledReason?.(cellDate) || (disabled ? 'Locked' : undefined);
                    return <div key={`${hour}:${index}`} style={{ height: cellHeight }} className="border-b border-[#e4e7eb] p-0.5">
                      <button type="button" disabled={!onCellClick || disabled} onClick={() => onCellClick?.(cellDate)}
                        title={reason || (onCellClick ? 'Click to add an available session' : 'No session')}
                        aria-label={`${cellDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}, ${timeLabel(cellDate)}${reason ? `, ${reason}` : ''}`}
                        style={{ height: cellStepMinutes === 10 ? cellHeight - 4 : hourHeight * 2 / 3 - 4, borderRadius: 10, fontSize: 10, backgroundImage: disabled ? 'repeating-linear-gradient(135deg, transparent, transparent 5px, #d6e0db55 5px, #d6e0db55 6px)' : undefined }}
                        className={`flex w-full flex-col items-center justify-center gap-0.5 border text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095F46] ${disabled ? 'border-[#d6e0db] bg-[#f0f3f1] text-[#56635c]' : 'border-[#e1e9e5] bg-white text-[#56635c] enabled:hover:border-[#095F46] enabled:hover:bg-[#effaf5]'}`}>
                        {disabled ? <><LockKeyhole aria-hidden="true" className="h-3 w-3" /><span className="max-w-full truncate px-1">{reason}</span></> : onCellClick ? <span>{cellStepMinutes === 10 ? `${timeLabel(cellDate)} · ` : ''}+ Add slot</span> : null}
                      </button>
                    </div>;
                  }))}
                  {breakMinutes > 0 && (() => {
                    const ranges = new Map<string, { start: Date; end: Date }>();
                    for (const event of dayEvents) {
                      if (event.reserveBreak === false) continue;
                      const start = new Date(event.startsAt);
                      const end = new Date(event.endsAt || start.getTime() + 40 * 60000);
                      for (const range of [{ start: end, end: new Date(end.getTime() + breakMinutes * 60000) }]) {
                        ranges.set(`${range.start.getTime()}:${range.end.getTime()}`, range);
                      }
                    }
                    return [...ranges.entries()].map(([key, range]) => {
                      if (localDateKey(range.start) !== localDateKey(day) || !hours.includes(range.start.getHours())) return null;
                      const top = (hours.indexOf(range.start.getHours()) + range.start.getMinutes() / 60) * hourHeight;
                      const height = Math.min(breakMinutes / 60 * hourHeight, hours.length * hourHeight - top);
                      return <div key={key} role="note" aria-label={`Lecturer break, ${timeLabel(range.start)} to ${timeLabel(range.end)}`} title={`Lecturer break: ${timeLabel(range.start)} to ${timeLabel(range.end)}`} className="pointer-events-none absolute inset-x-1 z-[5] rounded-sm bg-stone-100" style={{ top, height }} />;
                    });
                  })()}
                  {dayEvents.map(event => {
                    const eventStart = new Date(event.startsAt); const eventEnd = new Date(event.endsAt || eventStart.getTime() + 40 * 60000);
                    const { column, count } = positions.get(event.id)!;
                    const top = (hours.indexOf(eventStart.getHours()) + eventStart.getMinutes() / 60) * hourHeight;
                    const height = Math.max(32, Math.min(hours.length * hourHeight - top, (eventEnd.getTime() - eventStart.getTime()) / 3600000 * hourHeight) - 4);
                    return <div key={event.id} className="absolute z-10 px-1" style={{ top: top + 4, height, left: `${column / count * 100}%`, width: `${100 / count}%` }}>{eventCard(event)}</div>;
                  })}
                  {localDateKey(day) === localDateKey(today) && hours.includes(today.getHours()) && <div aria-hidden="true" className="pointer-events-none absolute z-20 w-full border-t border-[#10BF8D]" style={{ top: (hours.indexOf(today.getHours()) + today.getMinutes() / 60) * hourHeight }}><span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#10BF8D]" /></div>}
                </div>;
              })}
            </div>}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 border-t border-[#e4e7eb] px-4 py-3 text-xs text-stone-600">
        {eventStates.length ? eventStates.map(state => <span key={state.label} className="flex items-center gap-2"><i aria-hidden="true" className={`h-3 w-3 rounded border ${colors[state.tone]}`} />{state.label}</span>) : <><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded bg-[#b9cac2]" />Scheduled / booked</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded bg-[#10BF8D]" />Selected / completed</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded bg-[#b4dfce]" />Available</span><span className="flex items-center gap-2"><LockKeyhole className="h-3 w-3" />Locked / unavailable</span></>}
        {breakMinutes > 0 && <span className="flex items-center gap-2"><i aria-hidden="true" className="h-3 w-3 rounded-sm bg-stone-100 border border-stone-300" />{breakMinutes}-minute break between sessions</span>}<span>{timezoneLabel}</span>
      </div>
    </section>
  );
}

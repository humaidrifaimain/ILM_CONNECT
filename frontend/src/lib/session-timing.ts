export const SESSION_MINUTES = 40;
export const LECTURER_BREAK_MINUTES = 10;

export function availabilitySessionStarts(day: Date, workingHours: number[], sessions: { startsAt: string; endsAt?: string }[]) {
  const hours = [...new Set(workingHours)].filter(hour => Number.isInteger(hour) && hour >= 0 && hour < 24).sort((a, b) => a - b);
  const duration = SESSION_MINUTES * 60_000;
  const gap = LECTURER_BREAK_MINUTES * 60_000;
  const reservations = sessions.map(session => {
    const start = Date.parse(session.startsAt);
    return { start: start - gap, end: (session.endsAt ? Date.parse(session.endsAt) : start + duration) + gap };
  }).sort((a, b) => a.start - b.start);
  const starts: Date[] = [];
  for (let index = 0; index < hours.length; index++) {
    const start = new Date(day); start.setHours(hours[index], 0, 0, 0);
    let lastHour = hours[index];
    while (hours[index + 1] === lastHour + 1) lastHour = hours[++index];
    const end = new Date(day); end.setHours(lastHour + 1, 0, 0, 0);
    let cursor = +start;
    const fill = (until: number) => {
      while (cursor + duration <= until) { starts.push(new Date(cursor)); cursor += duration + gap; }
    };
    for (const reservation of reservations) {
      if (reservation.end <= cursor || reservation.start >= +end) continue;
      fill(Math.min(reservation.start, +end));
      cursor = Math.max(cursor, reservation.end);
    }
    fill(+end);
  }
  return starts;
}

export function conflictsWithLecturerBreak(start: Date, end: Date, otherStart: Date, otherEnd: Date) {
  const buffer = LECTURER_BREAK_MINUTES * 60_000;
  return otherStart.getTime() < end.getTime() + buffer && otherEnd.getTime() > start.getTime() - buffer;
}

export function sessionFitsShift(start: Date, hours: number[]) {
  for (let minute = 0; minute < SESSION_MINUTES; minute++) {
    const instant = new Date(start.getTime() + minute * 60_000);
    if (!hours.includes(instant.getHours())) return false;
  }
  return true;
}

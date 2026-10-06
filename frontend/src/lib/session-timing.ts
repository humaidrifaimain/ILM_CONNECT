export const SESSION_MINUTES = 40;
export const LECTURER_BREAK_MINUTES = 10;

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

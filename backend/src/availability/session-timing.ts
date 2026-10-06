export const SESSION_MINUTES = 40;
export const LECTURER_BREAK_MINUTES = 10;

export function lecturerConflictWindow(startsAt: Date, endsAt: Date) {
  const buffer = LECTURER_BREAK_MINUTES * 60_000;
  return {
    startsAt: { lt: new Date(endsAt.getTime() + buffer) },
    endsAt: { gt: new Date(startsAt.getTime() - buffer) },
  };
}

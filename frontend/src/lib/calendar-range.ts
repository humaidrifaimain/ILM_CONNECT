export type CalendarView = 'day' | 'week' | 'month';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

export function calendarRange(selectedDate: Date, view: CalendarView, now: Date) {
  const minimumDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const date = new Date(Math.max(+selectedDate, +minimumDate));
  date.setHours(0, 0, 0, 0);
  const start = view === 'month' ? startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1)) : view === 'week' ? startOfWeek(date) : date;
  const days = Array.from({ length: view === 'month' ? 42 : view === 'week' ? 7 : 1 }, (_, index) => addDays(start, index)).filter(day => day >= minimumDate);
  const previousDate = view === 'month' ? new Date(date.getFullYear(), date.getMonth() - 1, 1) : addDays(date, view === 'week' ? -7 : -1);
  const previousEnd = view === 'month' ? new Date(previousDate.getFullYear(), previousDate.getMonth() + 1, 0) : view === 'week' ? addDays(startOfWeek(previousDate), 6) : previousDate;
  return { date, days, minimumDate, previousDate, canGoPrevious: previousEnd >= minimumDate };
}

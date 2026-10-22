export const STUDENT_TIME_WINDOWS = [
  { id: 'morning', label: 'Morning', time: '10:00 AM to 2:00 PM', hours: [10, 11, 12, 13] },
  { id: 'afternoon', label: 'Afternoon', time: '2:00 PM to 6:00 PM', hours: [14, 15, 16, 17] },
  { id: 'evening', label: 'Evening', time: '6:00 PM to 10:00 PM', hours: [18, 19, 20, 21] },
];

export function formatStudentHours(hours: number[] = []) {
  return STUDENT_TIME_WINDOWS.filter(window => window.hours.every(hour => hours.includes(hour)))
    .map(window => window.time).join(', ') || 'Availability not provided';
}

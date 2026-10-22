export type SessionTone = 'blue' | 'purple' | 'green' | 'amber' | 'red';
const statuses: Record<string, { label: string; tone: SessionTone; color: string }> = {
  SCHEDULED: { label: 'Scheduled', tone: 'blue', color: 'bg-[#e8f0ed] text-[#095F46]' },
  RESCHEDULED: { label: 'Rescheduled', tone: 'amber', color: 'bg-amber-100 text-amber-900' },
  IN_PROGRESS: { label: 'In progress', tone: 'purple', color: 'bg-[#d4f4e7] text-[#095F46]' },
  COMPLETED: { label: 'Completed', tone: 'green', color: 'bg-emerald-50 text-emerald-900' },
  CANCELED: { label: 'Cancelled', tone: 'red', color: 'bg-rose-100 text-rose-900' },
  NO_SHOW_STUDENT: { label: 'Student absent', tone: 'amber', color: 'bg-amber-100 text-amber-900' },
  NO_SHOW_LECTURER: { label: 'Lecturer absent', tone: 'red', color: 'bg-rose-100 text-rose-900' },
};

export function getSessionStatus(status: string, rescheduledAt?: string | null) {
  const key = status.toUpperCase() === 'SCHEDULED' && rescheduledAt ? 'RESCHEDULED' : status.toUpperCase();
  return statuses[key] || { label: 'Unknown status', tone: 'blue' as SessionTone, color: 'bg-stone-100 text-stone-800' };
}

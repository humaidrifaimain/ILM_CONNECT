export function studentAttendanceLabel(session: {
  status: string; startsAt: string; meetingStartedAt?: string | null; studentJoinedAt?: string | null;
}) {
  if (session.status.toUpperCase() === 'NO_SHOW_STUDENT') return 'Marked absent';
  if (session.studentJoinedAt) {
    const time = new Date(session.studentJoinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Joined at ${time}`;
  }
  if (!session.meetingStartedAt) return ['COMPLETED', 'CANCELED', 'NO_SHOW_LECTURER'].includes(session.status.toUpperCase()) ? 'No join recorded' : 'Meeting not started';
  const waited = Date.now() - Math.max(Date.parse(session.startsAt), Date.parse(session.meetingStartedAt));
  return waited >= 15 * 60_000 ? 'No join recorded (15+ min)' : 'Waiting for student';
}

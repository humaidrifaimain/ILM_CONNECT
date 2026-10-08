'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { formatStudentHours } from '@/lib/student-availability';

interface Lecturer {
  userId: string;
  fullName: string;
  hourlyAvailabilityJson: number[];
}

export function RequestLecturerAssignment({ request, onBusyChange }: {
  request: {
    id: string;
    type: string;
    status: string;
    user: { studentProfile?: {
      preferredHours?: number[];
      assignedLecturer?: { userId: string; fullName: string } | null;
    } | null };
  };
  onBusyChange: (busy: boolean) => void;
}) {
  const client = useQueryClient();
  const [lecturerId, setLecturerId] = useState('');
  const profile = request.user.studentProfile;
  const complete = request.status === 'RESOLVED' || (request.type === 'STUDENT_REGISTRATION' && !!profile?.assignedLecturer);
  const { data: lecturers = [], isPending, isError, refetch } = useQuery<Lecturer[]>({
    queryKey: ['profileLecturers'], queryFn: () => apiFetch('/profile/lecturers'),
    enabled: !complete,
  });
  const matches = (lecturer: Lecturer) => !profile?.preferredHours?.length || profile.preferredHours.some(hour => lecturer.hourlyAvailabilityJson.includes(hour));
  const save = useMutation({
    mutationFn: () => apiFetch(`/admin/requests/${request.id}/assign-lecturer`, {
      method: 'POST', body: JSON.stringify({ lecturerId }),
    }),
    onMutate: () => onBusyChange(true),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['adminSupportTickets'] }),
        client.invalidateQueries({ queryKey: ['adminUsers'] }),
        client.invalidateQueries({ queryKey: ['adminStats'] }),
      ]);
    },
    onSettled: () => onBusyChange(false),
  });

  return <section className="border-t border-[hsl(var(--border))] pt-4">
    <h3 className="text-sm font-semibold">Lecturer assignment</h3>
    <p className="mt-2 text-sm">Available: {formatStudentHours(profile?.preferredHours)}</p>
    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Sri Lanka time (Asia/Colombo)</p>
    {profile?.assignedLecturer && <p className="mt-2 text-sm">Assigned lecturer: <strong>{profile.assignedLecturer.fullName}</strong></p>}
    {complete ? <p role="status" className="mt-3 text-sm">Lecturer assignment is complete.</p>
      : isPending ? <p role="status" className="mt-3 text-sm">Loading lecturers...</p>
      : isError ? <div role="alert" className="mt-3 text-sm">Unable to load lecturers. <button type="button" onClick={() => refetch()} className="min-h-11 px-2 underline">Retry</button></div>
      : !lecturers.some(matches) ? <p className="mt-3 text-sm">No active lecturer has a matching time window. Update lecturer shifts in Users or ask the student about other available times.</p>
      : <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
        <label className="block text-sm font-medium" htmlFor={`request-lecturer-${request.id}`}>Choose a lecturer</label>
        <select id={`request-lecturer-${request.id}`} value={lecturerId} required disabled={save.isPending}
          onChange={event => setLecturerId(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46]">
          <option value="">Select a matching lecturer</option>
          {lecturers.map(lecturer => <option key={lecturer.userId} value={lecturer.userId} disabled={!matches(lecturer)}>
            {lecturer.fullName} · {formatStudentHours(lecturer.hourlyAvailabilityJson)}{matches(lecturer) ? '' : ' (no matching window)'}
          </option>)}
        </select>
        {save.error && <p role="alert" className="text-sm text-red-700">{save.error.message}</p>}
        <button disabled={save.isPending || !lecturerId || !lecturers.some(lecturer => lecturer.userId === lecturerId && matches(lecturer))}
          className="min-h-11 rounded-lg bg-[#095F46] px-4 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46]">
          {save.isPending ? 'Assigning...' : 'Assign lecturer and resolve request'}
        </button>
      </form>}
  </section>;
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { formatStudentHours } from '@/lib/student-availability';
import { AvailabilityDialog } from './availability-dialog';

export function AvailabilitySettings({ prompt = false }: { prompt?: boolean }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { data: profile, isPending, isError, refetch } = useQuery<{ preferredHours: number[] }>({
    queryKey: ['studentProfile'], queryFn: () => apiFetch('/profile/student'), enabled: user?.role === 'STUDENT',
  });
  const save = useMutation({
    mutationFn: (preferredHours: number[]) => apiFetch('/profile/student', { method: 'PUT', body: JSON.stringify({ preferredHours }) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['studentProfile'] });
      setEditing(false);
      setDismissed(true);
    },
  });
  if (user?.role !== 'STUDENT') return null;
  if (isPending) return prompt ? null : <p className="text-sm">Loading availability...</p>;
  if (isError || !profile) return prompt ? null : <div role="alert"><p>Unable to load availability.</p><button onClick={() => refetch()} className="min-h-11 underline">Retry</button></div>;
  const open = editing || (prompt && !dismissed && !profile.preferredHours?.length);
  return <>
    {!prompt && <section className="rounded-xl border border-[#d6e0db] bg-white p-5">
      <h2 className="font-semibold">Lesson availability</h2>
      <p className="mt-2 text-sm text-[#56635c]">{formatStudentHours(profile.preferredHours)}</p>
      <p className="mt-1 text-xs text-[#56635c]">Sri Lanka time (Asia/Colombo)</p>
      <button type="button" onClick={() => { save.reset(); setEditing(true); }} className="mt-3 min-h-11 text-sm font-semibold text-[#095F46] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46]">Change available times</button>
    </section>}
    {open && <AvailabilityDialog open initialHours={profile.preferredHours || []} busy={save.isPending} error={save.error?.message}
      onClose={() => { setEditing(false); setDismissed(true); }} onSave={hours => save.mutate(hours)} />}
  </>;
}

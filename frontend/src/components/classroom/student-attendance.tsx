'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useFinishAbsentMeeting } from '@/components/lecturer/required-lesson-feedback';

type Attendance = { serverNow: string; status: string; studentJoinedAt: string | null; studentPresent: boolean | null; detectionAvailable: boolean; promptAt: string | null; shouldPrompt: boolean };

export function StudentAttendance({ sessionId, userRole, active, onAbsent }: {
  sessionId: string; userRole: 'student' | 'lecturer'; active: boolean; onAbsent: () => void | Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const client = useQueryClient();
  const finishAbsentMeeting = useFinishAbsentMeeting();
  const [action, setAction] = useState<'wait' | 'absent' | null>(null);
  const [error, setError] = useState('');
  const { data, isError, refetch } = useQuery<Attendance>({
    queryKey: ['studentAttendance', sessionId, userRole],
    queryFn: () => apiFetch(`/livekit/attendance/${sessionId}${userRole === 'student' ? '/heartbeat' : ''}`, userRole === 'student' ? { method: 'POST' } : {}),
    enabled: active, refetchInterval: 5000, staleTime: 0, retry: 1,
  });
  const prompt = userRole === 'lecturer' && active && !!data?.shouldPrompt && !isError;
  useEffect(() => {
    if (prompt && !dialog.current?.open) dialog.current?.showModal();
    if (!prompt) { dialog.current?.close(); setError(''); }
  }, [prompt]);
  const decide = async (choice: 'wait' | 'absent') => {
    if (action) return;
    setAction(choice); setError('');
    try {
      await apiFetch(`/livekit/attendance/${sessionId}/${choice}`, { method: 'POST' });
      if (choice === 'absent') {
        client.setQueryData<Attendance>(['studentAttendance', sessionId, userRole], old => old ? { ...old, status: 'NO_SHOW_STUDENT', shouldPrompt: false } : old);
        await client.invalidateQueries({ queryKey: ['requiredLessonFeedback'] });
        await client.invalidateQueries({ queryKey: ['lecturerBookings'] });
        dialog.current?.close();
        finishAbsentMeeting(sessionId);
        await onAbsent();
      } else await refetch();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save the attendance decision. Please try again.');
      void refetch();
    } finally { setAction(null); }
  };
  if (userRole === 'student') return null;
  const unavailable = isError || data?.detectionAvailable === false;
  const label = unavailable ? 'Student attendance unavailable' : !data ? 'Checking student attendance…'
    : data.studentPresent ? 'Student joined' : data.studentJoinedAt ? 'Student joined, now disconnected' : 'Waiting for student to join';
  return <>
    <span role="status" aria-live="polite" className="font-sans text-xs text-white">{label}</span>
    {unavailable && <button type="button" onClick={() => void refetch()} className="min-h-11 px-2 text-xs text-white underline focus-visible:outline-2 focus-visible:outline-offset-2">Retry attendance</button>}
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!action) void decide('wait'); }}
      aria-labelledby={`student-absence-title-${sessionId}`} aria-describedby={`student-absence-description-${sessionId}`}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-[#56635c] bg-white p-5 font-sans text-[#202823] shadow-xl backdrop:bg-black/60 sm:p-6">
      <h2 id={`student-absence-title-${sessionId}`} className="text-xl font-semibold">Student has not joined</h2>
      <p id={`student-absence-description-${sessionId}`} className="mt-3 text-sm leading-6 text-[#56635c]">The student has not joined the classroom after 15 minutes. You can wait another five minutes or mark the student absent and close this meeting.</p>
      {error && <p role="alert" className="mt-4 text-sm text-[#b42318]">{error}</p>}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="button" autoFocus disabled={!!action} onClick={() => void decide('wait')}
          className="min-h-11 flex-1 rounded-lg border border-[#56635c] px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46] disabled:opacity-60">{action === 'wait' ? 'Saving wait…' : 'Wait for a while'}</button>
        <button type="button" disabled={!!action} onClick={() => void decide('absent')}
          className="min-h-11 flex-1 rounded-lg bg-[#095F46] px-4 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46] disabled:opacity-60">{action === 'absent' ? 'Closing meeting…' : 'Mark class absent'}</button>
      </div>
    </dialog>
  </>;
}

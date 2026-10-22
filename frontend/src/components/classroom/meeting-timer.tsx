'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { StudentAttendance } from './student-attendance';

type MeetingClock = { serverNow: string; meetingStartedAt: string | null; warningAt: string | null; meetingEndsAt: string | null; status: string; expired: boolean };
const formatTime = (milliseconds: number) => {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
};

export function MeetingTimer({ sessionId, userRole, onExpire, active = true }: { sessionId: string; userRole: 'student' | 'lecturer'; onExpire: () => void | Promise<void>; active?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const callback = useRef(onExpire);
  callback.current = onExpire;
  const exited = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(0);
  const { data, isError, refetch } = useQuery<MeetingClock>({
    queryKey: ['meetingClock', sessionId, userRole],
    queryFn: async () => {
      if (userRole === 'lecturer') {
        try { return await apiFetch(`/livekit/start/${sessionId}`, { method: 'POST' }); }
        catch { return apiFetch(`/livekit/clock/${sessionId}`); }
      }
      return apiFetch(`/livekit/clock/${sessionId}`);
    },
    refetchInterval: 5000, staleTime: 0, enabled: active,
  });
  useEffect(() => {
    if (!data) return;
    const anchor = performance.now();
    const serverNow = Date.parse(data.serverNow);
    const tick = () => setNow(serverNow + performance.now() - anchor);
    tick();
    const timer = window.setInterval(tick, 250);
    const resume = () => { tick(); void refetch(); };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => { clearInterval(timer); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); };
  }, [data, refetch]);
  const started = data?.meetingStartedAt ? Date.parse(data.meetingStartedAt) : null;
  const end = data?.meetingEndsAt ? Date.parse(data.meetingEndsAt) : null;
  const warning = data?.warningAt ? Date.parse(data.warningAt) : null;
  const expired = !!data && (data.expired || ['COMPLETED', 'CANCELED', 'NO_SHOW_STUDENT', 'NO_SHOW_LECTURER'].includes(data.status) || (end !== null && now >= end));
  const showWarning = warning !== null && now >= warning && !expired && !dismissed;
  useEffect(() => {
    if (showWarning && !dialog.current?.open) dialog.current?.showModal();
    if (!showWarning) dialog.current?.close();
  }, [showWarning]);
  useEffect(() => {
    if (!expired || exited.current) return;
    exited.current = true;
    dialog.current?.close();
    toast.info('Session ended', data?.status === 'CANCELED' ? 'This session was cancelled.' : 'The lesson has ended.');
    void callback.current();
  }, [expired, data?.status]);
  return <>
    <StudentAttendance sessionId={sessionId} userRole={userRole} active={active && !expired} onAbsent={onExpire} />
    <span role="timer" aria-label="Lesson elapsed time" aria-live="off" className="whitespace-nowrap text-xs tabular-nums text-white/90">
      {started !== null ? formatTime(now - started) : isError ? 'Timer unavailable' : userRole === 'lecturer' ? 'Starting lesson…' : 'Waiting for lecturer'}
    </span>
    {isError && !data && <button type="button" onClick={() => void refetch()} className="text-xs text-white underline">Retry</button>}
    <dialog ref={dialog} aria-labelledby={`meeting-warning-${sessionId}`} onCancel={() => setDismissed(true)} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-[#d6e0db] bg-white p-6 text-[#202823] shadow-xl backdrop:bg-black/60">
      <h2 id={`meeting-warning-${sessionId}`} className="text-xl font-semibold">Five-minute extension</h2>
      <p className="mt-3 text-sm leading-6 text-[#56635c]">Your 40-minute lesson is over. You have up to five extra minutes to finish. This meeting ends automatically at 45 minutes.</p>
      <p role="timer" aria-label="Time remaining" aria-live="off" className="mt-4 text-lg font-semibold tabular-nums text-[#095F46]">{end !== null ? formatTime(end - now) : '00:05:00'} remaining</p>
      <button type="button" onClick={() => { setDismissed(true); dialog.current?.close(); }} className="mt-5 min-h-11 w-full rounded-lg bg-[#095F46] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46]">Continue lesson</button>
    </dialog>
  </>;
}

'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

type PendingSession = { id: string; startsAt: string; status: string; student: { fullName: string }; notes?: { sharedNotes: string } | null };
const FeedbackContext = createContext<{ request: (session: PendingSession) => void; register: (session: PendingSession | null) => void; finishAbsent: (sessionId: string) => void }>({ request: () => {}, register: () => {}, finishAbsent: () => {} });
export const useRequiredLessonFeedback = () => useContext(FeedbackContext).request;
export const useRegisterLessonFeedbackSession = () => useContext(FeedbackContext).register;
export const useFinishAbsentMeeting = () => useContext(FeedbackContext).finishAbsent;

export function RequiredLessonFeedback({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const client = useQueryClient();
  const dialog = useRef<HTMLDialogElement>(null);
  const finishedAbsentSessions = useRef(new Set<string>());
  const [requested, setRequested] = useState<PendingSession | null>(null);
  const [activeRoom, setActiveRoom] = useState<PendingSession | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const roomId = pathname.match(/^\/lecturer\/sessions\/([^/]+)\/room$/)?.[1];
  const { data, isPending, isError, refetch } = useQuery<PendingSession[]>({
    queryKey: ['requiredLessonFeedback'], queryFn: () => apiFetch('/bookings/lecturer/pending-notes'),
    refetchInterval: 5000, staleTime: 0,
  });
  const session = requested || data?.find(item => item.status === 'COMPLETED' || item.id !== roomId);
  const blocked = !!session || isPending || isError;
  const currentRoomSession = data?.find(item => item.id === roomId) || (activeRoom?.id === roomId ? activeRoom : undefined);
  const request = useCallback((item: PendingSession) => { if (!finishedAbsentSessions.current.has(item.id)) setRequested(item); }, []);
  const register = useCallback((item: PendingSession | null) => {
    if (item) finishedAbsentSessions.current.delete(item.id);
    setActiveRoom(item);
  }, []);
  const finishAbsent = useCallback((sessionId: string) => {
    finishedAbsentSessions.current.add(sessionId);
    setRequested(current => current?.id === sessionId ? null : current);
    setActiveRoom(current => current?.id === sessionId ? null : current);
    router.replace('/lecturer/sessions');
  }, [router]);

  useEffect(() => {
    if (!session) return;
    const draftKey = `lesson-feedback:${session.id}`;
    setNote(localStorage.getItem(draftKey) || session.notes?.sharedNotes || '');
    setError('');
  }, [session]);

  useEffect(() => {
    if (blocked && !dialog.current?.open) dialog.current?.showModal();
    if (!blocked) dialog.current?.close();
  }, [blocked]);

  useEffect(() => {
    const current = currentRoomSession;
    if (!blocked && !current) return;
    const onBack = (event: PopStateEvent) => {
      event.stopImmediatePropagation();
      window.history.pushState(window.history.state, '', pathname);
      if (current) setRequested(current);
    };
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('a[href]')) return;
      event.preventDefault();
      event.stopPropagation();
      if (current) setRequested(current);
    };
    const onUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.history.pushState(window.history.state, '', pathname);
    window.addEventListener('popstate', onBack, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('popstate', onBack, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [blocked, currentRoomSession, pathname]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || saving || note.trim().length < 30) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/bookings/${session.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED', notes: note.trim() }) });
      localStorage.removeItem(`lesson-feedback:${session.id}`);
      await refetch();
      setRequested(null);
      void client.invalidateQueries({ queryKey: ['lecturerBookings'] });
      if (roomId) router.replace('/lecturer/sessions');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save feedback. Please try again.');
    } finally { setSaving(false); }
  };

  return <FeedbackContext.Provider value={{ request, register, finishAbsent }}>
    <div inert={blocked}>{children}</div>
    <dialog ref={dialog} onCancel={event => event.preventDefault()} onClose={() => { if (blocked) dialog.current?.showModal(); }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement | HTMLTextAreaElement>('button:not(:disabled), textarea:not(:disabled)'));
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      aria-labelledby="required-feedback-title" aria-describedby="required-feedback-description"
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border border-[#56635c] bg-white p-5 text-[#202823] shadow-xl backdrop:bg-black/60 sm:p-6">
      <h2 id="required-feedback-title" className="text-xl font-semibold">Lesson feedback required</h2>
      <p id="required-feedback-description" className="mt-3 text-sm leading-6 text-[#56635c]">Write a note about what the student learned, their progress, and what to practise next. Save your feedback before leaving.</p>
      {session ? <form onSubmit={submit} className="mt-5 space-y-4">
        <p className="text-sm"><strong>{session.student.fullName}</strong> · {new Date(session.startsAt).toLocaleDateString()}</p>
        <div>
          <label htmlFor="required-lesson-note" className="block text-sm font-semibold">Feedback note</label>
          <p id="lesson-note-help" className="mt-1 text-sm text-[#56635c]">Shared with the student account contacts and administrators. At least 30 characters.</p>
          <textarea id="required-lesson-note" autoFocus required maxLength={10000} rows={6} value={note} disabled={saving}
            aria-describedby="lesson-note-help lesson-note-count" aria-invalid={!!error}
            onChange={event => { setNote(event.target.value); localStorage.setItem(`lesson-feedback:${session.id}`, event.target.value); }}
            className="mt-3 w-full resize-y rounded-lg border border-[#56635c] bg-white p-3 text-base leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46] disabled:opacity-70" />
          <p id="lesson-note-count" className="mt-2 text-sm text-[#56635c]">{note.trim().length} / 30 characters minimum</p>
        </div>
        {error && <p role="alert" className="text-sm text-[#b42318]">{error}</p>}
        <button type="submit" disabled={saving || note.trim().length < 30}
          className="min-h-11 w-full rounded-lg bg-[#095F46] px-4 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46] disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? 'Saving feedback…' : 'Save feedback and finish'}
        </button>
      </form> : isError ? <div className="mt-5"><p role="alert" className="text-sm text-[#b42318]">Unable to check required feedback.</p><button type="button" onClick={() => void refetch()} className="mt-4 min-h-11 rounded-lg bg-[#095F46] px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46]">Retry</button></div> : <p role="status" className="mt-5 text-sm">Checking lesson feedback…</p>}
    </dialog>
  </FeedbackContext.Provider>;
}

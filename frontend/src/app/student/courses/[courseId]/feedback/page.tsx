'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, MessageSquareText, Send, Sparkles, Star } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { toast } from '@/components/ui/toast';

interface SessionRating {
  score: number;
  comment: string;
  createdAt: string;
}

interface StudentSession {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  lecturer?: { fullName?: string };
  lesson?: { title?: string; module?: { learningPath?: { title?: string } } };
  notes?: { sharedNotes?: string };
  rating?: SessionRating;
}

const ratingLabels = ['', 'Needs improvement', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function SessionFeedbackPage({ searchParams }: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ sessionId?: string | string[] }>;
}) {
  const queryParams = use(searchParams);
  const requestedSessionId = Array.isArray(queryParams.sessionId) ? queryParams.sessionId[0] : queryParams.sessionId;
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState(requestedSessionId || '');
  const [score, setScore] = useState(0);
  const [hoveredScore, setHoveredScore] = useState(0);
  const [comment, setComment] = useState('');

  const { data: bookings = [], isLoading, isError } = useQuery<StudentSession[]>({
    queryKey: ['studentBookings'],
    queryFn: () => apiFetch('/bookings/student'),
    staleTime: 0,
  });

  const sessions = useMemo(
    () => bookings
      .filter((session) => session.status !== 'CANCELED' && new Date(session.startsAt).getTime() <= Date.now())
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()),
    [bookings],
  );

  useEffect(() => {
    if (!sessions.length) return;
    const requested = requestedSessionId && sessions.find((session) => session.id === requestedSessionId);
    const firstUnrated = sessions.find((session) => !session.rating && session.status !== 'CANCELED');
    const nextSession = requested || firstUnrated || sessions[0];
    setSelectedSessionId((current) => current || nextSession.id);
  }, [requestedSessionId, sessions]);

  const selectedSession = sessions.find((session) => session.id === selectedSessionId);

  useEffect(() => {
    setScore(selectedSession?.rating?.score || 0);
    setComment(selectedSession?.rating?.comment || '');
  }, [selectedSessionId, selectedSession?.rating?.comment, selectedSession?.rating?.score]);

  const feedbackMutation = useMutation({
    mutationFn: () => apiFetch('/feedbacks', {
      method: 'POST',
      body: JSON.stringify({ sessionId: selectedSessionId, score, comment: comment.trim() }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studentBookings'] });
      toast.success('Feedback saved', 'Thank you. Your feedback helps improve future sessions.');
    },
    onError: (error: Error) => toast.error('Could not save feedback', error.message),
  });

  const submitFeedback = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSessionId || score === 0) {
      toast.info('Choose a rating', 'Select between one and five stars before submitting.');
      return;
    }
    feedbackMutation.mutate();
  };

  if (isLoading) return <LoadingScreen message="Loading Session Feedback..." subtitle="Preparing your recent sessions" />;

  if (isError) {
    return <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">We could not load your sessions. Please refresh and try again.</div>;
  }

  if (!sessions.length) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <MessageSquareText className="mx-auto mb-4 h-10 w-10 text-[hsl(var(--muted-foreground))]" />
        <h1 className="text-xl font-semibold">No sessions to review yet</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Your feedback form will appear here after your first session.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <header className="relative overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[hsl(var(--primary)/0.1)] blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"><Sparkles className="h-6 w-6" /></span>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--primary))]">Session complete</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">How was your lesson?</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Share a quick, private review. You can update it later if you need to.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <form onSubmit={submitFeedback} className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-col gap-2">
            <label htmlFor="feedback-session" className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Session</label>
            <select id="feedback-session" value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)} className="h-12 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]">
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{new Date(session.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} — {session.lecturer?.fullName || 'Assigned lecturer'}{session.rating ? ' (reviewed)' : ''}</option>
              ))}
            </select>
          </div>

          {selectedSession && (
            <div className="mb-7 flex flex-wrap gap-x-5 gap-y-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4 text-sm">
              <span className="font-semibold">{selectedSession.lesson?.title || selectedSession.lesson?.module?.learningPath?.title || 'Live learning session'}</span>
              <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]"><CalendarDays className="h-4 w-4" /> {new Date(selectedSession.startsAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
          )}

          <fieldset>
            <legend className="text-base font-semibold">Rate your experience</legend>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">How helpful and clear was this session?</p>
            <div className="mt-4 flex flex-wrap items-center gap-1 sm:gap-2" onMouseLeave={() => setHoveredScore(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" aria-label={`${value} star${value > 1 ? 's' : ''}: ${ratingLabels[value]}`} aria-pressed={score === value} onMouseEnter={() => setHoveredScore(value)} onFocus={() => setHoveredScore(value)} onBlur={() => setHoveredScore(0)} onClick={() => setScore(value)} className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 motion-reduce:transform-none">
                  <Star className={`h-8 w-8 ${value <= (hoveredScore || score) ? 'fill-amber-400 text-amber-400' : 'text-[hsl(var(--border))]'}`} />
                </button>
              ))}
              <span className="ml-2 min-w-28 text-sm font-semibold text-[hsl(var(--primary))]">{ratingLabels[hoveredScore || score]}</span>
            </div>
          </fieldset>

          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="feedback-comment" className="text-base font-semibold">Tell us more <span className="font-normal text-[hsl(var(--muted-foreground))]">(optional)</span></label>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{comment.length}/2000</span>
            </div>
            <textarea id="feedback-comment" value={comment} maxLength={2000} rows={5} onChange={(event) => setComment(event.target.value)} placeholder="What worked well? Is there anything we could improve?" className="w-full resize-y rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 text-sm leading-6 outline-none placeholder:text-[hsl(var(--muted-foreground))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]" />
          </div>

          <button type="submit" disabled={!selectedSessionId || score === 0 || feedbackMutation.isPending} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.18)] transition-colors hover:bg-[hsl(var(--primary)/0.9)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2">
            {selectedSession?.rating ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {feedbackMutation.isPending ? 'Saving...' : selectedSession?.rating ? 'Update feedback' : 'Submit feedback'}
          </button>
        </form>

        <aside className="space-y-4">
          <div><h2 className="text-lg font-semibold">Recent sessions</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Your reviews and lecturer notes</p></div>
          <div className="space-y-3">
            {sessions.slice(0, 6).map((session) => (
              <button type="button" key={session.id} onClick={() => setSelectedSessionId(session.id)} className={`w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] ${session.id === selectedSessionId ? 'border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--primary)/0.06)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.35)]'}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold">{session.lecturer?.fullName || 'Assigned lecturer'}</p>
                  {session.rating ? <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-amber-600"><Star className="h-3.5 w-3.5 fill-current" /> {session.rating.score}</span> : <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Review</span>}
                </div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{new Date(session.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                {session.notes?.sharedNotes && <p className="mt-3 line-clamp-3 border-t border-[hsl(var(--border))] pt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><MessageSquareText className="mr-1 inline h-3.5 w-3.5 text-[hsl(var(--primary))]" /> {session.notes.sharedNotes}</p>}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

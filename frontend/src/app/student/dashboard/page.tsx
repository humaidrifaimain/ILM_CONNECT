'use client';

import Link from 'next/link';
import { ScheduleCalendar } from '@/components/classroom/schedule-calendar';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, BookOpen, Star, CreditCard, TrendingUp, ChevronRight, RefreshCw, AlertTriangle, Award, UserRound } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/components/ui/toast';
import { DashboardLoadingOverlay } from '@/components/student/dashboard-loading-overlay';

interface Lecturer {
  hourlyAvailabilityJson?: number[];
  fullName: string;
  bio?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
}

interface Booking {
  id: string;
  startsAt: string;
  endsAt: string;
  status?: string | null;
  lecturer?: Lecturer | null;
}

interface StudentProfile {
  fullName: string;
  assignedLecturer?: Lecturer | null;
}

interface StudentSubscription {
  tier?: string | null;
  currentPeriodEnd: string;
  lkrAmount: number;
}

interface StudentProgress {
  progressPercentage?: number;
  currentLearningPath?: {
    title?: string | null;
  } | null;
  currentModule?: {
    title?: string | null;
  } | null;
  currentLesson?: {
    title?: string | null;
  } | null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

async function optionalDashboardData<T>(endpoint: string): Promise<T | null> {
  try { return await apiFetch(endpoint); } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) return null;
    throw error;
  }
}

export default function StudentDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [changeRequested, setChangeRequested] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);

  const { data: profile, isLoading: isProfileLoading, isError: profileError } = useQuery<StudentProfile | null>({
    queryKey: ['studentProfile'],
    queryFn: () => optionalDashboardData<StudentProfile>('/profile/student'),
    enabled: !!user,
    retry: 1,
  });

  const { data: bookings = [], isLoading: bookingsLoading, isError: bookingsError } = useQuery<Booking[]>({
    queryKey: ['studentBookings'],
    queryFn: () => apiFetch('/bookings/student'),
    enabled: !!user,
    retry: 1,
  });

  const { data: subscription, isLoading: subscriptionLoading, isError: subscriptionError } = useQuery<StudentSubscription | null>({
    queryKey: ['studentSubscription'],
    queryFn: async () => {
      try { return await apiFetch('/subscriptions/me'); } catch (error) {
        if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) return null;
        throw error;
      }
    },
    enabled: !!user,
    retry: 1,
  });

  const { data: progress, isLoading: progressLoading, isError: progressError } = useQuery<StudentProgress | null>({
    queryKey: ['studentProgress'],
    queryFn: () => optionalDashboardData<StudentProgress>('/progress/student'),
    enabled: !!user,
    retry: 1,
  });

  const closeModal = useCallback(() => {
    setShowChangeModal(false);
    setShowBookModal(false);
  }, []);

  const activateTrialMutation = useMutation({
    mutationFn: () => apiFetch('/subscriptions/trial', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentSubscription'] });
      toast.success('Trial Activated', 'You can now book your first session for free!');
    },
    onError: (err: unknown) => {
      toast.error('Activation Failed', getErrorMessage(err, 'Could not activate trial.'));
    },
  });

  useEffect(() => {
    if (!showChangeModal && !showBookModal) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [showChangeModal, showBookModal, closeModal]);

  const handleSubmitChangeRequest = async () => {
    setIsSubmittingChange(true);
    try {
      await apiFetch('/support/request', {
        method: 'POST',
        body: JSON.stringify({ type: 'LECTURER_CHANGE', reason: changeReason }),
      });
      setChangeRequested(true);
      toast.success('Request Submitted', 'Our academic coordinator team has received your lecturer change request.');
      closeModal();
    } catch (err: unknown) {
      console.error('Failed to submit request:', err);
      toast.error('Submission Failed', getErrorMessage(err, 'Failed to submit request. Please try again later.'));
    } finally {
      setIsSubmittingChange(false);
    }
  };

  const now = new Date();
  const dashboardBookings = bookings;
  const dashboardProgress = progress;
  const dashboardSubscription = subscription;

  const upcomingSessions = dashboardBookings.filter((b) => {
    const status = (b.status || '').toUpperCase();
    const isCanceled = status === 'CANCELED' || status === 'NO_SHOW_STUDENT';
    return !isCanceled && new Date(b.startsAt) > new Date();
  }).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const assignedLecturer = profile?.assignedLecturer || null;

  const sessionsThisMonth = dashboardBookings.filter((b) => {
    const d = new Date(b.startsAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const completedSessions = dashboardBookings.filter((b) => b.status === 'COMPLETED');
  const hoursLearned = Math.round(completedSessions.reduce((total, session) => total + Math.max(0, new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 3600000, 0) * 10) / 10;
  const progressPercent = Math.min(Math.max(dashboardProgress?.progressPercentage ?? 0, 0), 100);
  const activeSubscriptionLabel = dashboardSubscription ? (new Date(dashboardSubscription.currentPeriodEnd) > now ? 'Active' : 'Expired') : 'None';
  const visibleSessions = upcomingSessions.slice(0, 4);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (now.getDay() + 6) % 7);
  weekStart.setHours(0, 0, 0, 0);
  const learningSeries = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const hours = completedSessions.filter(session => new Date(session.startsAt) >= date && new Date(session.startsAt) < nextDay)
      .reduce((total, session) => total + Math.max(0, new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 3600000, 0);
    return { day: date.toLocaleDateString(undefined, { weekday: 'short' }), hours };
  });
  const weeklyHours = learningSeries.reduce((total, day) => total + day.hours, 0);
  const chartMax = Math.max(1, ...learningSeries.map(day => day.hours));

  if (isAuthLoading || (user && (isProfileLoading || bookingsLoading || subscriptionLoading || progressLoading))) {
    return <DashboardLoadingOverlay />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-[#d6e0db] bg-white p-6 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-[#202823]">Sign in to view your dashboard</h2>
          <p className="mt-2 text-sm text-[#56635c]">Your learning dashboard is available after you sign in.</p>
          <Link href="/auth/signin" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#095F46] px-5 text-sm font-bold text-white transition-colors hover:bg-[#074c38]">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in">
        <div className="mx-auto w-full space-y-5">
          {(profileError || bookingsError || subscriptionError || progressError) && <p role="alert" className="rounded-xl border border-[#d6e0db] bg-white p-3 text-sm text-[#56635c]">Some information could not be loaded. Refresh to retry; your available account information is shown below.</p>}
          <section className="flex justify-end px-1 sm:hidden">
            <button onClick={() => setShowBookModal(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#095F46] px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#074c38] hover:shadow-md">
              <Calendar className="h-4 w-4" /> Book Session
            </button>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Sessions This Month', value: bookingsError ? '—' : String(sessionsThisMonth).padStart(2, '0'), detail: bookingsError ? 'Sessions unavailable' : `${upcomingSessions.length} upcoming`, icon: Clock, fill: Math.min(sessionsThisMonth * 12, 100) },
              { label: 'Hours Learned', value: bookingsError ? '—' : `${hoursLearned}h`, detail: bookingsError ? 'Sessions unavailable' : `${completedSessions.length} completed`, icon: BookOpen, fill: Math.min(hoursLearned * 12, 100) },
              { label: 'Path Progress', value: progressError || !dashboardProgress ? '—' : `${progressPercent}%`, detail: progressError ? 'Progress unavailable' : dashboardProgress?.currentModule?.title || 'No learning path assigned', icon: TrendingUp, fill: progressPercent },
              { label: 'Subscription', value: subscriptionError ? '—' : activeSubscriptionLabel, detail: subscriptionError ? 'Subscription unavailable' : dashboardSubscription ? `${dashboardSubscription.tier || 'Subscription'}` : 'No active subscription', icon: Award, fill: activeSubscriptionLabel === 'Active' ? 100 : 0 },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <article key={stat.label} className="rounded-xl border border-[#d6e0db] bg-white p-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-[#202823]">{stat.label}</h2>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-2xl font-bold leading-none text-[#0b3027]">{stat.value}</span>
                        <span className="pb-1 text-xs font-semibold text-[#56635c]">{stat.detail}</span>
                      </div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c5d4cd] bg-[#e8f0ed] text-[#095F46]">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex h-5 items-end gap-[3px]" aria-hidden="true">
                    {Array.from({ length: 34 }).map((_, index) => (
                      <span
                        key={index}
                        className={`h-full w-full rounded-full ${index < Math.round(stat.fill / 3) ? 'bg-[#095F46]' : 'bg-[#e6ece8]'}`}
                      />
                    ))}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(300px,0.8fr)]">
            <div className="min-w-0 space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(330px,1fr)]">
                <article className="min-w-0 overflow-hidden rounded-xl bg-[#0b3027] p-3.5 text-white shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold">Study Hub</h2>
                      <p className="mt-0.5 text-xs text-white/60">
                        {dashboardProgress?.currentLearningPath?.title || 'No learning path assigned'}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-bold text-white/80">Weekly</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-white/75">
                      Total Hours: <span className="text-2xl font-bold text-white">{Math.round(weeklyHours * 10) / 10}h</span>
                    </div>
                    <span className="text-xs text-white/70">Completed sessions</span>
                  </div>
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    {weeklyHours === 0 ? (
                      <p className="flex h-[150px] items-center justify-center text-sm text-white/70">{bookingsError ? 'Study hours unavailable' : 'No completed sessions this week'}</p>
                    ) : (
                      <div className="flex h-[150px] items-end gap-3" role="img" aria-label="Completed study hours this week">
                        {learningSeries.map(day => (
                          <div key={day.day} className="flex h-full flex-1 flex-col justify-end items-center gap-1">
                            <span className="text-xs text-white/70">{Math.round(day.hours * 10) / 10}h</span>
                            <div className="w-full max-w-10 rounded-t bg-[#10BF8D]" style={{ height: `${day.hours / chartMax * 100}px` }} />
                            <span className="text-xs text-white/70">{day.day}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="text-xs font-semibold text-white/70">Current lesson</p>
                      <p className="mt-1 text-base font-bold text-white">{dashboardProgress?.currentLesson?.title || 'Ready to begin'}</p>
                      <p className="text-xs text-white/60">{dashboardProgress?.currentModule?.title || 'Book a session to start your plan'}</p>
                    </div>
                    <span className="justify-self-start rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#095F46] sm:justify-self-end">{dashboardProgress ? `${progressPercent}% complete` : 'No progress recorded'}</span>
                  </div>
                </article>

                <article className="rounded-xl border border-[#d6e0db] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-[#202823]">Next Sessions</h2>
                    <Link href="/student/courses" className="text-sm font-bold text-[#095F46] hover:underline">View all</Link>
                  </div>
                  <div className="mt-4 space-y-4">
                    {visibleSessions.map((s, index) => (
                      <div key={s.id} className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-4 rounded-xl bg-[#f5f7f6] p-3.5">
                        <span className={`h-3.5 w-3.5 rounded-full ${index === 1 ? 'bg-[#10BF8D]' : 'bg-[#095F46]'}`} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#202823]">Quran Session</p>
                          <p className="text-xs text-[#56635c]">
                            {new Date(s.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' '}with {s.lecturer?.fullName || 'your lecturer'}
                          </p>
                        </div>
                        <Link
                          href={`/student/courses/beginner-qaida/sessions/${s.id}/room`}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#095F46] text-white transition-colors hover:bg-[#074c38]"
                          aria-label="Join session"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    ))}
                    {visibleSessions.length === 0 && (
                      <div className="rounded-xl border border-dashed border-[#cbd8d2] bg-[#f5f7f6] p-5 text-center">
                        <Calendar className="mx-auto h-8 w-8 text-[#095F46]" />
                        <p className="mt-3 text-sm font-bold text-[#202823]">{bookingsError ? 'Sessions unavailable' : 'No upcoming sessions'}</p>
                        <p className="mt-1 text-xs text-[#56635c]">Book your next session to continue learning.</p>
                      </div>
                    )}
                  </div>
                </article>
              </div>

              <article className="rounded-xl border border-[#d6e0db] bg-white p-3.5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#202823]">Upcoming Sessions</h2>
                    <p className="text-sm text-[#56635c]">Your booked live classes, arranged like a weekly plan.</p>
                  </div>
                  <button onClick={() => setShowBookModal(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#095F46] px-4 text-xs font-bold text-white transition-colors hover:bg-[#074c38]">
                    <Calendar className="h-4 w-4" /> Book Session
                  </button>
                </div>
                <div className="mt-4">
                  <ScheduleCalendar events={visibleSessions.map(session => ({
                    id: session.id, startsAt: session.startsAt, endsAt: session.endsAt,
                    title: 'Quran Session', subtitle: session.lecturer?.fullName || 'Your lecturer', tone: 'blue' as const,
                    onClick: () => router.push('/student/courses/beginner-qaida/sessions'),
                  }))} visibleHours={Array.isArray(profile?.assignedLecturer?.hourlyAvailabilityJson) ? profile.assignedLecturer.hourlyAvailabilityJson.map(Number) : []} ariaLabel="Upcoming student sessions" />
                </div>
              </article>
            </div>

            <aside className="space-y-4">
              <article className="rounded-xl border border-[#d6e0db] bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-[#202823]">Assigned Lecturer</h2>
                  <UserRound className="h-4 w-4 text-[#095F46]" />
                </div>
                {assignedLecturer ? (
                  <div className="mt-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#095F46] text-base font-bold uppercase text-white shadow-sm">
                        {assignedLecturer.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#202823]">{assignedLecturer.fullName}</p>
                        <p className="truncate text-sm text-[#56635c]">{assignedLecturer.bio || 'Your assigned lecturer'}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#56635c]">
                          <Star className="h-3.5 w-3.5 fill-[#10BF8D] text-[#10BF8D]" />
                          {assignedLecturer.ratingCount ? `${assignedLecturer.ratingAvg?.toFixed(1) ?? '—'} · ${assignedLecturer.ratingCount} reviews` : 'No reviews yet'}
                        </div>
                      </div>
                    </div>
                    <Link href="/student/support?tab=change-lecturer" className="mt-4 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-full border border-[#b9cac2] text-xs font-bold text-[#095F46] transition-colors hover:bg-[#e8f0ed]">
                      <RefreshCw className="h-4 w-4" /> Request Lecturer Change
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-[#cbd8d2] bg-[#f5f7f6] p-5 text-center">
                    <p className="text-sm font-bold text-[#202823]">{profileError ? 'Lecturer information unavailable' : 'No lecturer assigned yet'}</p>
                    <button onClick={() => setShowBookModal(true)} className="mt-2 text-sm font-bold text-[#095F46] hover:underline">Book your first session</button>
                  </div>
                )}
              </article>

              <article className="rounded-xl border border-[#d6e0db] bg-white p-3.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#095F46]" />
                  <h2 className="text-lg font-bold text-[#202823]">Free Trial</h2>
                </div>
                {!dashboardSubscription && !subscriptionError ? (
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-[#202823]">1 Session</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Action Required</span>
                      </div>
                      <p className="mt-2 text-sm text-[#56635c]">
                        Activate a free trial to start learning. Trial eligibility is checked when you activate it.
                      </p>
                    </div>
                    <button
                      onClick={() => activateTrialMutation.mutate()}
                      disabled={activateTrialMutation.isPending}
                      className="w-full rounded-full bg-[#095F46] py-2.5 text-xs font-bold text-white transition-all hover:bg-[#074c38] disabled:opacity-50"
                    >
                      {activateTrialMutation.isPending ? 'Activating...' : 'Activate Free Trial'}
                    </button>
                  </div>
                ) : dashboardSubscription ? (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-[#202823]">{dashboardSubscription.tier || 'Subscription'}</span>
                      <span className="rounded-full bg-[#e8f0ed] px-2 py-0.5 text-[10px] font-bold text-[#095F46]">{activeSubscriptionLabel}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#56635c]">{activeSubscriptionLabel === 'Expired' ? 'Ended' : 'Ends'} {new Date(dashboardSubscription.currentPeriodEnd).toLocaleDateString()} · LKR {dashboardSubscription.lkrAmount}</p>
                    <Link href="/student/billing" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#095F46] hover:underline">
                      Manage <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : <p className="mt-3 text-sm text-[#56635c]">Subscription information unavailable.</p>}
              </article>

              <article className="rounded-xl border border-[#d6e0db] bg-[#f5f7f6] p-3.5 text-sm text-[#56635c]">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#095F46]" />
                  <div>
                    <h2 className="font-bold text-[#202823]">Cancellation Policy</h2>
                    <p className="mt-1">Sessions can be cancelled or rescheduled up to <strong>12 hours</strong> before start time at no penalty. Within 12 hours, the session counts as used.</p>
                  </div>
                </div>
              </article>
            </aside>
          </section>
        </div>
      </div>

      {showChangeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-2xl max-w-md w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Request Lecturer Change</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              We&apos;ll schedule a trial session with a different lecturer. If you&apos;re happy, we&apos;ll make the switch permanent.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Reason for change (optional)</label>
              <textarea value={changeReason} onChange={(e) => setChangeReason(e.target.value)} rows={3} placeholder="e.g., Scheduling conflict..." className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal} disabled={isSubmittingChange} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50">Cancel</button>
              <button onClick={handleSubmitChangeRequest} disabled={isSubmittingChange} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#095F46] hover:bg-[#074c38] disabled:opacity-50">
                {isSubmittingChange ? 'Submitting...' : 'Request Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {changeRequested && (
        <div className="fixed bottom-6 right-6 z-[100] animate-fade-in">
          <div className="px-5 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-lg flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="h-4 w-4 text-[hsl(var(--primary))]" />
            Change request submitted!
          </div>
        </div>
      )}

      {showBookModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-2xl max-w-md w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Select Course</h3>
            <div className="space-y-3 mb-6 mt-4">
              <Link href="/student/courses" className="flex items-center gap-3 p-4 rounded-xl border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.05)] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-[hsl(var(--primary))]" />
                </div>
                <div>
                  <div className="font-semibold text-sm">View All Available Courses</div>
                </div>
                <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))] ml-auto" />
              </Link>
            </div>
            <button onClick={closeModal} className="w-full py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

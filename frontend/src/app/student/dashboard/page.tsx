'use client';

import Link from 'next/link';
import { Calendar, Clock, BookOpen, Star, Video, CreditCard, TrendingUp, ChevronRight, Play, RefreshCw, AlertTriangle, HelpCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [changeRequested, setChangeRequested] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: () => apiFetch('/profile/student'),
  });

  const { data: bookings } = useQuery({
    queryKey: ['studentBookings'],
    queryFn: () => apiFetch('/bookings/student'),
  });

  const { data: subscription } = useQuery({
    queryKey: ['studentSubscription'],
    queryFn: () => apiFetch('/subscriptions/me'),
  });

  const { data: progress } = useQuery({
    queryKey: ['studentProgress'],
    queryFn: () => apiFetch('/progress/student'),
  });

  const closeModal = useCallback(() => {
    setShowChangeModal(false);
    setShowBookModal(false);
  }, []);

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
      closeModal();
    } catch (err) {
      console.error('Failed to submit request:', err);
      alert('Failed to submit request. Please try again later.');
    } finally {
      setIsSubmittingChange(false);
    }
  };

  const upcomingSessions = bookings?.filter((b: any) => new Date(b.startsAt) > new Date()) || [];
  const assignedLecturer = profile?.assignedLecturer || upcomingSessions[0]?.lecturer || null;

  const now = new Date();
  const sessionsThisMonth = bookings?.filter((b: any) => {
    const d = new Date(b.startsAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  })?.length || 0;

  const completedSessions = bookings?.filter((b: any) => b.status === 'COMPLETED' || b.status === 'NO_SHOW_STUDENT') || [];
  const hoursLearned = Math.round((completedSessions.length * 40 / 60) * 10) / 10;

  if (!user || !profile) {
    return <div className="min-h-screen bg-[hsl(var(--background))] animate-pulse p-8">Loading dashboard...</div>;
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Assalamu Alaikum, {profile.fullName.split(' ')[0]}!</h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              {upcomingSessions.length > 0 ? `Your next session is on ${new Date(upcomingSessions[0].startsAt).toLocaleDateString()}` : "You don't have any upcoming sessions"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/student/support"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] transition-all shadow-sm"
            >
              <HelpCircle className="h-4 w-4 text-[hsl(var(--primary))]" /> Get Support
            </Link>
            <button onClick={() => setShowBookModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg transition-all">
              <Calendar className="h-4 w-4" /> Book Session
            </button>
          </div>
        </div>

        {/* Need Help Support Quick Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[hsl(168,80%,26%)/0.08] via-[hsl(168,80%,26%)/0.04] to-transparent border border-[hsl(168,80%,26%)/0.2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-[hsl(168,80%,26%)/0.15] text-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-[hsl(var(--foreground))]">Need Scholar Reassignment or Session Support?</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Submit a lecturer change request, report an issue, or chat directly with our student advisory team on WhatsApp.
              </p>
            </div>
          </div>
          <Link
            href="/student/support"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-md transition-all whitespace-nowrap flex items-center gap-1.5 flex-shrink-0"
          >
            Get Support <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Sessions This Month', value: sessionsThisMonth, icon: Clock, color: 'text-[hsl(var(--primary))]' },
            { label: 'Hours Learned', value: `${hoursLearned}h`, icon: BookOpen, color: 'text-[hsl(var(--accent))]' },
            { label: 'Current Streak', value: '1 week', icon: TrendingUp, color: 'text-[hsl(var(--success))]' },
            { label: 'Avg Rating Given', value: '5.0', icon: Star, color: 'text-[hsl(var(--accent))]' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {assignedLecturer ? (
              <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-lg">Your Assigned Lecturer</h2>
                  <Link href="/student/support?tab=change-lecturer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)] hover:bg-[hsl(var(--primary)/0.05)] transition-colors">
                    <RefreshCw className="h-3.5 w-3.5" /> Request Lecturer Change
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,50%,45%)] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 uppercase">
                    {assignedLecturer.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{assignedLecturer.fullName}</div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">{assignedLecturer.bio || 'Qualified Lecturer'}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="h-3.5 w-3.5 text-[hsl(var(--accent))] fill-current" />
                      <span className="text-sm font-medium">{assignedLecturer.ratingAvg?.toFixed(1) || 'New'}</span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">· {assignedLecturer.ratingCount || 0} reviews</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-center">
                <p className="text-[hsl(var(--muted-foreground))]">You haven&apos;t booked any sessions yet.</p>
                <button onClick={() => setShowBookModal(true)} className="text-sm text-[hsl(var(--primary))] font-medium hover:underline mt-2">Book your first session →</button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Upcoming Sessions</h2>
                <Link href="/student/courses" className="text-sm text-[hsl(var(--primary))] hover:underline">View all</Link>
              </div>
              <div className="space-y-3">
                {upcomingSessions.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.3)] transition-colors">
                    <div className="h-12 w-12 rounded-xl bg-[hsl(var(--primary-light))] flex items-center justify-center flex-shrink-0">
                      <Video className="h-5 w-5 text-[hsl(var(--primary))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">Quran Session</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">with {s.lecturer?.fullName}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{new Date(s.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(s.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    {s.livekitRoomName ? (
                      <Link href={`/student/courses/beginner-qaida/sessions/${s.id}/room`} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-md transition-all flex items-center gap-1.5">
                        <Play className="h-3 w-3" /> Join
                      </Link>
                    ) : (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Link pending</span>
                    )}
                  </div>
                ))}
                {upcomingSessions.length === 0 && (
                  <div className="p-8 rounded-xl border border-dashed border-[hsl(var(--border))] text-center">
                    <Calendar className="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
                    <p className="font-medium mb-1">No upcoming sessions</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">Book your next session to continue learning</p>
                    <button onClick={() => setShowBookModal(true)} className="text-sm text-[hsl(var(--primary))] font-medium hover:underline">Book Now →</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Your Learning Journey</h2>
            <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
              {progress ? (
                <>
                  <div>
                    <div className="text-xs font-bold tracking-wider text-[hsl(var(--primary))] uppercase mb-1">
                      {progress.currentLearningPath?.level} Level
                    </div>
                    <div className="font-bold text-lg mb-1">{progress.currentLearningPath?.title}</div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {progress.currentModule?.title}: {progress.currentLesson?.title}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium">Path Progress</span>
                      <span className="text-[hsl(var(--muted-foreground))]">{progress.progressPercentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[hsl(var(--muted))]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,40%)] transition-all" style={{ width: `${progress.progressPercentage}%` }} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-[hsl(var(--muted))] rounded w-1/3"></div>
                  <div className="h-6 bg-[hsl(var(--muted))] rounded w-2/3"></div>
                  <div className="h-2 bg-[hsl(var(--muted))] rounded w-full mt-4"></div>
                </div>
              )}
            </div>

            <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-[hsl(var(--primary))]" />
                <span className="font-medium text-sm">Subscription</span>
              </div>
              
              {!subscription ? (
                 <div className="space-y-3">
                   <div className="flex items-center gap-2">
                     <span className="text-lg font-bold">Free Trial</span>
                     <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]">Action Required</span>
                   </div>
                   <p className="text-sm text-[hsl(var(--muted-foreground))]">
                     You have <strong>1 free session</strong> remaining. Enjoy your first session without any payment!
                   </p>
                   <button className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-md transition-all">
                     Upgrade to Premium
                   </button>
                 </div>
              ) : (
                 <>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-lg font-bold">{subscription.tier || 'Premium Plan'}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]">Active</span>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()} · LKR {subscription.lkrAmount}/month</p>
                    <Link href="/student/billing" className="flex items-center gap-1 text-xs text-[hsl(var(--primary))] font-medium mt-3 hover:underline">
                      Manage <ChevronRight className="h-3 w-3" />
                    </Link>
                 </>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Cancellation Policy:</strong> Sessions can be cancelled or rescheduled up to <strong>12 hours</strong> before start time at no penalty. Within 12 hours, the session counts as used.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showChangeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-md w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
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
              <button onClick={handleSubmitChangeRequest} disabled={isSubmittingChange} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] disabled:opacity-50">
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
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-md w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
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

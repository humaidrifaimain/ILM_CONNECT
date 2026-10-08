'use client';

import { Clock, Users, DollarSign, Star, Calendar, Play, Wallet } from 'lucide-react';
import Link from 'next/link';
import { DashboardStatCard } from '@/components/layout/dashboard-stat-card';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useDialogAccessibility } from '@/lib/use-dialog-accessibility';

interface LecturerBooking { id: string; studentId: string; startsAt: string; status: string; student?: { fullName: string }; }
interface LecturerPayout { status: string; amountLkr: number; }
interface LecturerProfile { fullName: string; ratingAvg?: number; ratingCount?: number; payoutMethod?: string; }

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const withdrawDialog = useDialogAccessibility(showWithdrawModal, () => { if (!isWithdrawing) setShowWithdrawModal(false); });

  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery<LecturerProfile>({
    queryKey: ['lecturerProfile'],
    queryFn: () => apiFetch('/profile/lecturer'),
  });

  const { data: bookings, isLoading: bookingsLoading, isError: bookingsError } = useQuery<LecturerBooking[]>({
    queryKey: ['lecturerBookings'],
    queryFn: () => apiFetch('/bookings/lecturer'),
  });

  const { data: payouts, isLoading: payoutsLoading, isError: payoutsError, refetch: refetchPayouts } = useQuery<LecturerPayout[]>({
    queryKey: ['lecturerPayouts'],
    queryFn: () => apiFetch('/payouts/me'),
  });

  const { data: balance, isLoading: balanceLoading, isError: balanceError, refetch: refetchBalance } = useQuery<{ availableLkr: number }>({ queryKey: ['lecturerBalance'], queryFn: () => apiFetch('/payouts/balance') });

  const todaySessions = bookings?.filter((b) => {
    const status = (b.status || '').toUpperCase();
    const isCanceled = status === 'CANCELED' || status === 'NO_SHOW_STUDENT';
    if (isCanceled) return false;
    const d = new Date(b.startsAt);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }) || [];

  // Derived stats
  const totalEarnings = payouts?.filter((p) => p.status === 'SUCCESSFUL').reduce((sum, p) => sum + p.amountLkr, 0) ?? 0;
  const availableEarnings = balance?.availableLkr || 0;
  const pendingEarnings = payouts?.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + p.amountLkr, 0) ?? 0;
  const totalSessionsCompleted = bookings?.filter((b) => b.status === 'COMPLETED').length ?? 0;
  const activeStudents = new Set(bookings?.map((b) => b.studentId)).size ?? 0;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const sessionsThisWeek = bookings?.filter(booking => booking.status !== 'CANCELED' && new Date(booking.startsAt) >= weekStart && new Date(booking.startsAt) < weekEnd).length ?? 0;

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      await apiFetch('/payouts/request', {
        method: 'POST',
        body: JSON.stringify({ amountLkr: availableEarnings, method: profile?.payoutMethod || 'bank_transfer' }),
      });
      setShowWithdrawModal(false);
      await Promise.all([refetchPayouts(), refetchBalance()]);
      toast.success('Payout Requested', 'Your payout request has been submitted for review.');
    } catch (err: unknown) {
      console.error('Withdrawal failed', err);
      toast.error('Withdrawal Failed', err instanceof Error ? err.message : 'Failed to submit withdrawal request.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (profileError || bookingsError || payoutsError || balanceError) {
    return <div role="alert" className="rounded-xl border border-[#d6e0db] bg-white p-6">Unable to load your dashboard data. Please refresh to try again.</div>;
  }

  if (!user || profileLoading || bookingsLoading || payoutsLoading || balanceLoading || !profile) {
    return <LoadingScreen message="Loading Lecturer Portal..." subtitle="Preparing your classes, earnings, and student activity" fullScreen />;
  }

  return (
    <div className="mx-auto w-full space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[hsl(var(--muted-foreground))]">You have {todaySessions.length} sessions today</p>
        </div>
        <Link href="/lecturer/availability" className="inline-flex items-center gap-2 min-h-10 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#095F46] hover:bg-[#074c38] hover:shadow-md transition-all">
          <Calendar className="h-4 w-4" /> Manage Availability
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-[#d6e0db] bg-white shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-20 w-20 bg-[#e8f0ed] rounded-bl-[80px]" />
          <DollarSign className="h-5 w-5 text-[hsl(var(--accent))] mb-2" />
          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Available earnings</div>
          <div className="text-2xl font-bold text-[#0b3027]">Rs. {availableEarnings.toLocaleString()}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Pending requests: Rs. {pendingEarnings.toLocaleString()}</div>
          <button disabled={availableEarnings <= 0} onClick={() => setShowWithdrawModal(true)} className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#095F46] hover:bg-[#074c38] hover:shadow-sm transition-all">
            <Wallet className="h-3.5 w-3.5" /> Withdraw
          </button>
        </div>
        <div className="p-5 rounded-xl border border-[#d6e0db] bg-white shadow-sm">
          <DollarSign className="h-5 w-5 text-[hsl(var(--success))] mb-2" />
          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Total Earnings (Lifetime)</div>
          <div className="text-2xl font-bold">Rs. {totalEarnings.toLocaleString()}</div>
        </div>
        <div className="p-5 rounded-xl border border-[#d6e0db] bg-white shadow-sm">
          <Clock className="h-5 w-5 text-[hsl(var(--primary))] mb-2" />
          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Sessions Completed (Lifetime)</div>
          <div className="text-2xl font-bold">{totalSessionsCompleted}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Completed sessions to date</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sessions This Week', value: sessionsThisWeek, icon: Clock },
          { label: 'Active Students', value: activeStudents, icon: Users },
          { label: 'Avg Rating', value: profile.ratingCount ? (profile.ratingAvg?.toFixed(1) || 'No ratings') : 'No ratings', icon: Star },
          { label: 'Payout Requests', value: payouts?.length ?? 0, icon: Wallet },
        ].map((stat) => (
          <DashboardStatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <section className="rounded-xl border border-[#d6e0db] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Today&apos;s Sessions</h2>
          <Link href="/lecturer/sessions" className="text-sm text-[hsl(var(--primary))] hover:underline">View all</Link>
        </div>
        <div className="space-y-3">
          {todaySessions.map((s) => (
            <div key={s.id} className="flex items-center gap-4 p-3.5 rounded-xl border border-[#d6e0db] bg-white shadow-sm">
              <div className="h-11 w-11 rounded-full bg-[hsl(var(--primary-light))] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[hsl(var(--primary))] uppercase">
                {s.student?.fullName.split(' ').map((n: string)=>n[0]).join('').slice(0,2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{s.student?.fullName}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Quran Session</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(s.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <Link href={`/lecturer/sessions/${s.id}/room`} className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#095F46] hover:bg-[#074c38] hover:shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0">
                <Play className="h-3 w-3 fill-current" /> Start
              </Link>

            </div>
          ))}
          {todaySessions.length === 0 && (
            <div className="p-8 rounded-xl border border-dashed border-[#d6e0db] bg-white text-center shadow-sm">
              <p className="font-medium mb-1">No sessions today</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Enjoy your day off!</p>
            </div>
          )}
        </div>
      </section>

      {showWithdrawModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div ref={withdrawDialog} role="dialog" aria-modal="true" aria-label="Withdraw Earnings" tabIndex={-1} className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-xl max-w-sm w-full p-6 animate-fade-in">
            <h3 className="text-lg font-bold mb-2">Withdraw Earnings</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Withdraw your available earnings of Rs. {availableEarnings.toLocaleString()}.</p>
            <div className="p-3 rounded-lg bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))] mb-4">
              <strong>Payout method:</strong> {profile.payoutMethod || 'Not configured'}
            </div>
            <div className="flex gap-3">
              <button disabled={isWithdrawing} onClick={() => setShowWithdrawModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50">Cancel</button>
              <button disabled={isWithdrawing} onClick={handleWithdraw} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#095F46] hover:bg-[#074c38] disabled:opacity-50">
                {isWithdrawing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

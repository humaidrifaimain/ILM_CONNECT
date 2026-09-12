'use client';

import { Clock, Users, DollarSign, Star, Video, Calendar, TrendingUp, Play, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ['lecturerProfile'],
    queryFn: () => apiFetch('/profile/lecturer'),
  });

  const { data: bookings, refetch: refetchBookings } = useQuery({
    queryKey: ['lecturerBookings'],
    queryFn: () => apiFetch('/bookings/lecturer'),
  });

  const { data: payouts, refetch: refetchPayouts } = useQuery({
    queryKey: ['lecturerPayouts'],
    queryFn: () => apiFetch('/payouts/me'),
  });

  const todaySessions = bookings?.filter((b: any) => {
    const status = (b.status || '').toUpperCase();
    const isCanceled = status === 'CANCELED' || status === 'NO_SHOW_STUDENT';
    if (isCanceled) return false;
    const d = new Date(b.startsAt);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }) || [];

  // Derived stats
  const totalEarnings = payouts?.filter((p: any) => p.status === 'SUCCESSFUL').reduce((sum: number, p: any) => sum + p.amountLkr, 0) ?? 0;
  // Note: Pending earnings calculation depends on completed un-paid blocks. Assuming some dummy calculation for UI logic if blocks API is missing.
  const pendingEarnings = payouts?.filter((p: any) => p.status === 'PENDING').reduce((sum: number, p: any) => sum + p.amountLkr, 0) ?? 0;
  const totalSessionsCompleted = bookings?.filter((b: any) => b.status === 'COMPLETED').length ?? 0;
  const activeStudents = new Set(bookings?.map((b: any) => b.studentId)).size ?? 0;

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      await apiFetch('/payouts/request', {
        method: 'POST',
        body: JSON.stringify({ amountLkr: pendingEarnings, method: 'bank_transfer' }),
      });
      setShowWithdrawModal(false);
      await refetchPayouts();
      toast.success('Payout Requested', 'Your payout request has been submitted for review.');
    } catch (err: any) {
      console.error('Withdrawal failed', err);
      toast.error('Withdrawal Failed', err?.message || 'Failed to submit withdrawal request.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!user || !profile) {
    return <LoadingScreen message="Loading Lecturer Portal..." subtitle="Preparing your classes, earnings, and student activity" fullScreen />;
  }

  return (
    <div className="space-y-6 animate-fade-in p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Assalamu Alaikum, {profile.fullName.split(' ')[0]}!</h1>
          <p className="text-[hsl(var(--muted-foreground))]">You have {todaySessions.length} sessions today</p>
        </div>
        <Link href="/lecturer/availability" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg transition-all">
          <Calendar className="h-4 w-4" /> Manage Availability
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-[hsl(var(--primary)/0.1)] to-transparent rounded-bl-[80px]" />
          <DollarSign className="h-5 w-5 text-[hsl(var(--accent))] mb-2" />
          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Pending Earnings (This Cycle)</div>
          <div className="text-2xl font-bold text-gradient-primary">Rs. {pendingEarnings.toLocaleString()}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Available for withdrawal</div>
          <button onClick={() => setShowWithdrawModal(true)} className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-md transition-all">
            <Wallet className="h-3.5 w-3.5" /> Withdraw
          </button>
        </div>
        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <DollarSign className="h-5 w-5 text-[hsl(var(--success))] mb-2" />
          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Total Earnings (Lifetime)</div>
          <div className="text-2xl font-bold">Rs. {totalEarnings.toLocaleString()}</div>
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--success))] mt-1"><TrendingUp className="h-3 w-3" /> +15% from last cycle</div>
        </div>
        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <Clock className="h-5 w-5 text-[hsl(var(--primary))] mb-2" />
          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Sessions Completed (This Cycle)</div>
          <div className="text-2xl font-bold">{totalSessionsCompleted}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Bi-weekly payout cycle</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sessions This Week', value: bookings?.length || 0, icon: Clock, color: 'text-[hsl(var(--primary))]' },
          { label: 'Active Students', value: activeStudents, icon: Users, color: 'text-blue-500' },
          { label: 'Avg Rating', value: profile.ratingAvg?.toFixed(1) || '0.0', icon: Star, color: 'text-amber-500' },
          { label: 'Payout Cycle', value: 'Bi-weekly', icon: Calendar, color: 'text-purple-500' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <Icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Today&apos;s Sessions</h2>
          <Link href="/lecturer/sessions" className="text-sm text-[hsl(var(--primary))] hover:underline">View all</Link>
        </div>
        <div className="space-y-3">
          {todaySessions.map((s: any) => (
            <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <div className="h-11 w-11 rounded-full bg-[hsl(var(--primary-light))] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[hsl(var(--primary))] uppercase">
                {s.student?.fullName.split(' ').map((n: string)=>n[0]).join('').slice(0,2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{s.student?.fullName}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Quran Session</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(s.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <Link href={`/lecturer/sessions/${s.id}/room`} className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-md transition-all flex items-center gap-1.5 flex-shrink-0">
                <Play className="h-3 w-3 fill-current" /> Start
              </Link>

            </div>
          ))}
          {todaySessions.length === 0 && (
            <div className="p-8 rounded-xl border border-dashed border-[hsl(var(--border))] text-center">
              <p className="font-medium mb-1">No sessions today</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Enjoy your day off!</p>
            </div>
          )}
        </div>
      </div>

      {showWithdrawModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-xl max-w-sm w-full p-6 animate-fade-in">
            <h3 className="text-lg font-bold mb-2">Withdraw Earnings</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Withdraw your pending earnings of Rs. {pendingEarnings.toLocaleString()}.</p>
            <div className="p-3 rounded-lg bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))] mb-4">
              <strong>Rate:</strong> Rs. 1,250 per 45-min session<br />
              <strong>Payout method:</strong> {profile.payoutMethod || 'Bank transfer'}
            </div>
            <div className="flex gap-3">
              <button disabled={isWithdrawing} onClick={() => setShowWithdrawModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50">Cancel</button>
              <button disabled={isWithdrawing} onClick={handleWithdraw} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] disabled:opacity-50">
                {isWithdrawing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

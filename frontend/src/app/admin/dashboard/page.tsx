'use client';

import Link from 'next/link';
import { Users, DollarSign, TrendingUp, Clock, AlertTriangle, UserPlus, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function AdminDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Note: Only accessible by ADMIN or SUPER_ADMIN
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => apiFetch('/admin/stats'),
    enabled: !!isAdmin,
  });

  if (isAuthLoading || (isAdmin && isStatsLoading)) {
    return <div className="min-h-screen p-8 animate-pulse">Loading admin dashboard...</div>;
  }

  if (!isAdmin || !stats) {
    return <div className="p-8 text-red-500">Failed to load admin statistics. Ensure you have admin privileges.</div>;
  }

  // Fallbacks for UI if backend stats object is missing some fields temporarily
  const s = {
    revenueThisMonth: stats.revenueThisMonth || 0,
    mrrLKR: stats.mrrLKR || 0,
    mrrUSD: stats.mrrUSD || 0,
    activeStudents: stats.activeStudents || 0,
    totalStudents: stats.totalStudents || 0,
    activeLecturers: stats.activeLecturers || 0,
    pendingApplications: stats.pendingApplications || 0,
    sessionsToday: stats.sessionsToday || 0,
    sessionsThisWeek: stats.sessionsThisWeek || 0,
    payoutsThisMonth: stats.payoutsThisMonth || 0,
    profitThisMonth: stats.profitThisMonth || 0,
    unassignedStudents: stats.unassignedStudents || 0,
    lecturerChangeRequests: stats.lecturerChangeRequests || 0,
    paymentFailures: stats.paymentFailures || 0,
    churnRate: stats.churnRate || 0,
    avgRating: stats.avgRating || 0,
  };

  const profitMargin = s.revenueThisMonth > 0 ? ((s.profitThisMonth / s.revenueThisMonth) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6 animate-fade-in p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* KPIs */}
      <div className={`grid grid-cols-2 gap-4 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {[
          { label: 'Monthly Revenue', value: `Rs. ${(s.mrrLKR / 1000).toFixed(0)}K`, sub: `$${(s.mrrUSD / 1000).toFixed(1)}K USD`, icon: DollarSign, color: 'text-[hsl(var(--primary))]', show: isSuperAdmin },
          { label: 'Active Students', value: s.activeStudents, sub: `${s.totalStudents} total`, icon: Users, color: 'text-blue-500', show: true },
          { label: 'Active Lecturers', value: s.activeLecturers, sub: `${s.pendingApplications} pending`, icon: UserPlus, color: 'text-purple-500', show: true },
          { label: 'Sessions Today', value: s.sessionsToday, sub: `${s.sessionsThisWeek} this week`, icon: Clock, color: 'text-[hsl(var(--accent))]', show: true },
        ].filter(stat => stat.show).map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-5 w-5 ${stat.color}`} />
                <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{stat.label}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">{stat.sub}</div>
            </div>
          );
        })}
      </div>

      <div className={`grid gap-6 ${isSuperAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
        {isSuperAdmin && (
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <h2 className="font-semibold mb-4">Financial Overview</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Revenue</div>
                  <div className="text-xl font-bold text-[hsl(var(--primary))]">Rs. {(s.revenueThisMonth / 1000).toFixed(0)}K</div>
                </div>
                <div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Payouts</div>
                  <div className="text-xl font-bold text-[hsl(var(--accent))]">Rs. {(s.payoutsThisMonth / 1000).toFixed(0)}K</div>
                </div>
                <div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Profit</div>
                  <div className="text-xl font-bold text-[hsl(var(--success))]">Rs. {(s.profitThisMonth / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-[hsl(var(--success))]">{profitMargin}% margin</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <h3 className="font-semibold mb-3">Alerts</h3>
            <div className="space-y-3">
              <Link href="/admin/requests" className="flex items-start gap-3 text-sm p-2 -mx-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">{s.unassignedStudents} students need assignment</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">New enrollments awaiting a lecturer</div>
                </div>
              </Link>
              <Link href="/admin/requests" className="flex items-start gap-3 text-sm p-2 -mx-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">{s.lecturerChangeRequests} lecturer change requests</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">From existing students</div>
                </div>
              </Link>
              <div className="flex items-start gap-3 text-sm p-2 -mx-2">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">{s.pendingApplications} pending lecturer applications</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Require review</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm p-2 -mx-2">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--destructive))] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">{s.paymentFailures} payment failures</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">This week</div>
                </div>
              </div>
            </div>
          </div>

          {!isSuperAdmin && (
            <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <h3 className="font-semibold mb-3">Platform Metrics</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Avg Rating</span><span className="font-medium">{s.avgRating} ⭐</span></div>
              </div>
            </div>
          )}
        </div>
        
        {isSuperAdmin && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <h3 className="font-semibold mb-3">Platform Metrics</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Churn Rate</span><span className="font-medium">{s.churnRate}%</span></div>
                <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Avg Rating</span><span className="font-medium">{s.avgRating} ⭐</span></div>
                <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Payout Cycle</span><span className="font-medium">Bi-weekly</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

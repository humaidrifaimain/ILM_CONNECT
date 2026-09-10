'use client';

import { DollarSign, Download, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function AdminFinancePage() {
  const queryClient = useQueryClient();
  const { data: finance, isLoading } = useQuery({
    queryKey: ['adminFinance'],
    queryFn: () => apiFetch('/admin/finance'),
  });

  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => apiFetch('/admin/stats'),
  });

  const handleProcessPayout = async (id: string) => {
    try {
      await apiFetch(`/admin/payouts/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'SUCCESSFUL' }),
      });
      await queryClient.invalidateQueries({ queryKey: ['adminFinance'] });
      await queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast.success('Payout Processed', 'Lecturer payout has been marked as successful.');
    } catch (err: any) {
      toast.error('Payout Failed', err?.message || 'Failed to process payout');
    }
  };

  if (isLoading || !finance || !stats) {
    return <LoadingScreen message="Loading Financial Data..." subtitle="Calculating revenues, profit margins, and payouts" fullScreen />;
  }
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <button
          onClick={() => toast.info('Export Started', 'Generating financial statements CSV download...')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: `Rs. ${(stats.revenueThisMonth/1000).toFixed(0)}K`, trend: '+12%', up: true },
          { label: 'Lecturer Payouts', value: `Rs. ${(stats.payoutsThisMonth/1000).toFixed(0)}K`, trend: '+8%', up: true },
          { label: 'Net Profit', value: `Rs. ${(stats.profitThisMonth/1000).toFixed(0)}K`, trend: '+18%', up: true },
          { label: 'Payment Processing', value: `Rs. ${(stats.revenueThisMonth*0.03/1000).toFixed(0)}K`, trend: '3%', up: false },
        ].map((m) => (
          <div key={m.label} className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{m.label}</div>
            <div className="text-xl font-bold">{m.value}</div>
            <div className={`flex items-center gap-1 text-xs mt-1 ${m.up ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
              {m.up ? <TrendingUp className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />} {m.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue breakdown chart */}
      <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <h2 className="font-semibold mb-4">Revenue by Tier</h2>
        <div className="space-y-4">
          {[
            { tier: 'Quran Basic', students: 65, revenue: 975000, color: 'from-blue-500 to-blue-400' },
            { tier: 'Quran Premium', students: 52, revenue: 936000, color: 'from-[hsl(168,80%,26%)] to-[hsl(168,60%,40%)]' },
            { tier: 'Hadith & Fiqh', students: 25, revenue: 500000, color: 'from-[hsl(var(--accent))] to-amber-400' },
          ].map((t) => (
            <div key={t.tier}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium">{t.tier} <span className="text-[hsl(var(--muted-foreground))] font-normal">({t.students} students)</span></span>
                <span className="font-medium">Rs. {(t.revenue/1000).toFixed(0)}K</span>
              </div>
              <div className="h-3 rounded-full bg-[hsl(var(--muted))]">
                <div className={`h-full rounded-full bg-gradient-to-r ${t.color}`} style={{ width: `${(t.revenue / 1000000) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lecturer payouts */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Recent Payouts</h2>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
          {finance.payouts.map((p: any, i: number) => (
            <div key={p.id} className={`flex items-center justify-between px-5 py-3.5 text-sm ${i > 0 ? 'border-t border-[hsl(var(--border))]' : ''}`}>
              <div className="flex flex-col">
                <span className="font-medium">Lecturer {p.lecturerId.substring(0, 8)}</span>
                <span className="text-[hsl(var(--muted-foreground))] text-xs">{p.method} • {new Date(p.initiatedAt).toLocaleDateString()}</span>
              </div>
              <span className="font-medium">Rs. {p.amountLkr.toLocaleString()}</span>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${p.status === 'SUCCESSFUL' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : p.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{p.status}</span>
                {p.status === 'PENDING' && (
                  <button onClick={() => handleProcessPayout(p.id)} className="text-xs font-medium text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Process
                  </button>
                )}
              </div>
            </div>
          ))}
          {finance.payouts.length === 0 && <div className="p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">No payouts found</div>}
        </div>
      </div>
    </div>
  );
}

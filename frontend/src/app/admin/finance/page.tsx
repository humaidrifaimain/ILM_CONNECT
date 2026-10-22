'use client';

import { Download, CheckCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { downloadCsv } from '@/lib/download';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ExchangeRatesPanel } from '@/components/admin/exchange-rates-panel';

export default function AdminFinancePage() {
  const queryClient = useQueryClient();
  const { data: finance, isLoading, isError: financeError } = useQuery({
    queryKey: ['adminFinance'],
    queryFn: () => apiFetch('/admin/finance'),
    refetchInterval: 30000,
  });

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
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
      toast.success('Payout recorded', 'This records an external payment; no money is transferred by this app.');
    } catch (err: unknown) {
      toast.error('Payout Failed', err instanceof Error ? err.message : 'Failed to process payout');
    }
  };

  if (financeError || statsError) return <p role="alert">Unable to load financial data. Please refresh to retry.</p>;

  if (isLoading || statsLoading || !finance || !stats) {
    return <LoadingScreen message="Loading Financial Data..." subtitle="Calculating revenues, profit margins, and payouts" fullScreen />;
  }

  if (
    !Array.isArray(finance.revenueByPlan) ||
    !Array.isArray(finance.payouts) ||
    ![stats.revenueThisMonth, stats.payoutsThisMonth, stats.profitThisMonth].every(
      (value) => typeof value === 'number' && Number.isFinite(value),
    )
  ) {
    return <p role="alert">Financial data is incompatible with this dashboard. Check that the frontend API URL points to the matching backend deployment.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => downloadCsv([['Monthly summary', 'Amount LKR'], ['Revenue', stats.revenueThisMonth], ['Payouts', stats.payoutsThisMonth], ['Net before fees', stats.profitThisMonth], [], ['Plan', 'Paying students', 'Revenue LKR'], ...finance.revenueByPlan.map((row: { tier: string; students: number; revenue: number }) => [row.tier, row.students, row.revenue]), [], ['Payout ID', 'Lecturer ID', 'Date', 'Amount LKR', 'Status'], ...finance.payouts.map((p: { id: string; lecturerId: string; initiatedAt: string; amountLkr: number; status: string }) => [p.id, p.lecturerId, p.initiatedAt, p.amountLkr, p.status])], 'finance-summary.csv')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Revenue this month', value: `Rs. ${stats.revenueThisMonth.toLocaleString()}` },
          { label: 'Lecturer payouts this month', value: `Rs. ${stats.payoutsThisMonth.toLocaleString()}` },
          { label: 'Net before processing fees', value: `Rs. ${stats.profitThisMonth.toLocaleString()}` },
        ].map((m) => (
          <div key={m.label} className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{m.label}</div>
            <div className="text-xl font-bold">{m.value}</div>

          </div>
        ))}
      </div>

      <ExchangeRatesPanel rates={finance.exchangeRates ?? []} plans={finance.pricing ?? []} />

      {/* Revenue breakdown chart */}
      <div className="p-6 rounded-xl border border-stone-200/90 bg-white shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-stone-950">Revenue by Plan</h2>
          <span className="text-xs text-stone-500 font-medium">Successful payments this month</span>
        </div>
        <div className="space-y-4">
          {finance.revenueByPlan.length === 0 && <p className="text-sm text-stone-500">No successful payments this month. Revenue: Rs. 0.</p>}
          {finance.revenueByPlan.map((t: { tier: string; students: number; revenue: number }) => (
            <div key={t.tier}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-semibold text-stone-900">{t.tier} <span className="text-stone-500 font-normal">({t.students} students)</span></span>
                <span className="font-bold text-stone-950">Rs. {t.revenue.toLocaleString()}</span>
              </div>
              <div className="h-3 rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-[#095F46]" style={{ width: `${stats.revenueThisMonth > 0 ? Math.min(100, t.revenue / stats.revenueThisMonth * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lecturer payouts */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Recent Payouts</h2>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
          {finance.payouts.map((p: { id: string; lecturerId: string; method: string; initiatedAt: string; amountLkr: number; status: string }, i: number) => (
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

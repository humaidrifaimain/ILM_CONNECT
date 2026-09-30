'use client';

import { DollarSign, TrendingUp, Clock, Download, FileX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { downloadCsv } from '@/lib/download';
import { TableSkeleton } from '@/components/ui/loading-screen';

interface Payout { id: string; status: string; amountLkr: number; initiatedAt: string; sessionBlocksIncluded: unknown; }
export default function EarningsPage() {
  const { data: payouts = [], isLoading, isError } = useQuery<Payout[]>({
    queryKey: ['lecturerPayouts'],
    queryFn: () => apiFetch('/payouts/me'),
  });

  // Calculate stats
  const totalEarned = payouts
    .filter((p) => p.status === 'SUCCESSFUL')
    .reduce((sum, p) => sum + p.amountLkr, 0);

  const pendingPayout = payouts
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.amountLkr, 0);

  // Group by month for chart
  const monthlyData = new Map<string, number>();
  payouts.forEach((p) => {
    if (p.status !== 'SUCCESSFUL') return;
    const date = new Date(p.initiatedAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData.set(month, (monthlyData.get(month) || 0) + p.amountLkr);
  });

  // Convert to array and take last 6 months
  const allMonths = Array.from(monthlyData.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([key, amount]) => ({ month: new Date(`${key}-01T00:00:00`).toLocaleString('default', { month: 'short', year: 'numeric' }), amount }));

  // If no successful payouts, provide empty state for chart
  const chartData = allMonths.length > 0 ? allMonths : [
    { month: 'No Data', amount: 0 }
  ];
  const maxAmount = Math.max(1, ...chartData.map(m => m.amount));

  if (isError) return <p role="alert">Unable to load earnings. Please refresh to try again.</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          disabled={isLoading || payouts.length === 0} onClick={() => downloadCsv([['Date', 'Payout ID', 'Blocks', 'Amount LKR', 'Status'], ...payouts.map((p: { id: string; initiatedAt: string; sessionBlocksIncluded: unknown; amountLkr: number; status: string }) => [p.initiatedAt, p.id, Array.isArray(p.sessionBlocksIncluded) ? p.sessionBlocksIncluded.length : 0, p.amountLkr, p.status])], 'lecturer-payouts.csv')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <DollarSign className="h-5 w-5 text-[hsl(var(--primary))] mb-2" />
          <div className="text-2xl font-bold">Rs. {chartData[chartData.length - 1]?.amount.toLocaleString() || '0'}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Recent month&apos;s earnings</div>
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--success))] mt-1"><TrendingUp className="h-3 w-3" /> Updated dynamically</div>
        </div>
        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <Clock className="h-5 w-5 text-[hsl(var(--accent))] mb-2" />
          <div className="text-2xl font-bold">Rs. {pendingPayout.toLocaleString()}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Pending payout</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Requested/Processing</div>
        </div>
        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <DollarSign className="h-5 w-5 text-[hsl(var(--success))] mb-2" />
          <div className="text-2xl font-bold">Rs. {totalEarned.toLocaleString()}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Total earned (all time)</div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <h2 className="font-semibold mb-4">Monthly Earnings (Successful)</h2>
        <div className="flex items-end gap-3 h-48">
          {chartData.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs font-medium">{m.amount > 0 ? `Rs. ${(m.amount / 1000).toFixed(0)}K` : '-'}</div>
              <div className="w-full rounded-t-lg bg-gradient-to-t from-[hsl(168,80%,26%)] to-[hsl(168,60%,40%)] transition-all" style={{ height: `${(m.amount / maxAmount) * 140}px`, minHeight: m.amount > 0 ? '4px' : 0 }} />
              <div className="text-xs text-[hsl(var(--muted-foreground))]">{m.month}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout History */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Payout History</h2>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden overflow-x-auto">
          {isLoading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : (
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Blocks Included</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center">
                    <FileX className="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3 opacity-20" />
                    <p className="font-medium">No payouts found</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">You haven&apos;t requested any payouts yet.</p>
                  </td>
                </tr>
              ) : (
                payouts.map((p) => {
                  const blocksCount = Array.isArray(p.sessionBlocksIncluded) ? p.sessionBlocksIncluded.length : 0;
                  return (
                    <tr key={p.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.5)]">
                      <td className="px-5 py-3.5 text-sm">
                        {new Date(p.initiatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-sm">{blocksCount} blocks</td>
                      <td className="px-5 py-3.5 text-sm font-medium">Rs. {p.amountLkr.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm">
                        <span className={`inline-flex items-center w-fit px-2 py-0.5 text-xs font-medium rounded-full ${p.status === 'SUCCESSFUL' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : p.status === 'PENDING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
}

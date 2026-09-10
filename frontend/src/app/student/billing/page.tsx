'use client';

import { CreditCard, Check, ChevronRight, Download, Clock } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';

const invoices = [
  { id: 'INV-2025-04', date: 'Apr 1, 2025', amount: '$55.00', status: 'Paid' },
  { id: 'INV-2025-03', date: 'Mar 1, 2025', amount: '$55.00', status: 'Paid' },
  { id: 'INV-2025-02', date: 'Feb 1, 2025', amount: '$55.00', status: 'Paid' },
  { id: 'INV-2025-01', date: 'Jan 1, 2025', amount: '$50.00', status: 'Paid' },
];

export default function BillingPage() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['studentSubscription'],
    queryFn: () => apiFetch('/subscriptions/me'),
  });

  if (isLoading) {
    return <LoadingScreen message="Loading Billing Info..." subtitle="Fetching subscription status and invoice history" />;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-bold">Billing & Subscription</h1>

      {/* Current Plan */}
      <div className="p-6 rounded-2xl border-2 border-[hsl(var(--primary))] bg-[hsl(var(--card))]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold">{subscription?.tier || 'No Active Plan'}</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]">{subscription ? 'Active' : 'Inactive'}</span>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              {subscription?.tier?.includes('Fast Track') ? '12 sessions/month' : '8 sessions/month'} · 45 min each · Recordings included
            </p>
            <div className="text-3xl font-bold">${subscription?.lkrAmount === 17700 ? '59' : subscription?.lkrAmount === 26700 ? '89' : '0'}<span className="text-base font-normal text-[hsl(var(--muted-foreground))]">/month</span></div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Next billing date: {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Link href="/pricing" className="px-4 py-2 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors">Change Plan</Link>
          <button
            onClick={() => toast.info('Subscription Assistance', 'To cancel or adjust your subscription, please visit Support or message your advisor.')}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] transition-colors"
          >
            Cancel Subscription
          </button>
        </div>
      </div>

      {/* Payment Method */}
      <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <h3 className="font-semibold mb-3">Payment Method</h3>
        <div className="flex items-center gap-3">
          <div className="h-10 w-14 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center text-xs font-bold">VISA</div>
          <div>
            <div className="text-sm font-medium">•••• •••• •••• 4242</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Expires 12/26</div>
          </div>
          <button
            onClick={() => toast.info('Payment Methods', 'Payment details can be updated via your Stripe customer portal.')}
            className="ml-auto text-sm text-[hsl(var(--primary))] font-medium hover:underline"
          >
            Update
          </button>
        </div>
      </div>

      {/* Invoices */}
      <div>
        <h3 className="font-semibold mb-3">Invoice History</h3>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
          {invoices.map((inv, i) => (
            <div key={inv.id} className={`flex items-center gap-4 px-5 py-3.5 text-sm ${i > 0 ? 'border-t border-[hsl(var(--border))]' : ''}`}>
              <span className="font-medium w-32">{inv.id}</span>
              <span className="text-[hsl(var(--muted-foreground))] flex-1">{inv.date}</span>
              <span className="font-medium w-20 text-right">{inv.amount}</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] font-medium">{inv.status}</span>
              <button
                onClick={() => toast.info('Invoice Download', `Downloading receipt for ${inv.id}...`)}
                className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                title="Download invoice"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

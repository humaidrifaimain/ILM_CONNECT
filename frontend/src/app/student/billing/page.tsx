'use client';

import { CreditCard, Check, Clock } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function BillingPage() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['studentSubscription'],
    queryFn: () =>
      apiFetch('/subscriptions/me').catch((error: unknown) => {
        const status =
          typeof error === 'object' && error !== null && 'status' in error
            ? (error as { status?: number }).status
            : undefined;
        if (status === 404) return null;
        throw error;
      }),
  });

  const isTrial = subscription?.tier?.toLowerCase?.() === 'trial';
  const periodStart = subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart) : null;
  const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const trialDays =
    periodStart && periodEnd
      ? Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)))
      : null;
  const trialLabel =
    trialDays === 7
      ? '1 week'
      : trialDays === 14
        ? '2 weeks'
        : trialDays && trialDays >= 28 && trialDays <= 31
          ? '1 month'
          : trialDays
            ? `${trialDays} days`
            : 'Not set';
  const monthlyUsd =
    subscription?.lkrAmount === 17700
      ? '59'
      : subscription?.lkrAmount === 26700
        ? '89'
        : subscription?.lkrAmount > 0
          ? (subscription.lkrAmount / 300).toFixed(0)
          : '0';

  if (isLoading) {
    return <LoadingScreen message="Loading Billing Info..." subtitle="Fetching subscription status and invoice history" />;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-bold">Billing & Subscription</h1>

      {/* Current Plan */}
      <div className="p-6 rounded-2xl border-2 border-[#095F46] bg-white shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-stone-950">{subscription?.tier || 'No Active Plan'}</h2>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-[#095F46]/10 text-[#095F46]">{subscription ? 'Active' : 'Inactive'}</span>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              {isTrial
                ? 'Free trial access for your first scholar match'
                : subscription?.tier?.includes('Fast Track')
                  ? '12 sessions/month · 45 min each · Recordings included'
                  : subscription
                    ? '8 sessions/month · 45 min each · Recordings included'
                    : 'Choose a plan or activate your free trial to start booking.'}
            </p>
            <div className="text-3xl font-extrabold text-stone-950">
              ${monthlyUsd}<span className="text-base font-normal text-stone-500">/month</span>
            </div>
            {subscription ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500">
                    <Clock className="h-3.5 w-3.5" />
                    {isTrial ? 'Trial Period' : 'Current Period'}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-stone-950">
                    {isTrial ? trialLabel : `${periodStart?.toLocaleDateString() || 'N/A'} - ${periodEnd?.toLocaleDateString() || 'N/A'}`}
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500">
                    <CreditCard className="h-3.5 w-3.5" />
                    {isTrial ? 'Billing Starts' : 'Next Billing Date'}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-stone-950">
                    {periodEnd ? periodEnd.toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Link href="/pricing" className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#095F46] hover:bg-[#074c38] transition-colors shadow-sm">Change Plan</Link>
          <button
            onClick={() => toast.info('Subscription Assistance', 'To cancel or adjust your subscription, please visit Support or message your advisor.')}
            className="px-4 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            Cancel Subscription
          </button>
        </div>
      </div>

      {/* Payment Method */}
      <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <h3 className="font-semibold mb-3">Payment Method</h3>
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[hsl(var(--primary))]">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[hsl(var(--foreground))]">No payment method added yet</div>
            <div className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              Payment details will appear here after the paid subscription flow is connected. Free trial users do not need a card.
            </div>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div>
        <h3 className="font-semibold mb-3">Payment & Subscription History</h3>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">No payments recorded yet</p>
              <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                Real invoices and payment records will show here after a payment is successfully processed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

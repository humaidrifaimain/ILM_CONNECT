'use client';

import { CreditCard, Clock } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CurrencySelector, usePricingCurrency } from '@/lib/pricing-currency';
import { useSubscriptionPlans } from '@/lib/subscription-plans';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StudentCard, StudentIconTile, StudentPageHeader, StudentStatusPill, studentUi } from '@/components/student/student-dashboard-ui';

export default function BillingPage() {
  return <Suspense fallback={<LoadingScreen message="Loading Billing Info..." />}><BillingContent /></Suspense>;
}

function BillingContent() {
  const { format } = usePricingCurrency();
  const { data: subscriptionPlans = [] } = useSubscriptionPlans();
  const selectedPlanId = useSearchParams().get('plan');
  const selectedPlan = subscriptionPlans.find(plan => plan.id === selectedPlanId);
  const { data: subscription, isLoading, isError } = useQuery({
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

  const { data: payments = [], isPending: paymentsPending, isError: paymentsError } = useQuery<{ id: string; amountLkr: number; status: string; processedAt: string; gateway: string; subscription: { tier: string } }[]>({ queryKey: ['studentPayments'], queryFn: () => apiFetch('/subscriptions/payments') });

  const expired = subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd) <= new Date();
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

  if (isLoading) {
    return <LoadingScreen message="Loading Billing Info..." subtitle="Fetching subscription status and invoice history" />;
  }

  if (isError) return <div role="alert">Unable to load subscription information. Please refresh to try again.</div>;

  return (
    <div className={studentUi.page}>
      <StudentPageHeader
        eyebrow="Account"
        title="Billing & Subscription"
        description="Review your plan, trial status, billing date, and payment history."
      />

      <CurrencySelector />
      {selectedPlan && <StudentCard className="border-[#b9cac2] p-5">
        <h2 className="text-xl font-bold">{selectedPlan.course} · {selectedPlan.tier}</h2>
        <p className="mt-2 text-sm text-[#56635c]">{format(selectedPlan)}/month · {selectedPlan.sessions} live sessions per month</p>
        <p className="mt-4 text-sm text-[#56635c]">Online payment is not connected yet. Contact subscription support to arrange activation. Selecting a plan does not activate access.</p>
        <Link href={`/student/support?tab=contact&plan=${selectedPlan.id}`} className={`${studentUi.primaryButton} mt-4`}>Contact subscription support</Link>
        <Link href="/student/dashboard" className="ml-4 text-sm font-semibold text-[#095F46] underline">Choose another plan</Link>
      </StudentCard>}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        {/* Current Plan */}
        <StudentCard className="border-[#b9cac2] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-[#202823]">{subscription?.tier || 'No Active Plan'}</h2>
                <StudentStatusPill tone={subscription && !expired ? 'primary' : 'neutral'}>{expired ? 'Expired' : subscription ? 'Active' : 'Inactive'}</StudentStatusPill>
              </div>
              <p className="mb-4 text-sm text-[#56635c]">
                {isTrial
                  ? 'Free trial access for your first scholar match'
                  : subscription?.tier?.includes('Fast Track')
                    ? '12 sessions/month · 40 min each · Recordings included'
                    : subscription
                      ? '8 sessions/month · 40 min each · Recordings included'
                      : 'Choose a plan or activate your free trial to start booking.'}
              </p>
              <div className="text-3xl font-extrabold text-[#202823]">
                LKR {subscription?.lkrAmount?.toLocaleString() ?? 0}<span className="text-base font-normal text-[#56635c]">/month</span>
              </div>
              {subscription ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#d6e0db] bg-[#f5f7f6] p-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#56635c]">
                      <Clock className="h-3.5 w-3.5" />
                      {isTrial ? 'Trial Period' : 'Current Period'}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#202823]">
                      {isTrial ? trialLabel : `${periodStart?.toLocaleDateString() || 'N/A'} - ${periodEnd?.toLocaleDateString() || 'N/A'}`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#d6e0db] bg-[#f5f7f6] p-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#56635c]">
                      <CreditCard className="h-3.5 w-3.5" />
                      {isTrial ? 'Billing Starts' : 'Next Billing Date'}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#202823]">
                      {periodEnd ? periodEnd.toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Link href="/pricing" className={studentUi.primaryButton}>Change Plan</Link>
            <Link href="/student/support?tab=contact" className={studentUi.secondaryButton}>Request subscription changes</Link>
          </div>
        </StudentCard>

        <div className="grid gap-4">
          {/* Payment Method */}
          <StudentCard className="p-4">
            <h3 className="mb-3 font-bold text-[#202823]">Payment Method</h3>
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-[#d6e0db] bg-[#f5f7f6] p-4">
              <StudentIconTile icon={CreditCard} />
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#202823]">No payment method added yet</div>
                <div className="mt-1 text-xs leading-relaxed text-[#56635c]">
                  Payment details will appear here after the paid subscription flow is connected. Free trial users do not need a card.
                </div>
              </div>
            </div>
          </StudentCard>

          {/* Invoices */}
          <StudentCard className="p-4">
            <h3 className="mb-3 font-bold text-[#202823]">Payment & Subscription History</h3>
            {paymentsPending ? <p role="status" className="text-sm text-[#56635c]">Loading payment history…</p> : paymentsError ? <p role="alert">Unable to load payment history.</p> : payments.length === 0 ? <p className="text-sm text-[#56635c]">No payments recorded yet.</p> : <ul className="divide-y divide-[#d6e0db]">{payments.map(payment => <li key={payment.id} className="py-3 text-sm"><p className="font-semibold">{payment.subscription.tier} · LKR {payment.amountLkr.toLocaleString()}</p><p className="mt-1 text-xs text-[#56635c]">{new Date(payment.processedAt).toLocaleDateString()} · {payment.status} · {payment.gateway}</p></li>)}</ul>}
          </StudentCard>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LockKeyhole } from 'lucide-react';
import { CurrencySelector, usePricingCurrency } from '@/lib/pricing-currency';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { DashboardLoadingOverlay } from './dashboard-loading-overlay';
import { useSubscriptionPlans, type SubscriptionPlan } from '@/lib/subscription-plans';
import { fetchSubscriptionAccess, type SubscriptionAccess } from '@/lib/subscription-access';

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const { data: subscriptionPlans = [], isPending: plansPending, isError: plansError } = useSubscriptionPlans();
  const dialog = useRef<HTMLDialogElement>(null);
  const { data, isPending, isError, refetch } = useQuery<SubscriptionAccess>({
    queryKey: ['subscriptionAccess', user?.id],
    queryFn: () => fetchSubscriptionAccess(apiFetch),
    enabled: !isLoading && user?.role === 'STUDENT',
    refetchInterval: query => query.state.data?.requiresSubscription ? 5000 : 60000,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
    retry: 1,
  });
  const purchaseRoute = pathname === '/student/billing' || pathname.startsWith('/student/support');
  const blocked = user?.role === 'STUDENT' && !!data?.requiresSubscription && !purchaseRoute;
  useEffect(() => {
    if (!blocked) return;
    const element = dialog.current;
    element?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = previous; };
  }, [blocked, plansPending]);

  if (isLoading || (user?.role === 'STUDENT' && (isPending || (blocked && plansPending)))) {
    return <DashboardLoadingOverlay />;
  }
  if (user?.role === 'STUDENT' && isError) {
    return <div className="min-h-screen bg-[#f5f7f6] p-8" role="alert"><p>Unable to verify your subscription. Please try again.</p><button onClick={() => refetch()} className="mt-4 rounded-full bg-[#095F46] px-5 py-2 text-white">Try again</button></div>;
  }
  if (!blocked) return children;

  return (
    <>
      <div aria-hidden="true" className="min-h-screen bg-[#f5f7f6] blur-sm">
        <div className="h-20 border-b border-[#d6e0db] bg-white" />
        <div className="m-8 grid grid-cols-3 gap-5">{[0, 1, 2].map(item => <div key={item} className="h-36 rounded-xl bg-white" />)}</div>
      </div>
      <dialog ref={dialog} onCancel={event => event.preventDefault()} aria-labelledby="subscription-gate-title" aria-describedby="subscription-gate-description" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-[960px] overflow-y-auto rounded-2xl border border-[#d6e0db] bg-[#f5f7f6] p-5 text-[#202823] shadow-xl backdrop:bg-[#0b3027]/40 backdrop:backdrop-blur-md sm:p-7">
        <div className="flex items-center gap-3"><LockKeyhole className="h-6 w-6 text-[#095F46]" /><h2 id="subscription-gate-title" className="text-2xl font-bold">Your trial has ended</h2></div>
        <p id="subscription-gate-description" className="mt-2 text-sm text-[#56635c]">Choose a paid subscription to continue learning. Your dashboard will unlock when an active paid subscription is confirmed.</p>
        <div className="mt-4"><CurrencySelector /></div>
        {plansError && <p role="alert" className="mt-5">Unable to load plans. Please refresh to retry.</p>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subscriptionPlans.filter(plan => plan.tier === 'Standard').map(standard => (
            <SubscriptionCourseCard key={standard.id} standard={standard} fastTrack={subscriptionPlans.find(plan => plan.course === standard.course && plan.tier === 'Fast Track')!} />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm"><Link href="/student/support?tab=contact" className="font-semibold text-[#095F46] underline">Subscription support</Link><button type="button" onClick={() => logout()} className="text-[#56635c] underline">Log out</button></div>
      </dialog>
    </>
  );
}


function SubscriptionCourseCard({ standard, fastTrack }: {
  standard: SubscriptionPlan;
  fastTrack: SubscriptionPlan;
}) {
  const { format, difference } = usePricingCurrency();
  const [accelerated, setAccelerated] = useState(false);
  const plan = accelerated ? fastTrack : standard;
  return <article className="flex flex-col rounded-xl border border-[#d6e0db] bg-white p-4">
    <span className="text-xs font-semibold text-[#095F46]">{plan.tier}</span>
    <h3 className="mt-1 min-h-12 text-lg font-semibold">{plan.course}</h3>
    <p className="mt-3"><span className="text-2xl font-bold">{format(plan)}</span><span className="text-sm text-[#56635c]"> / month</span></p>
    <p className="mt-1 text-sm text-[#56635c]">{accelerated ? 3 : 2} classes a week · {plan.sessions} per month</p>
    <fieldset className="mt-6 flex-1 border-t border-[#d6e0db] pt-4">
      <legend className="sr-only">Learning pace for {plan.course}</legend>
      <label className="flex cursor-pointer items-center gap-3 py-2">
        <input type="radio" name={`pace-${standard.id}`} checked={!accelerated} onChange={() => setAccelerated(false)} className="h-4 w-4 shrink-0 accent-[#095F46]" />
        <span className="flex-1 text-sm font-semibold">Standard<span className="block text-xs font-normal text-[#56635c]">2 classes a week</span></span>
        <span className="text-xs text-[#56635c]">{format(standard)}/mo</span>
      </label>
      <p className="mb-1 mt-3 text-xs text-[#56635c]">Want an extra class each week?</p>
      <label className="flex cursor-pointer items-center gap-3 py-2">
        <input type="radio" name={`pace-${standard.id}`} checked={accelerated} onChange={() => setAccelerated(true)} className="h-4 w-4 shrink-0 accent-[#095F46]" />
        <span className="flex-1 text-sm font-semibold">Fast Track<span className="block text-xs font-normal text-[#56635c]">3 classes a week</span></span>
        <span className="text-xs font-semibold text-[#095F46]">+{difference(fastTrack, standard)}/mo</span>
      </label>
    </fieldset>
    <Link href={`/student/billing?plan=${plan.id}`} className="mt-5 block rounded-full bg-[#095F46] px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#074c38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46]" aria-label={`Continue with ${plan.course}, ${plan.tier}`}>Select {plan.tier}</Link>
  </article>;
}

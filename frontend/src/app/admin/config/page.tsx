'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useSubscriptionPlans } from '@/lib/subscription-plans';
import { toast } from '@/components/ui/toast';
import { studentUi } from '@/components/student/student-dashboard-ui';

export default function AdminConfigPage() {
  const queryClient = useQueryClient();
  const { data: plans = [], isPending, isError, refetch } = useSubscriptionPlans(false);
  const save = useMutation({
    mutationFn: (prices: { id: string; monthlyUsd: number; monthlyLkr: number }[]) => apiFetch('/subscriptions/plans', { method: 'PATCH', body: JSON.stringify({ prices }) }),
    onSuccess: data => { queryClient.setQueryData(['subscriptionPlans'], data); queryClient.invalidateQueries({ queryKey: ['adminFinance'] }); toast.success('Prices saved', 'Sri Lankan and international prices are now available for new plan selections.'); },
    onError: error => toast.error('Unable to save prices', error.message),
  });
  if (isPending) return <p role="status">Loading configuration…</p>;
  if (isError) return <p role="alert">Unable to load configuration. <button onClick={() => refetch()} className="underline">Retry</button></p>;
  if (!plans.length) return <p>No subscription plans have been configured.</p>;
  return <form key={JSON.stringify(plans)} onSubmit={event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate(plans.map(plan => ({ id: plan.id, monthlyUsd: Number(form.get(`${plan.id}-USD`)), monthlyLkr: Number(form.get(`${plan.id}-LKR`)) })));
  }} className="w-full space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Monthly plan prices</h2><p className="mt-1 text-sm text-[#56635c]">Set Sri Lankan prices in LKR and international prices in USD separately.</p></div><button disabled={save.isPending} className={studentUi.primaryButton}>{save.isPending ? 'Saving…' : 'Save all prices'}</button></div>
    {plans.some(plan => plan.monthlyLkr === null) && <p role="status" className="text-sm text-[#56635c]">Enter the Sri Lankan prices before saving. Local prices are not derived from USD.</p>}
    <section className="grid gap-4 lg:grid-cols-3">
      {plans.filter(plan => plan.tier === 'Standard').map(standard => {
        const accelerated = plans.find(plan => plan.courseId === standard.courseId && plan.tier === 'Fast Track');
        return <article key={standard.id} className="rounded-xl border border-[#d6e0db] bg-white p-4">
          <h3 className="text-lg font-semibold">{standard.course}</h3>
          <div className="mt-4 space-y-5">{[standard, accelerated].filter(plan => !!plan).map(plan => <fieldset key={plan.id}><legend className="text-sm font-semibold">{plan.tier} · {plan.sessions / 4} classes/week</legend><div className="mt-2 grid grid-cols-2 gap-3">{(['LKR', 'USD'] as const).map(code => <label key={code} className="block text-sm text-[#56635c]">{code === 'LKR' ? 'Sri Lanka · LKR' : 'International · USD'}<input name={`${plan.id}-${code}`} aria-label={`${standard.course} ${plan.tier} monthly price in ${code}`} type="number" required min="0.01" max={code === 'LKR' ? '10000000' : '10000'} step="0.01" defaultValue={(code === 'LKR' ? plan.monthlyLkr : plan.monthlyUsd) ?? ''} disabled={save.isPending} className={`${studentUi.field} mt-2`} /></label>)}</div></fieldset>)}</div>
        </article>;
      })}
    </section>
    <p className="text-sm text-[#56635c]">Exchange rates update automatically in the backend. View the rate, its date and converted amounts in Finance.</p>
    <section className="rounded-xl border border-[#d6e0db] bg-white p-5"><h2 className="font-semibold">Session & scheduling rules</h2><dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">{[['Session duration', '40 minutes'], ['Standard sessions', '8 per month'], ['Fast Track sessions', '12 per month'], ['Booking notice', '12 hours'], ['Free rescheduling notice', '12 hours']].map(([label, value]) => <div key={label}><dt className="text-sm text-[#56635c]">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl></section>
  </form>;
}

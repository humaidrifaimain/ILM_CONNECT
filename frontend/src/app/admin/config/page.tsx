'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useSubscriptionPlans } from '@/lib/subscription-plans';
import { toast } from '@/components/ui/toast';
import { usePricingCurrencies } from '@/lib/pricing-currency';
import { studentUi } from '@/components/student/student-dashboard-ui';

export default function AdminConfigPage() {
  const queryClient = useQueryClient();
  const { data: currencies = [], isPending: currenciesPending, isError: currenciesError, refetch: retryCurrencies } = usePricingCurrencies();
  const saveCurrencies = useMutation({
    mutationFn: (rates: { code: string; lkrPerUnit: number; rateDate: string }[]) => apiFetch('/subscriptions/currencies', { method: 'PATCH', body: JSON.stringify({ rates }) }),
    onSuccess: data => { queryClient.setQueryData(['pricingCurrencies'], data); toast.success('Currency rates saved'); },
    onError: error => toast.error('Unable to save currency rates', error.message),
  });
  const { data: plans = [], isPending, isError } = useSubscriptionPlans();
  const save = useMutation({
    mutationFn: (prices: { id: string; monthlyUsd: number }[]) => apiFetch('/subscriptions/plans', { method: 'PATCH', body: JSON.stringify({ prices }) }),
    onSuccess: data => {
      queryClient.setQueryData(['subscriptionPlans'], data);
      toast.success('Prices saved', 'Updated prices are now used by the pricing page and student plan selection.');
    },
    onError: error => toast.error('Unable to save prices', error.message),
  });
  if (isPending) return <p role="status">Loading configuration…</p>;
  if (isError) return <p role="alert">Unable to load configuration. Please refresh to retry.</p>;
  return <div className="space-y-5"><form key={JSON.stringify(plans)} onSubmit={event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate(plans.map(plan => ({ id: plan.id, monthlyUsd: Number(form.get(plan.id)) })));
  }} className="w-full space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#56635c]">Set monthly prices in USD. Changes apply to new plan selections.</p><button disabled={save.isPending} className={studentUi.primaryButton}>{save.isPending ? 'Saving…' : 'Save all prices'}</button></div>
    <section className="grid gap-4 md:grid-cols-3">
      {plans.filter(plan => plan.tier === 'Standard').map(standard => {
        const accelerated = plans.find(plan => plan.courseId === standard.courseId && plan.tier === 'Fast Track')!;
        return <article key={standard.id} className="rounded-xl border border-[#d6e0db] bg-white p-5">
          <h2 className="min-h-12 text-lg font-semibold">{standard.course}</h2>
          <div className="mt-4 space-y-4">{[standard, accelerated].map(plan => <label key={plan.id} className="block text-sm text-[#56635c]">{plan.tier} · {plan.sessions / 4} classes/week<input name={plan.id} aria-label={`${standard.course} ${plan.tier} monthly price in USD`} type="number" required min="0.01" max="10000" step="0.01" defaultValue={plan.monthlyUsd} disabled={save.isPending} className={`${studentUi.field} mt-2`} /></label>)}</div>
        </article>;
      })}
    </section>
    <section className="rounded-xl border border-[#d6e0db] bg-white p-5"><h2 className="font-semibold">Session & scheduling rules</h2><dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">{[['Session duration', '40 minutes'], ['Standard sessions', '8 per month'], ['Fast Track sessions', '12 per month'], ['Booking notice', '12 hours'], ['Free rescheduling notice', '12 hours']].map(([label, value]) => <div key={label}><dt className="text-sm text-[#56635c]">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl></section>
  </form>
    <form key={JSON.stringify(currencies)} onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      saveCurrencies.mutate(currencies.map(item => ({ code: item.code, lkrPerUnit: item.code === 'LKR' ? 1 : Number(form.get(`rate-${item.code}`)), rateDate: String(form.get(`date-${item.code}`)) })));
    }} className="rounded-xl border border-[#d6e0db] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Countries & currencies</h2><button disabled={saveCurrencies.isPending || currencies.length !== 5} className={studentUi.primaryButton}>{saveCurrencies.isPending ? 'Saving…' : 'Save currency rates'}</button></div>
      <p className="mt-2 text-sm text-[#56635c]">Rates are Sri Lankan rupees for one unit of each currency. LKR is fixed at 1. Existing USD plan prices convert through LKR using these saved rates. Update rates and dates as needed; changes apply to displayed prices.</p>
      {currenciesPending && <p role="status">Loading currencies...</p>}
      {currenciesError && <p role="alert">Unable to load currencies. <button type="button" className="underline" onClick={() => retryCurrencies()}>Retry</button></p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{currencies.map(item => <div key={item.code}><h3 className="font-semibold">{item.region} · {item.code}</h3><label className="mt-3 block text-sm text-[#56635c]">LKR for 1 {item.code}<input name={`rate-${item.code}`} type="number" required min="0.000001" max="1000000" step="any" defaultValue={item.lkrPerUnit} readOnly={item.code === 'LKR'} className={`${studentUi.field} mt-1`} /></label><label className="mt-3 block text-sm text-[#56635c]">Rate date<input name={`date-${item.code}`} type="date" required defaultValue={item.rateDate} className={`${studentUi.field} mt-1`} /></label></div>)}</div>
    </form>
  </div>;
}

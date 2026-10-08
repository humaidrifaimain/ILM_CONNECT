'use client';
import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import { useAuth } from './auth-context';
import type { SubscriptionPlan } from './subscription-plans';

export interface PricingCurrency { code: string; region: string; lkrPerUnit: number; rateDate: string; source: string | null; fetchedAt: string | null; available: boolean; stale: boolean; }
export function usePricingCurrencies() {
  return useQuery<PricingCurrency[]>({ queryKey: ['pricingCurrencies'], queryFn: () => apiFetch('/subscriptions/currencies'), staleTime: 0, refetchOnWindowFocus: 'always' });
}
const subscribe = (callback: () => void) => {
  window.addEventListener('ilm-currency', callback);
  window.addEventListener('storage', callback);
  return () => { window.removeEventListener('ilm-currency', callback); window.removeEventListener('storage', callback); };
};
const euroCountries = new Set(['eu', 'europe', 'at', 'austria', 'be', 'belgium', 'bg', 'bulgaria', 'hr', 'croatia', 'cy', 'cyprus', 'ee', 'estonia', 'fi', 'finland', 'fr', 'france', 'de', 'germany', 'gr', 'greece', 'ie', 'ireland', 'it', 'italy', 'lv', 'latvia', 'lt', 'lithuania', 'lu', 'luxembourg', 'mt', 'malta', 'nl', 'netherlands', 'pt', 'portugal', 'sk', 'slovakia', 'si', 'slovenia', 'es', 'spain']);
function currencyForCountry(value: string) {
  const country = value.trim().toLowerCase();
  if (['lk', 'sri lanka'].includes(country)) return 'LKR';
  if (['uk', 'gb', 'united kingdom', 'great britain'].includes(country)) return 'GBP';
  if (['au', 'australia'].includes(country)) return 'AUD';
  return euroCountries.has(country) ? 'EUR' : 'USD';
}
export function usePricingCurrency() {
  const { user } = useAuth();
  const key = `ilm_currency_${user?.id || 'visitor'}`;
  const chosen = useSyncExternalStore(subscribe, () => localStorage.getItem(key), () => null);
  const { data: profile } = useQuery({ queryKey: ['studentProfile'], queryFn: () => apiFetch('/profile/student'), enabled: user?.role === 'STUDENT' });
  const inferred = currencyForCountry(profile?.country || '');
  const code = ['LKR', 'USD', 'GBP', 'EUR', 'AUD'].includes(chosen || '') ? chosen! : inferred;
  const { data: currencies = [], isPending, isError } = usePricingCurrencies();
  const currency = currencies.find(item => item.code === code);
  const amount = (plan: SubscriptionPlan) => plan.prices?.[code] ?? null;
  const formatAmount = (value: number | null) => value === null ? 'Price unavailable' : new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'symbol' }).format(value);
  const format = (plan: SubscriptionPlan) => formatAmount(amount(plan));
  const difference = (higher: SubscriptionPlan, lower: SubscriptionPlan) => {
    const high = amount(higher), low = amount(lower);
    return formatAmount(high === null || low === null ? null : Math.round((high - low) * 100) / 100);
  };
  const select = (value: string) => { localStorage.setItem(key, value); window.dispatchEvent(new Event('ilm-currency')); };
  return { code, currency, currencies, format, amount, difference, select, isPending, isError };
}
export function CurrencySelector() {
  const { code, currencies, select, isPending, isError } = usePricingCurrency();
  return <label className="inline-flex flex-wrap items-center gap-2 text-sm font-medium text-[#095F46]">Country / currency<select aria-label="Country and pricing currency" value={code} onChange={event => select(event.target.value)} disabled={isPending || isError} className="min-h-10 max-w-full rounded-lg border border-[#d6e0db] bg-white px-3 text-[#202823]">{currencies.map(item => <option key={item.code} value={item.code}>{item.region} · {item.code}</option>)}</select>{isError && <span role="alert">Currency rates unavailable</span>}</label>;
}

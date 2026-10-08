'use client';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';

export interface SubscriptionPlan {
  id: string;
  courseId: string;
  course: string;
  tier: string;
  monthlyUsd: number;
  monthlyLkr: number | null;
  prices: Record<string, number | null>;
  sessions: number;
}
export function useSubscriptionPlans(live = true) {
  return useQuery<SubscriptionPlan[]>({
    queryKey: ['subscriptionPlans'],
    queryFn: () => apiFetch('/subscriptions/plans'),
    staleTime: 0,
    refetchOnWindowFocus: live ? 'always' : false,
    refetchInterval: live ? 30000 : false,
  });
}

'use client';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';

export interface SubscriptionPlan {
  id: string;
  courseId: string;
  course: string;
  tier: string;
  monthlyUsd: number;
  sessions: number;
}
export function useSubscriptionPlans() {
  return useQuery<SubscriptionPlan[]>({
    queryKey: ['subscriptionPlans'],
    queryFn: () => apiFetch('/subscriptions/plans'),
    staleTime: 0,
    refetchOnWindowFocus: 'always',
  });
}

'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace('/auth/signin');
    else if (!isAdmin) router.replace(`/${user.role.toLowerCase()}/dashboard`);
  }, [user, isLoading, isAdmin, router]);
  if (isLoading) return <p role="status" className="p-6">Loading your account...</p>;
  if (!isAdmin) return <p role="alert" className="p-6">Administrator access is required.</p>;
  return <DashboardShell>{children}</DashboardShell>;
}

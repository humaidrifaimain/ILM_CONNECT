import { DashboardShell } from '@/components/layout/dashboard-shell';
import { RoleProvider } from '@/lib/role-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <DashboardShell>{children}</DashboardShell>
    </RoleProvider>
  );
}

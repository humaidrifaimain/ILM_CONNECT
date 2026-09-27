import DashboardSidebar from '@/components/layout/dashboard-sidebar';
import { DashboardTopbar } from '@/components/layout/dashboard-nav';
import { RoleProvider } from '@/lib/role-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <div className="flex min-h-screen bg-slate-50/60 text-stone-900">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/60">
          <DashboardTopbar />
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </RoleProvider>
  );
}

'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
interface AuditRecord { id: string; action: string; createdAt: string; entity: string; entityId: string; actor?: { email: string }; }

const actionColors: Record<string, string> = {
  USER_APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SESSION_BOOKED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PAYOUT_INITIATED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SUBSCRIPTION_UPDATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  AVAILABILITY_UPDATED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  USER_SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PASSWORD_CHANGED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  SESSION_NOTES_ADDED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const { data: auditLogs = [], isLoading, isError } = useQuery<AuditRecord[]>({ queryKey: ['adminAudit'], queryFn: () => apiFetch('/admin/audit-logs') });

  const filtered = auditLogs.filter(l => (l.actor?.email || '').toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <input type="text" placeholder="Search by actor or action..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
      </div>

      <div tabIndex={0} role="region" aria-label="Audit records table" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Timestamp</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Actor</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Action</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Resource</th>

            </tr>
          </thead>
          <tbody>
            {(isLoading || isError || filtered.length === 0) && <tr><td colSpan={4} className="p-6 text-center text-sm">{isLoading ? 'Loading audit records…' : isError ? 'Unable to load audit records.' : 'No audit records found.'}</td></tr>}
            {filtered.map((log) => (
              <tr key={log.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.5)]">
                <td className="py-3 px-5 text-xs text-[hsl(var(--muted-foreground))]">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="py-3 px-5 text-sm font-medium">{log.actor?.email || 'Unknown actor'}</td>
                <td className="py-3 px-5">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-5 text-xs text-[hsl(var(--muted-foreground))]">{log.entity}/{log.entityId}</td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

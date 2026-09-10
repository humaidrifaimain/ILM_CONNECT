'use client';

import { useState } from 'react';
import { Search, UserPlus, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/ui/loading-screen';

export default function AdminRequestsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  
  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['supportTickets'],
    queryFn: () => apiFetch('/support/tickets'),
  });

  const filtered = tickets.filter((req: any) => {
    const studentName = req.user?.email || 'Unknown Student';
    const matchSearch = studentName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || req.type === filter;
    return matchSearch && matchFilter;
  });

  const handleResolve = async (id: string) => {
    try {
      await apiFetch(`/support/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      await refetch();
      toast.success('Request Resolved', 'Operational ticket has been marked as resolved.');
    } catch (err: any) {
      toast.error('Resolution Failed', err?.message || 'Failed to resolve request');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Operational Requests</h1>
        <p className="text-[hsl(var(--muted-foreground))]">Manage lecturer assignments and change requests.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input type="text" placeholder="Search requests..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
        </div>
        <div className="flex gap-2">
          {['ALL', 'LECTURER_CHANGE', 'GENERAL_SUPPORT'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${filter === f ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'}`}>
              {f === 'ALL' ? 'All Requests' : f === 'LECTURER_CHANGE' ? 'Change Requests' : 'General'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden overflow-x-auto">
        {isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : (
          <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Student</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Request Type</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Course</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Status</th>
              <th className="text-right py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((req: any) => {
              const studentName = req.user?.email || 'Unknown Student';
              return (
              <tr key={req.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.5)]">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,50%,45%)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {studentName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{studentName}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(req.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-5">
                  <div className="flex items-center gap-1.5">
                    {req.type === 'LECTURER_CHANGE' ? (
                      <><RefreshCw className="h-4 w-4 text-purple-500" /><span className="text-sm font-medium">Lecturer Change</span></>
                    ) : (
                      <><UserPlus className="h-4 w-4 text-blue-500" /><span className="text-sm font-medium">{req.type}</span></>
                    )}
                  </div>
                  {req.reason && <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate max-w-[200px]">"{req.reason}"</div>}
                </td>
                <td className="py-3 px-5">
                  <span className="text-sm">Global Program</span>
                </td>
                <td className="py-3 px-5">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${req.status === 'RESOLVED' ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]' : 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]'}`}>
                    {req.status === 'RESOLVED' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {req.status === 'RESOLVED' ? 'Resolved' : 'Pending'}
                  </span>
                </td>
                <td className="py-3 px-5 text-right">
                  {req.status === 'PENDING' && (
                    <button onClick={() => handleResolve(req.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)] hover:bg-[hsl(var(--primary)/0.05)] transition-colors">
                      Mark Resolved
                    </button>
                  )}
                </td>
              </tr>
            )})}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[hsl(var(--muted-foreground))] text-sm">
                  No requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}

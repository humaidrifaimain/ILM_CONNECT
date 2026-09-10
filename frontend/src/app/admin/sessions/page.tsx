'use client';

import { useState } from 'react';
import { sessions, lecturers, students } from '@/lib/mock-data';
import { Search, Download, Eye, XCircle, AlertTriangle, FileText, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  canceled: { label: 'Canceled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  no_show_student: { label: 'Conducted (Student No-show)', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  no_show_lecturer: { label: 'No-Show (Lecturer)', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

type StatusFilter = 'all' | 'scheduled' | 'completed' | 'canceled' | 'no_show_student' | 'in_progress';

const allSessions = [
  ...sessions,
  { id: 'ss7', studentId: 's7', lecturerId: 'l1', studentName: 'Zainab Patel', lecturerName: 'Sheikh Ahmed Al-Farsi', subject: 'Hifz — Juz 3', startsAt: new Date(Date.now() - 86400000).toISOString(), endsAt: new Date(Date.now() - 86400000 + 2700000).toISOString(), status: 'completed' as const, zoomLink: '', notes: 'Good revision session.' },
  { id: 'ss8', studentId: 's9', lecturerId: 'l1', studentName: 'Khadija Osman', lecturerName: 'Sheikh Ahmed Al-Farsi', subject: 'Tajweed — Makhaarij', startsAt: new Date(Date.now() - 172800000).toISOString(), endsAt: new Date(Date.now() - 172800000 + 2700000).toISOString(), status: 'completed' as const, zoomLink: '' },
  { id: 'ss9', studentId: 's2', lecturerId: 'l4', studentName: 'Omar Malik', lecturerName: 'Maulavi Yusuf Kareem', subject: 'Hifz — Juz 5', startsAt: new Date(Date.now() - 259200000).toISOString(), endsAt: new Date(Date.now() - 259200000 + 2700000).toISOString(), status: 'no_show_student' as const, zoomLink: '' },
  { id: 'ss10', studentId: 's1', lecturerId: 'l3', studentName: 'Aisha Khan', lecturerName: 'Ustadha Fatima Noor', subject: 'Tajweed — Noon Sakinah', startsAt: new Date(Date.now() - 345600000).toISOString(), endsAt: new Date(Date.now() - 345600000 + 2700000).toISOString(), status: 'canceled' as const, zoomLink: '' },
];

const PAGE_SIZE = 25;

export default function AdminSessionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [courseFilter, setCourseFilter] = useState<'all' | 'tajweed' | 'hifz'>('all');
  const [page, setPage] = useState(0);
  const [actionModal, setActionModal] = useState<{ session: typeof allSessions[0]; action: string } | null>(null);

  const filtered = allSessions.filter(s => {
    const matchSearch = s.studentName.toLowerCase().includes(search.toLowerCase()) || s.lecturerName.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchCourse = courseFilter === 'all' || (courseFilter === 'tajweed' && s.subject.toLowerCase().includes('tajweed')) || (courseFilter === 'hifz' && (s.subject.toLowerCase().includes('hifz') || s.subject.toLowerCase().includes('juz') || s.subject.toLowerCase().includes('memoriz')));
    return matchSearch && matchStatus && matchCourse;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportCSV = () => {
    const header = 'Session ID,Date,Student,Lecturer,Subject,Status\n';
    const rows = filtered.map(s => `${s.id},${new Date(s.startsAt).toISOString()},${s.studentName},${s.lecturerName},"${s.subject}",${s.status}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sessions-export.csv'; a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions Management</h1>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input type="text" placeholder="Search by session ID, student, or lecturer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
        </div>
        <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value as any); setPage(0); }} className="px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm">
          <option value="all">All Courses</option><option value="tajweed">Tajweed</option><option value="hifz">Hifz</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['all','scheduled','in_progress','completed','no_show_student','canceled'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'}`}>
            {s === 'all' ? 'All' : s === 'no_show_student' ? 'Conducted No-show' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left py-3 px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">ID</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Date &amp; Time</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Student</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Lecturer</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Subject</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Status</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(s => {
              const cfg = statusConfig[s.status] || statusConfig.scheduled;
              return (
                <tr key={s.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.3)]">
                  <td className="py-3 px-4 text-xs font-mono text-[hsl(var(--muted-foreground))]">{s.id}</td>
                  <td className="py-3 px-4 text-xs">{new Date(s.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {new Date(s.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="py-3 px-4 text-sm font-medium">{s.studentName}</td>
                  <td className="py-3 px-4 text-sm">{s.lecturerName}</td>
                  <td className="py-3 px-4 text-xs truncate max-w-[180px]">{s.subject}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${cfg.color}`}>{cfg.label}</span></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setActionModal({ session: s, action: 'view' })} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]" title="View Details"><Eye className="h-3.5 w-3.5" /></button>
                      {s.status === 'scheduled' && <button onClick={() => setActionModal({ session: s, action: 'cancel' })} className="p-1.5 rounded-lg hover:bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]" title="Cancel"><XCircle className="h-3.5 w-3.5" /></button>}
                      {s.status === 'scheduled' && <button onClick={() => setActionModal({ session: s, action: 'noshow' })} className="p-1.5 rounded-lg hover:bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]" title="Mark No-Show"><AlertTriangle className="h-3.5 w-3.5" /></button>}
                      {s.status === 'completed' && <button onClick={() => setActionModal({ session: s, action: 'notes' })} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]" title="View Notes"><FileText className="h-3.5 w-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium disabled:opacity-50"><ChevronLeft className="h-3 w-3 inline" /> Prev</button>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium disabled:opacity-50">Next <ChevronRight className="h-3 w-3 inline" /></button>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setActionModal(null)}>
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-md w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            {actionModal.action === 'view' && (
              <>
                <h3 className="font-bold text-lg mb-3">Session Details</h3>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">ID</span><span className="font-mono text-xs">{actionModal.session.id}</span></div>
                  <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Student</span><span className="font-medium">{actionModal.session.studentName}</span></div>
                  <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Lecturer</span><span className="font-medium">{actionModal.session.lecturerName}</span></div>
                  <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Subject</span><span>{actionModal.session.subject}</span></div>
                  <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Date</span><span>{new Date(actionModal.session.startsAt).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Status</span><span className={`px-2 py-0.5 text-xs rounded-full font-medium ${(statusConfig[actionModal.session.status] || statusConfig.scheduled).color}`}>{(statusConfig[actionModal.session.status] || statusConfig.scheduled).label}</span></div>
                </div>
              </>
            )}
            {actionModal.action === 'cancel' && (
              <>
                <h3 className="font-bold text-lg mb-2">Cancel Session</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">Cancel session {actionModal.session.id} for {actionModal.session.studentName}?</p>
                <div className="mb-4"><label className="block text-sm font-medium mb-1">Reason</label><textarea rows={2} placeholder="Enter cancellation reason..." className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm" /></div>
                <div className="flex gap-3">
                  <button onClick={() => setActionModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))]">Keep</button>
                  <button onClick={() => setActionModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[hsl(var(--destructive))]">Cancel Session</button>
                </div>
              </>
            )}
            {actionModal.action === 'noshow' && (
              <>
                <h3 className="font-bold text-lg mb-2">Mark Conducted No-Show</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">Who did not attend?</p>
                <div className="flex gap-3 mb-4">
                  <button className="flex-1 py-3 rounded-xl text-sm font-medium border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]">Student</button>
                  <button className="flex-1 py-3 rounded-xl text-sm font-medium border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]">Lecturer</button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setActionModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))]">Cancel</button>
                  <button onClick={() => setActionModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[hsl(var(--warning))]">Confirm</button>
                </div>
              </>
            )}
            {actionModal.action === 'notes' && (
              <>
                <h3 className="font-bold text-lg mb-2">Session Notes</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">{actionModal.session.subject}</p>
                <div className="p-3 rounded-lg bg-[hsl(var(--muted))] text-sm mb-4">{(actionModal.session as any).notes || 'No notes recorded for this session.'}</div>
              </>
            )}
            {(actionModal.action === 'view' || actionModal.action === 'notes') && (
              <button onClick={() => setActionModal(null)} className="w-full py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">Close</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/ui/loading-screen';
import { Search, Download, Eye, XCircle, AlertTriangle, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  canceled: { label: 'Canceled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  no_show_student: { label: 'Conducted (Student No-show)', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  no_show_lecturer: { label: 'No-Show (Lecturer)', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

type StatusFilter = 'all' | 'scheduled' | 'in_progress' | 'completed' | 'no_show_student' | 'canceled';

const PAGE_SIZE = 25;

export default function AdminSessionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [actionModal, setActionModal] = useState<{ session: any; action: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [noShowRole, setNoShowRole] = useState<'student' | 'lecturer'>('student');
  const [isProcessing, setIsProcessing] = useState(false);

  // Live session query connected to real database with 10s auto-refresh
  const { data: rawSessions = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['adminSessions'],
    queryFn: () => apiFetch('/admin/sessions'),
    refetchInterval: 10000,
  });

  const sessionsList = useMemo(() => {
    return (rawSessions || []).map((s: any) => {
      const studentName =
        s.student?.fullName ||
        s.student?.user?.email?.split('@')[0] ||
        s.studentName ||
        'Student';
      const lecturerName =
        s.lecturer?.fullName ||
        s.lecturer?.user?.email?.split('@')[0] ||
        s.lecturerName ||
        'Lecturer';
      const subject =
        s.lesson?.module?.learningPath?.title ||
        s.lesson?.module?.title ||
        s.lesson?.title ||
        s.subject ||
        'Quran Studies';
      const rawStatus = (s.status || 'SCHEDULED').toUpperCase();
      const statusKey = rawStatus.toLowerCase();

      return {
        ...s,
        studentName,
        lecturerName,
        subject,
        status: statusKey,
        rawStatus,
        notesText:
          s.notes?.sharedNotes ||
          s.notes?.internalNotes ||
          s.notes?.topicsCovered ||
          s.notes ||
          '',
      };
    });
  }, [rawSessions]);

  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    sessionsList.forEach((s) => {
      if (s.subject) set.add(s.subject);
    });
    return Array.from(set);
  }, [sessionsList]);

  const filtered = useMemo(() => {
    return sessionsList.filter((s) => {
      const matchSearch =
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.lecturerName.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.subject.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchCourse = courseFilter === 'all' || s.subject === courseFilter;
      return matchSearch && matchStatus && matchCourse;
    });
  }, [sessionsList, search, statusFilter, courseFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportCSV = () => {
    const header = 'Session ID,Date,Student,Lecturer,Subject,Status\n';
    const rows = filtered
      .map(
        (s) =>
          `"${s.id}","${new Date(s.startsAt).toISOString()}","${s.studentName}","${s.lecturerName}","${s.subject}","${s.rawStatus}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sessions-export.csv';
    a.click();
  };

  const handleCancelSession = async () => {
    if (!actionModal?.session?.id) return;
    setIsProcessing(true);
    try {
      await apiFetch(`/bookings/${actionModal.session.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: cancelReason || 'Admin canceled session' }),
      });
      toast.success('Session Canceled', 'The session has been canceled successfully.');
      setActionModal(null);
      setCancelReason('');
      await refetch();
    } catch (err: any) {
      toast.error('Cancellation Failed', err?.message || 'Could not cancel session');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkNoShow = async () => {
    if (!actionModal?.session?.id) return;
    setIsProcessing(true);
    try {
      await apiFetch(`/bookings/${actionModal.session.id}/absent`, {
        method: 'POST',
        body: JSON.stringify({ reason: `Marked absent by Administrator (${noShowRole})` }),
      });
      toast.success('Attendance Recorded', `Session marked as ${noShowRole} absent.`);
      setActionModal(null);
      await refetch();
    } catch (err: any) {
      toast.error('Failed to update status', err?.message || 'Could not update attendance');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sessions Management</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Real-time live view of scheduled, ongoing, and completed student sessions across all scholars.
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search by session ID, student, lecturer, or course..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
        <select
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value);
            setPage(0);
          }}
          className="px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm"
        >
          <option value="all">All Courses / Subjects</option>
          {uniqueCourses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'scheduled', 'in_progress', 'completed', 'no_show_student', 'canceled'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-[hsl(var(--primary))] text-white'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'
            }`}
          >
            {s === 'all'
              ? 'All'
              : s === 'no_show_student'
              ? 'Conducted No-show'
              : s === 'in_progress'
              ? 'In Progress'
              : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto shadow-xs">
        {isLoading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : (
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
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
              {paginated.map((s) => {
                const cfg = statusConfig[s.status] || statusConfig.scheduled;
                return (
                  <tr key={s.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-[hsl(var(--muted-foreground))]" title={s.id}>
                      {s.id.length > 8 ? `${s.id.slice(0, 8)}…` : s.id}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {new Date(s.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ·{' '}
                      {new Date(s.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-[hsl(var(--foreground))]">{s.studentName}</td>
                    <td className="py-3 px-4 text-sm text-[hsl(var(--foreground))]">{s.lecturerName}</td>
                    <td className="py-3 px-4 text-xs truncate max-w-[180px] text-[hsl(var(--muted-foreground))]">{s.subject}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setActionModal({ session: s, action: 'view' })}
                          className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {s.status === 'scheduled' && (
                          <button
                            onClick={() => {
                              setActionModal({ session: s, action: 'cancel' });
                              setCancelReason('');
                            }}
                            className="p-1.5 rounded-lg hover:bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]"
                            title="Cancel Session"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {s.status === 'scheduled' && (
                          <button
                            onClick={() => {
                              setActionModal({ session: s, action: 'noshow' });
                              setNoShowRole('student');
                            }}
                            className="p-1.5 rounded-lg hover:bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]"
                            title="Mark No-Show"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {s.notesText && (
                          <button
                            onClick={() => setActionModal({ session: s, action: 'notes' })}
                            className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                            title="View Notes"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    No sessions found matching current filter or search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[hsl(var(--muted-foreground))] text-xs">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} sessions
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium disabled:opacity-50 hover:bg-[hsl(var(--muted))]"
            >
              <ChevronLeft className="h-3 w-3 inline mr-1" /> Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium disabled:opacity-50 hover:bg-[hsl(var(--muted))]"
            >
              Next <ChevronRight className="h-3 w-3 inline ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => !isProcessing && setActionModal(null)}
        >
          <div
            className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-md w-full p-6 animate-scale-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            {actionModal.action === 'view' && (
              <>
                <h3 className="font-bold text-lg mb-3">Session Details</h3>
                <div className="space-y-2.5 text-sm mb-5 divide-y divide-[hsl(var(--border))]">
                  <div className="flex justify-between pt-1">
                    <span className="text-[hsl(var(--muted-foreground))]">Session ID</span>
                    <span className="font-mono text-xs">{actionModal.session.id}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-[hsl(var(--muted-foreground))]">Student</span>
                    <span className="font-medium text-[hsl(var(--foreground))]">{actionModal.session.studentName}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-[hsl(var(--muted-foreground))]">Lecturer</span>
                    <span className="font-medium text-[hsl(var(--foreground))]">{actionModal.session.lecturerName}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-[hsl(var(--muted-foreground))]">Subject / Course</span>
                    <span className="font-medium text-[hsl(var(--foreground))]">{actionModal.session.subject}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-[hsl(var(--muted-foreground))]">Scheduled Time</span>
                    <span>
                      {new Date(actionModal.session.startsAt).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-[hsl(var(--muted-foreground))]">Status</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                        (statusConfig[actionModal.session.status] || statusConfig.scheduled).color
                      }`}
                    >
                      {(statusConfig[actionModal.session.status] || statusConfig.scheduled).label}
                    </span>
                  </div>
                  {actionModal.session.livekitRoomName && (
                    <div className="flex justify-between pt-2">
                      <span className="text-[hsl(var(--muted-foreground))]">Classroom Room</span>
                      <span className="font-mono text-xs text-[hsl(var(--primary))]">{actionModal.session.livekitRoomName}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {actionModal.action === 'cancel' && (
              <>
                <h3 className="font-bold text-lg mb-2 text-[hsl(var(--destructive))]">Cancel Session</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                  Are you sure you want to cancel the session between <strong>{actionModal.session.studentName}</strong> and{' '}
                  <strong>{actionModal.session.lecturerName}</strong>?
                </p>
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1">Reason for Cancellation</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Scholar requested schedule adjustment..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActionModal(null)}
                    disabled={isProcessing}
                    className="flex-1 py-2 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                  >
                    Keep
                  </button>
                  <button
                    onClick={handleCancelSession}
                    disabled={isProcessing}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-[hsl(var(--destructive))] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Cancel'}
                  </button>
                </div>
              </>
            )}

            {actionModal.action === 'noshow' && (
              <>
                <h3 className="font-bold text-lg mb-2 text-amber-600 dark:text-amber-400">Mark Conducted No-Show</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                  Who failed to attend this scheduled classroom session?
                </p>
                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setNoShowRole('student')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                      noShowRole === 'student'
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                        : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                    }`}
                  >
                    Student Absent
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoShowRole('lecturer')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                      noShowRole === 'lecturer'
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                        : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                    }`}
                  >
                    Lecturer Absent
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActionModal(null)}
                    disabled={isProcessing}
                    className="flex-1 py-2 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMarkNoShow}
                    disabled={isProcessing}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Absent'}
                  </button>
                </div>
              </>
            )}

            {actionModal.action === 'notes' && (
              <>
                <h3 className="font-bold text-lg mb-2">Session Notes</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">{actionModal.session.subject}</p>
                <div className="p-3.5 rounded-xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] text-xs mb-4 max-h-60 overflow-y-auto whitespace-pre-line leading-relaxed">
                  {actionModal.session.notesText || 'No notes recorded for this session.'}
                </div>
              </>
            )}

            {(actionModal.action === 'view' || actionModal.action === 'notes') && (
              <button
                onClick={() => setActionModal(null)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, Shield, UserX, UserCheck, Key, Eye, UserPlus, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState<any>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);
  const [showAddLecturerModal, setShowAddLecturerModal] = useState(false);
  const [addLecturerSuccess, setAddLecturerSuccess] = useState(false);

  // Form states for creating lecturer
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specializations, setSpecializations] = useState('Tajweed, Hifz, Fiqh');
  const [hourlyRate, setHourlyRate] = useState('1250');
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timeshifts: 10 to 2, 2 to 6, and 6 to 10 (slots: 10 to 11, 11 to 12, 12 to 1, 1 to 2, etc.)
  const TIMESHIFTS = [
    {
      id: '10-2',
      name: '10 to 2',
      badge: 'Morning',
      label: '10:00 AM – 02:00 PM',
      slots: [
        { hour: 10, label: '10 to 11', subLabel: '10:00 – 11:00 AM' },
        { hour: 11, label: '11 to 12', subLabel: '11:00 AM – 12:00 PM' },
        { hour: 12, label: '12 to 1', subLabel: '12:00 – 01:00 PM' },
        { hour: 13, label: '1 to 2', subLabel: '01:00 – 02:00 PM' },
      ],
    },
    {
      id: '2-6',
      name: '2 to 6',
      badge: 'Afternoon',
      label: '02:00 PM – 06:00 PM',
      slots: [
        { hour: 14, label: '2 to 3', subLabel: '02:00 – 03:00 PM' },
        { hour: 15, label: '3 to 4', subLabel: '03:00 – 04:00 PM' },
        { hour: 16, label: '4 to 5', subLabel: '04:00 – 05:00 PM' },
        { hour: 17, label: '5 to 6', subLabel: '05:00 – 06:00 PM' },
      ],
    },
    {
      id: '6-10',
      name: '6 to 10',
      badge: 'Evening',
      label: '06:00 PM – 10:00 PM',
      slots: [
        { hour: 18, label: '6 to 7', subLabel: '06:00 – 07:00 PM' },
        { hour: 19, label: '7 to 8', subLabel: '07:00 – 08:00 PM' },
        { hour: 20, label: '8 to 9', subLabel: '08:00 – 09:00 PM' },
        { hour: 21, label: '9 to 10', subLabel: '09:00 – 10:00 PM' },
      ],
    },
  ];

  const formatHourSlot = (h: number) => {
    const start = h > 12 ? h - 12 : h;
    const end = (h + 1) > 12 ? (h + 1) - 12 : (h + 1);
    return `${start} to ${end}`;
  };

  const formatShiftName = (hours: number[]) => {
    if (!Array.isArray(hours) || hours.length === 0) return null;
    const set = new Set(hours.map(Number));
    const is10to2 = [10, 11, 12, 13].every(h => set.has(h)) && hours.length === 4;
    const is2to6 = [14, 15, 16, 17].every(h => set.has(h)) && hours.length === 4;
    const is6to10 = [18, 19, 20, 21].every(h => set.has(h)) && hours.length === 4;
    if (is10to2) return '10 to 2 (10 to 11, 11 to 12, 12 to 1, 1 to 2)';
    if (is2to6) return '2 to 6 (2 to 3, 3 to 4, 4 to 5, 5 to 6)';
    if (is6to10) return '6 to 10 (6 to 7, 7 to 8, 8 to 9, 9 to 10)';
    return hours.map(formatHourSlot).join(', ');
  };

  const [timeshiftHours, setTimeshiftHours] = useState<number[]>([10, 11, 12, 13]);

  // Fetch real users from database
  const { data: dbUsers = [], isLoading, error } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => apiFetch('/admin/users'),
  });

  // Fetch real lecturers from database for assignment
  const { data: dbLecturers = [] } = useQuery({
    queryKey: ['profileLecturers'],
    queryFn: () => apiFetch('/profile/lecturers'),
  });

  const closeModal = useCallback(() => setSelectedStudentForAssignment(null), []);

  useEffect(() => {
    if (!selectedStudentForAssignment) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [selectedStudentForAssignment, closeModal]);

  const handleCreateLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (timeshiftHours.length < 4) {
      setErrorMessage('Please select at least 4 timeshift slots for the lecturer.');
      setIsSubmitting(false);
      return;
    }

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const specs = specializations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await apiFetch('/admin/lecturers', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email: email.trim(),
          password: password.trim() || undefined,
          specializations: specs.length ? specs : ['Quran Recitation'],
          hourlyRate: Number(hourlyRate) || 1250,
          sendInvitationEmail: sendInviteEmail,
          hourlyAvailabilityJson: timeshiftHours,
        }),
      });

      await queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      await queryClient.invalidateQueries({ queryKey: ['profileLecturers'] });
      await queryClient.invalidateQueries({ queryKey: ['adminStats'] });

      setShowAddLecturerModal(false);
      setAddLecturerSuccess(true);
      setTimeout(() => setAddLecturerSuccess(false), 4000);

      // Reset form fields
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setSpecializations('Tajweed, Hifz, Fiqh');
      setTimeshiftHours([10, 11, 12, 13]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create lecturer account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignLecturer = async (lecturerUserId: string) => {
    if (!selectedStudentForAssignment) return;
    try {
      await apiFetch(`/admin/students/${selectedStudentForAssignment.id}/assign-lecturer`, {
        method: 'POST',
        body: JSON.stringify({ lecturerId: lecturerUserId }),
      });

      await queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setAssignmentSuccess(true);
      closeModal();
      setTimeout(() => setAssignmentSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to assign lecturer');
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiFetch(`/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  // Transform and filter real users
  const transformedUsers = dbUsers.map((u: any) => {
    const name =
      u.studentProfile?.fullName ||
      u.lecturerProfile?.fullName ||
      u.email.split('@')[0];
    const roleLower = u.role.toLowerCase();
    const statusLower = u.status.toLowerCase();

    return {
      ...u,
      name,
      roleLower,
      statusLower,
      assignedScholar: u.studentProfile?.assignedLecturer?.fullName,
      specializations: u.lecturerProfile?.specializations,
      timeshift: u.lecturerProfile?.hourlyAvailabilityJson || [],
    };
  });

  const filtered = transformedUsers.filter((u: any) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      roleFilter === 'all' ||
      u.roleLower === roleFilter.toLowerCase();
    return matchSearch && matchRole;
  });

  return (
    <>
      <div className="space-y-6 animate-fade-in p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">User Management</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Live records from PostgreSQL database ({transformedUsers.length} total users)
            </p>
          </div>
          {(roleFilter === 'all' || roleFilter === 'lecturer') && (
            <button
              onClick={() => {
                setErrorMessage(null);
                setShowAddLecturerModal(true);
              }}
              className="px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-xl hover:opacity-90 hover:shadow-lg transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <UserPlus className="h-4 w-4" />
              Add Lecturer
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'student', 'lecturer', 'admin'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  roleFilter === r
                    ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'
                }`}
              >
                {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden overflow-x-auto shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))] flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--primary))]" />
              Loading database users...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-500">
              Failed to load users. Ensure you are logged in as an administrator.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No users found matching your search or filters.
            </div>
          ) : (
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">User</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Role</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Details / Scholar</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Status</th>
                  <th className="text-right py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => (
                  <tr key={u.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.4)] transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,50%,45%)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[hsl(var(--foreground))]">{u.name}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          u.role === 'STUDENT'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : u.role === 'LECTURER'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-xs text-[hsl(var(--muted-foreground))]">
                      {u.role === 'STUDENT' ? (
                        u.assignedScholar ? (
                          <span className="text-[hsl(var(--foreground))] font-medium">Assigned: {u.assignedScholar}</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Unassigned</span>
                        )
                      ) : u.role === 'LECTURER' ? (
                        <div>
                          <div>
                            {Array.isArray(u.specializations)
                              ? u.specializations.join(', ')
                              : 'Quran & Islamic Studies'}
                          </div>
                          {Array.isArray(u.timeshift) && u.timeshift.length > 0 && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                              ⏰ Shift: {formatShiftName(u.timeshift)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span>System Administrator</span>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : u.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.role === 'STUDENT' && (
                          <button
                            onClick={() => setSelectedStudentForAssignment(u)}
                            className="p-1.5 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.2)] transition-colors flex items-center gap-1.5 px-3 mr-1"
                            title="Assign Lecturer"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold hidden md:block">Assign Scholar</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40'
                              : 'hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-950/40'
                          }`}
                          title={u.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                        >
                          {u.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Assign Lecturer Modal */}
      {selectedStudentForAssignment && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeModal}
        >
          <div
            className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-md w-full p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1 text-[hsl(var(--foreground))]">Assign Scholar</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
              Select a vetted scholar for <strong className="text-[hsl(var(--foreground))]">{selectedStudentForAssignment.name}</strong>.
            </p>

            <div className="space-y-2.5 mb-6 max-h-[320px] overflow-y-auto pr-1">
              {dbLecturers.length === 0 ? (
                <div className="text-center py-6 text-sm text-[hsl(var(--muted-foreground))]">
                  No lecturers registered yet. Click &quot;Add Lecturer&quot; first.
                </div>
              ) : (
                dbLecturers.map((l: any) => (
                  <button
                    key={l.userId}
                    onClick={() => handleAssignLecturer(l.userId)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.05)] transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,50%,45%)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {l.fullName?.slice(0, 2).toUpperCase() || 'LC'}
                      </div>
                      <div>
                        <div className="font-semibold text-sm group-hover:text-[hsl(var(--primary))] transition-colors">
                          {l.fullName}
                        </div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">
                          {Array.isArray(l.specializations)
                            ? l.specializations.join(', ')
                            : l.user?.email || 'Scholar'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[hsl(var(--primary))] opacity-0 group-hover:opacity-100 transition-opacity">
                      Select →
                    </span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={closeModal}
              className="w-full py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Lecturer Modal */}
      {showAddLecturerModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => !isSubmitting && setShowAddLecturerModal(false)}
        >
          <div
            className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl max-w-lg w-full p-6 animate-fade-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1 text-[hsl(var(--foreground))]">Create Lecturer Account</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
              Directly onboard a vetted scholar into the database.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateLecturer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-[hsl(var(--foreground))]">First Name</label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    placeholder="e.g. Ahmed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-[hsl(var(--foreground))]">Last Name</label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    placeholder="e.g. Al-Farsi"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[hsl(var(--foreground))]">Email Address</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  placeholder="ahmed.scholar@ilmconnect.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[hsl(var(--foreground))]">
                  Initial Password <span className="text-[hsl(var(--muted-foreground))] font-normal">(Optional, defaults to ilmconnect123)</span>
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  placeholder="ilmconnect123"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[hsl(var(--foreground))]">Specializations (comma separated)</label>
                <input
                  required
                  type="text"
                  value={specializations}
                  onChange={(e) => setSpecializations(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  placeholder="e.g. Tajweed, Hifz, Fiqh"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[hsl(var(--foreground))]">Base Hourly Rate (LKR)</label>
                <input
                  required
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
              </div>

              {/* Timeshift Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))]">
                    Working Timeshift &amp; Slots
                    <span className="ml-1 text-[hsl(var(--muted-foreground))] font-normal">(min. 4 slots required)</span>
                  </label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${timeshiftHours.length >= 4 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'}`}>
                    {timeshiftHours.length} selected {timeshiftHours.length >= 4 ? '✓' : '(min. 4)'}
                  </span>
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-2.5">
                  Lecturer working hours are 10 to 2, 2 to 6, and 6 to 10. Click a shift preset to auto-select its 4 slots, or pick custom slots.
                </p>

                {/* Shift Presets */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {TIMESHIFTS.map((shift) => {
                    const shiftHourVals = shift.slots.map(s => s.hour);
                    const isFullySelected = shiftHourVals.every(h => timeshiftHours.includes(h));
                    return (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => {
                          // Toggle this shift's 4 slots
                          if (isFullySelected) {
                            setTimeshiftHours(timeshiftHours.filter(h => !shiftHourVals.includes(h)));
                          } else {
                            const merged = Array.from(new Set([...timeshiftHours, ...shiftHourVals])).sort((a, b) => a - b);
                            setTimeshiftHours(merged);
                          }
                        }}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                          isFullySelected
                            ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-sm'
                            : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]'
                        }`}
                      >
                        <span className="font-bold">{shift.name}</span>
                        <span className={`text-[10px] ${isFullySelected ? 'text-white/80' : 'text-[hsl(var(--muted-foreground))]'}`}>
                          {shift.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Individual Slots by Shift */}
                <div className="space-y-2.5 bg-[hsl(var(--muted)/0.3)] p-3 rounded-xl border border-[hsl(var(--border))]">
                  {TIMESHIFTS.map((shift) => (
                    <div key={shift.id}>
                      <div className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] mb-1 flex items-center justify-between">
                        <span>{shift.name} ({shift.label})</span>
                        <span className="text-[10px]">
                          {shift.slots.filter(s => timeshiftHours.includes(s.hour)).length}/4 slots
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {shift.slots.map(({ hour, label, subLabel }) => {
                          const isSelected = timeshiftHours.includes(hour);
                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setTimeshiftHours(timeshiftHours.filter(h => h !== hour));
                                } else {
                                  setTimeshiftHours([...timeshiftHours, hour].sort((a, b) => a - b));
                                }
                              }}
                              className={`py-2 px-1.5 rounded-xl border transition-all text-center flex flex-col items-center justify-center ${
                                isSelected
                                  ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-xs'
                                  : 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]'
                              }`}
                            >
                              <span className="text-xs font-bold leading-tight">{isSelected ? '✓ ' : ''}{label}</span>
                              <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[hsl(var(--muted-foreground))]'}`}>{subLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {timeshiftHours.length < 4 && (
                  <p className="text-[11px] text-red-500 dark:text-red-400 mt-1.5 font-medium">
                    ⚠ Please select at least {4 - timeshiftHours.length} more slot{4 - timeshiftHours.length > 1 ? 's' : ''} (minimum 4 slots required)
                  </p>
                )}
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendInviteEmail}
                    onChange={(e) => setSendInviteEmail(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[hsl(var(--border))]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[hsl(var(--foreground))]">Account Activation Notice</div>
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      Mark account as active and ready for immediate login.
                    </div>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowAddLecturerModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[hsl(var(--primary))] text-white hover:opacity-90 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toasts */}
      {assignmentSuccess && (
        <div className="fixed bottom-6 right-6 z-[100] animate-fade-in">
          <div className="px-5 py-3 rounded-xl bg-[hsl(var(--card))] border border-emerald-500/30 shadow-lg flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            Scholar assigned to student successfully in database!
          </div>
        </div>
      )}

      {addLecturerSuccess && (
        <div className="fixed bottom-6 right-6 z-[100] animate-fade-in">
          <div className="px-5 py-3 rounded-xl bg-[hsl(var(--card))] border border-emerald-500/30 shadow-lg flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            Lecturer account created and saved to database!
          </div>
        </div>
      )}
    </>
  );
}

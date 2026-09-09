'use client';

import { useState } from 'react';
import { Search, Eye, GraduationCap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LecturerStudentsPage() {
  const [search, setSearch] = useState('');
  const router = useRouter();

  // Fetch all bookings for this lecturer
  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['lecturerBookings'],
    queryFn: () => apiFetch('/bookings/lecturer'),
  });

  // Fetch all assigned students for this lecturer
  const { data: assignedStudents = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['lecturerAssignedStudents'],
    queryFn: () => apiFetch('/profile/lecturer/students'),
  });

  const isLoading = loadingBookings || loadingStudents;

  // Group bookings by unique student
  const studentsMap = new Map();

  // 1. Initialize with assigned students
  assignedStudents.forEach((st: any) => {
    const sId = st.userId || st.id;
    studentsMap.set(sId, {
      id: sId,
      name: st.fullName || 'Unknown Student',
      email: st.user?.email || '',
      country: st.country || 'Global',
      course: st.currentTier || 'Quran Studies',
      courseTier: st.currentTier || 'Standard',
      sessionsCompleted: 0,
      nextSession: null,
      lastNote: null,
      allBookings: [],
    });
  });

  // 2. Populate and merge bookings
  bookings.forEach((b: any) => {
    if (!b.student) return;
    if (!studentsMap.has(b.studentId)) {
      studentsMap.set(b.studentId, {
        id: b.studentId,
        name: b.student.fullName || 'Unknown Student',
        email: '',
        country: b.student.country || 'Global',
        course: b.lesson?.module?.learningPath?.title || b.student.currentTier || 'Quran Studies',
        courseTier: b.student.currentTier || 'Standard',
        sessionsCompleted: 0,
        nextSession: null,
        lastNote: null,
        allBookings: [],
      });
    }
    const s = studentsMap.get(b.studentId);
    if (b.lesson?.module?.learningPath?.title) {
      s.course = b.lesson.module.learningPath.title;
    }
    if (b.student?.currentTier) {
      s.courseTier = b.student.currentTier;
    }
    s.allBookings.push(b);
    if (b.status === 'COMPLETED') s.sessionsCompleted++;
    if (b.notes) s.lastNote = b.notes;
  });

  const myStudents = Array.from(studentsMap.values()).map(s => {
    // Find next session
    const upcoming = s.allBookings
      .filter((b: any) => b.status === 'SCHEDULED' && new Date(b.startsAt) > new Date())
      .sort((a: any, b: any) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
    
    if (upcoming) {
      s.nextSession = `${new Date(upcoming.startsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${new Date(upcoming.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      s.nextSession = 'None scheduled';
    }
    return s;
  });

  const filtered = myStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.course.toLowerCase().includes(search.toLowerCase()) ||
    s.courseTier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Students</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Track student performance, attendance, quizzes, and learning milestones
          </p>
        </div>
        <div className="text-sm text-[hsl(var(--muted-foreground))]">
          Total Assigned: <span className="font-bold text-[hsl(var(--foreground))]">{myStudents.length}</span>
        </div>
      </div>
      
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <input
          type="text"
          placeholder="Search students, courses, or tiers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        />
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
        <table className="w-full min-w-[750px]">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
              <th className="text-left py-3.5 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Student</th>
              <th className="text-left py-3.5 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Course / Program</th>
              <th className="text-left py-3.5 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Tier</th>
              <th className="text-left py-3.5 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Completed</th>
              <th className="text-left py-3.5 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Next Session</th>
              <th className="text-right py-3.5 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[hsl(var(--muted-foreground))]">
                  Loading student performance list...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <GraduationCap className="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
                  <p className="font-medium">No students found</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">You don't have any students assigned yet.</p>
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,50%,45%)] flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0">
                        {s.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{s.name}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                          {s.email ? `${s.email} · ` : ''}{s.country}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                      {s.course}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                      {s.courseTier}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-sm font-medium">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{s.sessionsCompleted}</span> sessions
                  </td>
                  <td className="py-3.5 px-5 text-xs text-[hsl(var(--muted-foreground))]">
                    {s.nextSession}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => router.push(`/lecturer/students/${s.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-white transition-all cursor-pointer shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Performance</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import {
  ChevronLeft,
  BookOpen,
  Layers,
  Users,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  ShieldCheck,
  Award,
  Sparkles,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  X,
  PlayCircle,
  Download,
  Check,
} from 'lucide-react';

export default function LecturerCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = params.courseId as string;

  const [activeTab, setActiveTab] = useState<'content' | 'permissions' | 'matrix'>('permissions');
  const [studentSearch, setStudentSearch] = useState('');
  const [previewLesson, setPreviewLesson] = useState<any | null>(null);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<any | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch Course with modules and lessons
  const {
    data: course,
    isLoading: loadingCourse,
    error: courseError,
  } = useQuery({
    queryKey: ['curriculumPath', courseId],
    queryFn: () => apiFetch(`/curriculum/paths/${courseId}`),
    enabled: !!courseId,
  });

  // 2. Fetch all assigned students with their current progress
  const {
    data: students = [],
    isLoading: loadingStudents,
  } = useQuery({
    queryKey: ['lecturerStudentsProgress'],
    queryFn: () => apiFetch('/profile/lecturer/students/progress'),
  });

  // Flatten all lessons in order
  const allLessons = useMemo(() => {
    if (!course?.modules) return [];
    const sortedModules = [...course.modules].sort((a, b) => a.orderIndex - b.orderIndex);
    const list: any[] = [];
    sortedModules.forEach((m, mIdx) => {
      const sortedLessons = [...(m.lessons || [])].sort((a, b) => a.orderIndex - b.orderIndex);
      sortedLessons.forEach((l, lIdx) => {
        list.push({
          ...l,
          moduleTitle: m.title,
          moduleIndex: mIdx + 1,
          globalIndex: list.length + 1,
        });
      });
    });
    return list;
  }, [course]);

  // Mutations
  const updateAccessMutation = useMutation({
    mutationFn: ({ studentId, lessonId }: { studentId: string; lessonId: string }) =>
      apiFetch(`/profile/lecturer/students/${studentId}/lesson-access`, {
        method: 'PUT',
        body: JSON.stringify({ lessonId }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lecturerStudentsProgress'] });
      const student = (students as any[]).find(s => (s.userId || s.id) === variables.studentId);
      const lesson = allLessons.find(l => l.id === variables.lessonId);
      showNotification('success', `Access updated for ${student?.fullName || 'Student'} up to "${lesson?.title || 'selected lesson'}"!`);
    },
    onError: () => {
      showNotification('error', 'Failed to update student access. Please try again.');
    },
  });

  const fullAccessMutation = useMutation({
    mutationFn: ({ studentId }: { studentId: string }) =>
      apiFetch(`/profile/lecturer/students/${studentId}/course-access`, {
        method: 'PUT',
        body: JSON.stringify({ learningPathId: courseId }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lecturerStudentsProgress'] });
      const student = (students as any[]).find(s => (s.userId || s.id) === variables.studentId);
      showNotification('success', `Full access granted to ${student?.fullName || 'Student'} for all lessons!`);
    },
    onError: () => {
      showNotification('error', 'Failed to grant full access.');
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: ({ studentId }: { studentId: string }) =>
      apiFetch(`/profile/lecturer/students/${studentId}/revoke-access`, {
        method: 'PUT',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lecturerStudentsProgress'] });
      const student = (students as any[]).find(s => (s.userId || s.id) === variables.studentId);
      showNotification('success', `Access locked/reset for ${student?.fullName || 'Student'}.`);
    },
    onError: () => {
      showNotification('error', 'Failed to revoke access.');
    },
  });

  // Helpers to inspect a student's access level
  const getStudentAccessInfo = (student: any) => {
    const prog = student.progress;
    if (!prog || !prog.currentLessonId) {
      return {
        isFull: false,
        isLocked: true,
        currentLessonId: null,
        currentLessonTitle: 'None (Locked)',
        progressPercentage: 0,
        unlockedCount: 0,
        unlockedLessonIds: new Set<string>(),
      };
    }

    const currentLessonId = prog.currentLessonId;
    const currentLessonIdx = allLessons.findIndex(l => l.id === currentLessonId);

    const unlockedLessonIds = new Set<string>();
    if (currentLessonIdx >= 0) {
      for (let i = 0; i <= currentLessonIdx; i++) {
        unlockedLessonIds.add(allLessons[i].id);
      }
    }

    const isFull = currentLessonIdx === allLessons.length - 1;
    const currentLesson = currentLessonIdx >= 0 ? allLessons[currentLessonIdx] : null;

    return {
      isFull,
      isLocked: false,
      currentLessonId,
      currentLessonTitle: currentLesson ? `Lesson ${currentLesson.globalIndex}: ${currentLesson.title}` : 'Custom Progress',
      progressPercentage: prog.progressPercentage ?? (allLessons.length > 0 ? Math.round(((currentLessonIdx + 1) / allLessons.length) * 100) : 0),
      unlockedCount: unlockedLessonIds.size,
      unlockedLessonIds,
    };
  };

  const filteredStudents = useMemo(() => {
    return (students as any[]).filter(s =>
      (s.fullName || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.user?.email || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.currentTier || '').toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [students, studentSearch]);

  if (loadingCourse) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in p-6">
        <div className="h-8 w-48 bg-[hsl(var(--muted)/0.5)] rounded animate-pulse" />
        <div className="h-32 bg-[hsl(var(--muted)/0.4)] rounded-2xl animate-pulse" />
        <div className="h-64 bg-[hsl(var(--muted)/0.4)] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (courseError || !course) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Course Not Found</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2 mb-6">
          The requested course content does not exist or you do not have permission to view it.
        </p>
        <Link
          href="/lecturer/courses"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-white font-medium text-sm"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Courses
        </Link>
      </div>
    );
  }

  const totalModules = course.modules?.length ?? 0;
  const totalLessons = allLessons.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Top-Right Popup Notification (Below Navigation Bar) */}
      {notification && (
        <div
          className={`fixed top-20 right-6 z-[9999] flex items-start gap-3.5 p-4 rounded-2xl shadow-2xl border backdrop-blur-md max-w-sm w-full transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-100 border-emerald-500/50 shadow-emerald-950/30 ring-1 ring-emerald-500/20'
              : 'bg-rose-950/95 text-rose-100 border-rose-500/50 shadow-rose-950/30 ring-1 ring-rose-500/20'
          }`}
        >
          <div
            className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
              notification.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4
              className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${
                notification.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {notification.type === 'success' ? 'Permission Updated' : 'Action Failed'}
            </h4>
            <p className="text-xs font-medium leading-relaxed opacity-95">
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className={`p-1 rounded-lg transition-colors flex-shrink-0 ${
              notification.type === 'success'
                ? 'text-emerald-400/80 hover:text-emerald-200 hover:bg-white/10'
                : 'text-rose-400/80 hover:text-rose-200 hover:bg-white/10'
            }`}
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
        <Link href="/lecturer/courses" className="hover:text-[hsl(var(--foreground))] transition-colors flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Courses
        </Link>
        <span>/</span>
        <span className="text-[hsl(var(--foreground))] font-medium truncate">{course.title}</span>
      </div>

      {/* Course Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 lg:p-8 shadow-sm">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[hsl(var(--primary)/0.06)] blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
                {course.level || 'Curriculum'}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {course.difficulty || 'All Levels'}
              </span>
              <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 ml-1">
                <Clock className="h-3.5 w-3.5" /> 45 min lessons
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              {course.title}
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              {course.description || 'Comprehensive learning path with interactive lessons and assigned student materials.'}
            </p>

            {course.objectives && (
              <div className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 pt-1">
                <Award className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0" />
                <span><strong className="text-[hsl(var(--foreground))]">Objectives:</strong> {course.objectives}</span>
              </div>
            )}
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-3 gap-3 flex-shrink-0">
            <div className="p-3.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-center min-w-[90px]">
              <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{totalModules}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] font-medium mt-0.5">Modules</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-center min-w-[90px]">
              <div className="text-2xl font-bold text-[hsl(var(--primary))]">{totalLessons}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] font-medium mt-0.5">Lessons</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-center min-w-[90px]">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(students as any[]).length}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] font-medium mt-0.5">Students</div>
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-px">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === 'permissions'
                ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Student Access & Permissions</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
              {(students as any[]).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === 'content'
                ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Course Content & Materials</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              {totalLessons}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === 'matrix'
                ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Access Matrix</span>
          </button>
        </div>

        {activeTab === 'permissions' && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search student..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
            />
          </div>
        )}
      </div>

      {/* TAB 1: PER-STUDENT ACCESS & PERMISSIONS */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 p-4 rounded-xl text-xs text-blue-800 dark:text-blue-300">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                <strong>Separate Student Access Control:</strong> As the lecturer, you have full authority to unlock lessons and materials for each student individually. When you unlock a lesson, the student can immediately access all course materials up to that point.
              </span>
            </div>
          </div>

          {loadingStudents ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-xl bg-[hsl(var(--muted)/0.4)] animate-pulse" />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-[hsl(var(--border))] rounded-2xl">
              <Users className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
              <p className="font-semibold text-base">No students found</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {studentSearch ? 'Try a different search query.' : 'You have no students assigned to your profile.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredStudents.map((student: any) => {
                const sId = student.userId || student.id;
                const access = getStudentAccessInfo(student);
                const isPending =
                  updateAccessMutation.isPending ||
                  fullAccessMutation.isPending ||
                  revokeAccessMutation.isPending;

                return (
                  <div
                    key={sId}
                    className="p-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Student Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,50%,45%)] flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0">
                          {(student.fullName || 'ST').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-[hsl(var(--foreground))] truncate">
                              {student.fullName || 'Student'}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-medium">
                              {student.currentTier || 'Standard'}
                            </span>
                            {access.isFull ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <Unlock className="h-3 w-3" /> All Lessons Unlocked
                              </span>
                            ) : access.isLocked ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                <Lock className="h-3 w-3" /> Access Locked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                <CheckCircle2 className="h-3 w-3" /> {access.unlockedCount} of {totalLessons} Unlocked
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                            {student.user?.email || student.country || 'Assigned Student'} · Current Access: <strong className="text-[hsl(var(--foreground))]">{access.currentLessonTitle}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Quick Action Controls */}
                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        {/* Selector: Grant access up to selected lesson */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-[hsl(var(--muted-foreground))] font-medium whitespace-nowrap">
                            Unlock up to:
                          </label>
                          <select
                            disabled={isPending}
                            value={access.currentLessonId || ''}
                            onChange={e => {
                              if (e.target.value) {
                                updateAccessMutation.mutate({ studentId: sId, lessonId: e.target.value });
                              }
                            }}
                            className="text-xs py-1.5 px-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--foreground))] font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                          >
                            <option value="" disabled>Select Lesson...</option>
                            {allLessons.map(lesson => (
                              <option key={lesson.id} value={lesson.id}>
                                Lesson {lesson.globalIndex}: {lesson.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Button: Unlock All */}
                        <button
                          disabled={isPending || access.isFull}
                          onClick={() => fullAccessMutation.mutate({ studentId: sId })}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            access.isFull
                              ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed opacity-60'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          }`}
                          title="Grant access to all lessons in this course for this student"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          <span>Unlock All</span>
                        </button>

                        {/* Button: Lock / Reset */}
                        <button
                          disabled={isPending || access.isLocked}
                          onClick={() => {
                            if (confirm(`Are you sure you want to lock/reset lesson access for ${student.fullName}?`)) {
                              revokeAccessMutation.mutate({ studentId: sId });
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            access.isLocked
                              ? 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] opacity-40 cursor-not-allowed'
                              : 'border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          }`}
                          title="Lock all materials for this student"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Lock</span>
                        </button>

                        {/* Modal button: Detailed Checklist */}
                        <button
                          onClick={() => setSelectedStudentForModal(student)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                          title="Open detailed lesson-by-lesson permissions modal"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                          <span>Granular View</span>
                        </button>

                        {/* Student Profile Jump */}
                        <Link
                          href={`/lecturer/students/${sId}`}
                          className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                          title="View student profile and sessions"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Progress Bar & Lesson Pill Matrix */}
                    <div className="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[hsl(var(--muted-foreground))]">Course Content Access</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">
                          {access.progressPercentage}% Unlocked
                        </span>
                      </div>
                      <div className="w-full bg-[hsl(var(--muted))] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[hsl(168,65%,40%)] to-[hsl(168,50%,60%)] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${access.progressPercentage}%` }}
                        />
                      </div>

                      {/* Interactive Lesson Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {allLessons.map(lesson => {
                          const isUnlocked = access.unlockedLessonIds.has(lesson.id);
                          const isCurrent = access.currentLessonId === lesson.id;

                          return (
                            <button
                              key={lesson.id}
                              disabled={isPending}
                              onClick={() => updateAccessMutation.mutate({ studentId: sId, lessonId: lesson.id })}
                              title={`Click to set access up to Lesson ${lesson.globalIndex}: ${lesson.title}`}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                                isCurrent
                                  ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-sm ring-2 ring-[hsl(var(--primary)/0.3)]'
                                  : isUnlocked
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100'
                                  : 'bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)] opacity-70'
                              }`}
                            >
                              {isUnlocked ? (
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Lock className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                              )}
                              <span>L{lesson.globalIndex}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COURSE CONTENT & MATERIALS */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Curriculum Structure & Slides</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Review modules, teaching materials, and slide presentations provided for this course.
              </p>
            </div>
            <span className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2.5 py-1 rounded-lg">
              {totalModules} Modules · {totalLessons} Lessons
            </span>
          </div>

          <div className="space-y-6">
            {course.modules?.map((module: any, mIdx: number) => (
              <div
                key={module.id}
                className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-sm"
              >
                {/* Module Header */}
                <div className="bg-[hsl(var(--muted)/0.3)] px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] flex items-center justify-center font-bold text-xs">
                      M{mIdx + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[hsl(var(--foreground))]">{module.title}</h3>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {(module.lessons || []).length} lessons in this module
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lessons in Module */}
                <div className="divide-y divide-[hsl(var(--border))]">
                  {(module.lessons || []).length === 0 ? (
                    <div className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
                      No lessons added to this module yet.
                    </div>
                  ) : (
                    (module.lessons || []).map((lesson: any) => {
                      const globalIdx = allLessons.findIndex(l => l.id === lesson.id) + 1;

                      return (
                        <div
                          key={lesson.id}
                          className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-[hsl(var(--muted)/0.1)] transition-colors"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-[hsl(var(--foreground))]">
                                  Lesson {globalIdx}: {lesson.title}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-medium">
                                  {lesson.durationMinutes || 45} mins
                                </span>
                              </div>
                              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed max-w-xl">
                                {lesson.objectives || 'Objectives and recitation practices for this lesson.'}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setPreviewLesson(lesson)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-xs font-medium transition-colors"
                            >
                              <PlayCircle className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                              <span>Preview Materials</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ACCESS MATRIX (GRID VIEW) */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Permissions Matrix</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Overview of unlocked lessons across all students. Click any cell to toggle access for that student.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="h-3.5 w-3.5" /> Unlocked / Granted
              </span>
              <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                <Lock className="h-3.5 w-3.5" /> Locked
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <th className="py-3 px-4 text-left font-semibold text-[hsl(var(--muted-foreground))] min-w-[180px]">
                    Student
                  </th>
                  {allLessons.map(l => (
                    <th key={l.id} className="py-3 px-3 text-center font-semibold text-[hsl(var(--muted-foreground))] min-w-[70px]">
                      L{l.globalIndex}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right font-semibold text-[hsl(var(--muted-foreground))] min-w-[100px]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {(students as any[]).map(student => {
                  const sId = student.userId || student.id;
                  const access = getStudentAccessInfo(student);

                  return (
                    <tr key={sId} className="hover:bg-[hsl(var(--muted)/0.2)] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[hsl(var(--foreground))]">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center font-bold text-xs">
                            {(student.fullName || 'S').substring(0, 1).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[140px]">{student.fullName}</span>
                        </div>
                      </td>
                      {allLessons.map(lesson => {
                        const isUnlocked = access.unlockedLessonIds.has(lesson.id);
                        return (
                          <td key={lesson.id} className="py-3 px-3 text-center">
                            <button
                              onClick={() => updateAccessMutation.mutate({ studentId: sId, lessonId: lesson.id })}
                              title={`Click to set access up to Lesson ${lesson.globalIndex}`}
                              className={`p-1.5 rounded-lg transition-all ${
                                isUnlocked
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200'
                                  : 'bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground)/0.4)] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
                              }`}
                            >
                              {isUnlocked ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => fullAccessMutation.mutate({ studentId: sId })}
                          className="text-[11px] font-semibold text-[hsl(var(--primary))] hover:underline"
                        >
                          Unlock All
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: GRANULAR PERMISSIONS PER STUDENT */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[hsl(var(--foreground))]">
                  Manage Access: {selectedStudentForModal.fullName}
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Select which lessons this student is permitted to access.
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content: Lessons checklist */}
            <div className="p-5 overflow-y-auto space-y-2 flex-1 divide-y divide-[hsl(var(--border))]">
              {allLessons.map(lesson => {
                const sId = selectedStudentForModal.userId || selectedStudentForModal.id;
                const access = getStudentAccessInfo(selectedStudentForModal);
                const isUnlocked = access.unlockedLessonIds.has(lesson.id);

                return (
                  <div key={lesson.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-[hsl(var(--foreground))] truncate">
                        Lesson {lesson.globalIndex}: {lesson.title}
                      </div>
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        Module: {lesson.moduleTitle}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        updateAccessMutation.mutate({ studentId: sId, lessonId: lesson.id });
                        // Update local modal state
                        setSelectedStudentForModal((prev: any) => ({
                          ...prev,
                          progress: {
                            ...(prev?.progress || {}),
                            currentLessonId: lesson.id,
                          },
                        }));
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isUnlocked
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary))] hover:text-white'
                      }`}
                    >
                      {isUnlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      <span>{isUnlocked ? 'Unlocked' : 'Grant Access'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] flex items-center justify-between">
              <button
                onClick={() => {
                  const sId = selectedStudentForModal.userId || selectedStudentForModal.id;
                  revokeAccessMutation.mutate({ studentId: sId });
                  setSelectedStudentForModal(null);
                }}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
              >
                Reset / Lock All
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const sId = selectedStudentForModal.userId || selectedStudentForModal.id;
                    fullAccessMutation.mutate({ studentId: sId });
                    setSelectedStudentForModal(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                >
                  Grant Full Access
                </button>
                <button
                  onClick={() => setSelectedStudentForModal(null)}
                  className="px-4 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--muted))]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LESSON MATERIALS PREVIEW */}
      {previewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[hsl(var(--foreground))]">
                    {previewLesson.title}
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Slide deck and learning resource preview
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewLesson(null)}
                className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Slide Preview Canvas */}
            <div className="p-6 bg-gradient-to-br from-emerald-950/20 via-[hsl(var(--card))] to-blue-950/20 border-b border-[hsl(var(--border))] flex flex-col items-center justify-center min-h-[220px] text-center">
              <div className="text-4xl mb-3">📖</div>
              <h4 className="text-lg font-bold text-[hsl(var(--foreground))] mb-1">
                {previewLesson.title}
              </h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm">
                {previewLesson.objectives || 'Recitation, pronunciation exercises and vocabulary drills.'}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Interactive Presentation Active
              </div>
            </div>

            <div className="p-4 bg-[hsl(var(--muted)/0.2)] flex items-center justify-between">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                Duration: {previewLesson.durationMinutes || 45} mins
              </span>
              <button
                onClick={() => setPreviewLesson(null)}
                className="px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-white text-xs font-semibold hover:bg-[hsl(var(--primary)/0.9)] transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

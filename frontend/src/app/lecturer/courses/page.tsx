'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import {
  Library,
  BookOpen,
  Users,
  Layers,
  ChevronRight,
  Search,
  GraduationCap,
} from 'lucide-react';

export default function LecturerCoursesPage() {
  const [search, setSearch] = useState('');

  const { data: paths = [], isLoading: loadingPaths } = useQuery({
    queryKey: ['curriculumPaths'],
    queryFn: () => apiFetch('/curriculum/paths'),
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['lecturerStudentsProgress'],
    queryFn: () => apiFetch('/profile/lecturer/students/progress'),
  });

  const isLoading = loadingPaths || loadingStudents;

  const getEnrolledCount = (pathId: string) =>
    (students as any[]).filter(
      (s: any) => !s.progress || s.progress.currentLearningPathId === pathId
    ).length;

  const filtered = (paths as any[]).filter((p: any) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.level ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const difficultyColor = (difficulty: string) => {
    const d = (difficulty ?? '').toLowerCase();
    if (d === 'beginner') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (d === 'intermediate') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Manage course content and control student access to materials
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
          <Users className="h-4 w-4" />
          <span>
            <span className="font-bold text-[hsl(var(--foreground))]">{(students as any[]).length}</span> enrolled students
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Paths', value: (paths as any[]).length, icon: Library, color: 'text-[hsl(var(--primary))]', bg: 'bg-[hsl(var(--primary)/0.08)]' },
          { label: 'My Students', value: (students as any[]).length, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Total Modules', value: (paths as any[]).reduce((a: number, p: any) => a + (p.modules?.length ?? 0), 0), icon: Layers, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: 'Total Lessons', value: (paths as any[]).reduce((a: number, p: any) => a + (p.modules?.reduce((b: number, m: any) => b + (m.lessons?.length ?? 0), 0) ?? 0), 0), icon: BookOpen, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-3 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className={`p-2.5 rounded-lg ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <div className="text-xl font-bold">{isLoading ? '…' : value}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-52 rounded-2xl bg-[hsl(var(--muted)/0.4)] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <GraduationCap className="h-12 w-12 text-[hsl(var(--muted-foreground))] mb-4" />
          <p className="font-semibold text-lg">No courses found</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {search ? 'Try a different search term.' : 'No learning paths are available yet.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((path: any) => {
            const moduleCount = path.modules?.length ?? 0;
            const lessonCount = path.modules?.reduce((a: number, m: any) => a + (m.lessons?.length ?? 0), 0) ?? 0;
            const enrolled = getEnrolledCount(path.id);
            return (
              <div
                key={path.id}
                className="group flex flex-col bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden hover:shadow-lg hover:border-[hsl(var(--primary)/0.4)] transition-all duration-200"
              >
                <div className="h-1.5 bg-gradient-to-r from-[hsl(168,65%,40%)] to-[hsl(168,50%,60%)]" />
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    {path.level && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                        {path.level}
                      </span>
                    )}
                    {path.difficulty && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${difficultyColor(path.difficulty)}`}>
                        {path.difficulty}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.08)] flex-shrink-0 mt-0.5">
                      <Library className="h-5 w-5 text-[hsl(var(--primary))]" />
                    </div>
                    <h2 className="text-base font-bold leading-snug line-clamp-2">{path.title}</h2>
                  </div>
                  {path.description && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 mb-4">
                      {path.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] mt-auto mb-4">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" /> {moduleCount} modules
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> {lessonCount} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-semibold text-[hsl(var(--foreground))]">{enrolled}</span> students
                    </span>
                  </div>
                  <Link
                    href={`/lecturer/courses/${path.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-semibold hover:bg-[hsl(var(--primary)/0.9)] transition-colors"
                  >
                    Manage Content <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

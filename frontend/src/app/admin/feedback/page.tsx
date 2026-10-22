'use client';

import { useState } from 'react';
import { Search, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
interface Feedback { id: string; score: number; comment: string; createdAt: string; student: { fullName: string }; lecturer: { fullName: string }; }
interface LessonNote { id: string; startsAt: string; student: { fullName: string }; lecturer: { fullName: string }; notes: { sharedNotes: string }; }

export default function AdminFeedbackPage() {
  const [search, setSearch] = useState('');
  const { data: feedbacks = [], isLoading, isError } = useQuery<Feedback[]>({ queryKey: ['adminFeedback'], queryFn: () => apiFetch('/admin/feedback') });
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const lessonNotes = useQuery<LessonNote[]>({ queryKey: ['adminLessonNotes'], queryFn: () => apiFetch('/feedbacks/lesson-notes') });

  const filtered = feedbacks.filter(fb => {
    const matchSearch = fb.student.fullName.toLowerCase().includes(search.toLowerCase()) || fb.lecturer.fullName.toLowerCase().includes(search.toLowerCase());
    const matchRating = ratingFilter === 'all' || fb.score === ratingFilter;
    return matchSearch && matchRating;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-[hsl(var(--muted-foreground))]">Monitor session quality and student satisfaction across the platform.</p>
      </div>

      <section aria-labelledby="lecturer-feedback-heading" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <h2 id="lecturer-feedback-heading" className="text-lg font-semibold">Lecturer lesson feedback</h2>
        {lessonNotes.isPending ? <p role="status" className="mt-3 text-sm">Loading lesson feedback…</p>
          : lessonNotes.isError ? <p role="alert" className="mt-3 text-sm">Unable to load lesson feedback. <button type="button" onClick={() => void lessonNotes.refetch()} className="min-h-11 px-3 underline focus-visible:outline-2">Retry</button></p>
          : lessonNotes.data.length === 0 ? <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">No lecturer lesson feedback recorded yet.</p>
          : <div className="mt-4 divide-y divide-[hsl(var(--border))]">{lessonNotes.data.map(item => <article key={item.id} className="py-4 first:pt-0 last:pb-0">
              <h3 className="text-sm font-semibold">{item.student.fullName} · {item.lecturer.fullName}</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{new Date(item.startsAt).toLocaleDateString()}</p>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{item.notes.sharedNotes}</p>
            </article>)}</div>}
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input type="text" placeholder="Search by student or lecturer name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 5, 4, 3, 2, 1] as const).map((r) => (
            <button key={r} onClick={() => setRatingFilter(r)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 ${ratingFilter === r ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'}`}>
              {r === 'all' ? 'All Ratings' : <><Star className="h-3 w-3 fill-current" /> {r} Stars</>}
            </button>
          ))}
        </div>
      </div>

      <div tabIndex={0} role="region" aria-label="Session feedback table" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Date</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Student</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Lecturer</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Rating</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-[hsl(var(--muted-foreground))] w-[40%]">Feedback</th>

            </tr>
          </thead>
          <tbody>
            {filtered.map((fb) => (
              <tr key={fb.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.5)]">
                <td className="py-4 px-5 text-sm text-[hsl(var(--muted-foreground))]">
                  {new Date(fb.createdAt).toLocaleDateString()}
                </td>
                <td className="py-4 px-5">
                  <span className="text-sm font-medium">{fb.student.fullName}</span>
                </td>
                <td className="py-4 px-5">
                  <span className="text-sm">{fb.lecturer.fullName}</span>
                </td>
                <td className="py-4 px-5">
                  <div role="img" aria-label={`${fb.score} out of 5 stars`} className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star aria-hidden="true" key={i} className={`h-4 w-4 ${i < fb.score ? 'fill-amber-400 text-amber-400' : 'text-[hsl(var(--border))]'}`} />
                    ))}
                  </div>
                </td>
                <td className="py-4 px-5">
                  <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-2 hover:line-clamp-none transition-all">{fb.comment}</p>
                </td>

              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[hsl(var(--muted-foreground))] text-sm">
                  {isLoading ? 'Loading feedback…' : isError ? 'Unable to load feedback.' : 'No feedback found matching the filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

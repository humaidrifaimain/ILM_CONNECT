'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
interface Assessment { id: string; title: string; score: number; maxScore: number; feedback: string; courseId?: string; date?: string; }
export default function AssessmentsPage() {
  const { courseId } = useParams();
  const { data: assessments = [], isPending, isError } = useQuery<Assessment[]>({ queryKey: ['studentAssessments'], queryFn: () => apiFetch('/progress/assessments') });
  const visible = assessments.filter(item => !item.courseId || item.courseId === courseId);
  return <section className="w-full rounded-xl border border-[#d6e0db] bg-white p-5"><h2 className="font-semibold">Assessment results</h2>{isPending ? <p role="status" className="mt-3 text-sm">Loading assessments…</p> : isError ? <p role="alert" className="mt-3">Unable to load assessments.</p> : visible.length === 0 ? <p className="mt-3 text-sm text-[#56635c]">No assessments recorded yet. Your lecturer will share results after your lesson.</p> : <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(item => <article key={item.id} className="rounded-lg border border-[#d6e0db] p-4"><h3 className="font-semibold">{item.title}</h3><p className="mt-3 text-2xl font-bold text-[#095F46]">{item.score}/{item.maxScore}</p>{item.feedback && <p className="mt-3 whitespace-pre-wrap text-sm text-[#56635c]">{item.feedback}</p>}{item.date && <p className="mt-3 text-xs text-[#56635c]">{new Date(item.date).toLocaleDateString()}</p>}</article>)}</div>}</section>;
}

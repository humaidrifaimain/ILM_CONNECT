'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';

const questionSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  options: z.array(z.string().trim().min(1).max(500)).length(4),
  correctOption: z.number().int().min(0).max(3),
});
const questionsSchema = z.array(questionSchema).min(1).max(100);
type Question = z.infer<typeof questionSchema>;
type Assessment = { id: string; title: string; questions: Question[]; createdAt: string };
const blankQuestion = (): Question => ({ prompt: '', options: ['', '', '', ''], correctOption: 0 });
const inputClass = 'w-full rounded-md border border-[#7e9187] bg-white px-3 py-2 text-sm text-[#0b3027] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46]';
const buttonClass = 'min-h-11 rounded-md border border-[#7e9187] px-4 py-2 text-sm font-semibold hover:bg-[#f0f5f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46] disabled:opacity-50';

export function CourseAssessments({ courseId }: { courseId: string }) {
  const client = useQueryClient();
  const endpoint = `/curriculum/paths/${courseId}/assessments`;
  const queryKey = ['courseAssessments', courseId];
  const { data = [], isPending, isError, refetch } = useQuery<Assessment[]>({ queryKey, queryFn: () => apiFetch(endpoint) });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([blankQuestion()]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(false);
  const save = useMutation({
    mutationFn: (body: { title: string; questions: Question[] }) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (assessment: Assessment) => {
      client.setQueryData<Assessment[]>(queryKey, previous => [assessment, ...(previous || [])]);
      setEditing(false); setTitle(''); setQuestions([blankQuestion()]); setPreview(false);
      setNotice(`Saved “${assessment.title}” with ${assessment.questions.length} MCQs.`);
    },
    onError: (failure: Error) => setError(failure.message),
  });
  const updateQuestion = (index: number, change: Partial<Question>) => {
    setQuestions(previous => previous.map((question, i) => i === index ? { ...question, ...change } : question));
    setError('');
  };
  const validate = () => {
    const parsed = questionsSchema.safeParse(questions);
    if (!title.trim() || title.trim().length > 160) { setError('Enter an assessment title (up to 160 characters).'); return null; }
    if (!parsed.success) { setError('Complete every question and all four options, then choose the correct answer.'); return null; }
    setError(''); return { title: title.trim(), questions: parsed.data };
  };

  return <section aria-label="Course assessments" className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold">Assessments</h2><p className="mt-1 text-sm text-[#56635c]">Create and save multiple-choice question sets for this course.</p></div>
      {!editing && <button className={`${buttonClass} bg-[#095F46] text-white hover:bg-[#074c38]`} onClick={() => { setEditing(true); setNotice(''); setError(''); }}>Create assessment</button>}
    </div>
    {notice && <p role="status" className="text-sm text-[#095F46]">{notice}</p>}
    {editing && <form onSubmit={event => { event.preventDefault(); const body = validate(); if (body) save.mutate(body); }} className="space-y-5 rounded-lg border border-[#d6e0db] bg-white p-4 sm:p-5">
      <label className="block text-sm font-semibold">Assessment title<input className={`${inputClass} mt-2`} maxLength={160} value={title} onChange={event => setTitle(event.target.value)} disabled={save.isPending} /></label>
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${buttonClass} cursor-pointer`}>Import MCQs (.json)<input type="file" accept=".json,application/json" className="block max-w-full mt-2 text-xs" disabled={save.isPending} onChange={async event => {
          const file = event.target.files?.[0]; if (!file) return;
          try {
            if (file.size > 1024 * 1024) throw new Error('Choose a JSON file smaller than 1 MB.');
            const imported = questionsSchema.safeParse(JSON.parse(await file.text()));
            if (!imported.success) throw new Error('Invalid file. Each question needs a prompt, four non-empty options, and correctOption from 0 to 3.');
            setQuestions(imported.data); setPreview(false); setError(''); setNotice(`Imported ${imported.data.length} MCQs. Review them before saving.`);
          } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to import this file.'); }
          event.target.value = '';
        }} /></label>
        <button type="button" className={buttonClass} onClick={() => {
          const blob = new Blob([JSON.stringify(Array.from({ length: 10 }, blankQuestion), null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = '10-mcq-template.json'; link.click(); URL.revokeObjectURL(url);
        }}>Download 10-MCQ template</button>
      </div>
      <p className="text-xs text-[#56635c]">Fill in the template before importing. correctOption uses 0 for A, 1 for B, 2 for C, and 3 for D.</p>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{questions.length} MCQ{questions.length === 1 ? '' : 's'}</h3><button type="button" className={buttonClass} disabled={save.isPending} onClick={() => { if (preview) setPreview(false); else if (validate()) setPreview(true); }}>{preview ? 'Edit questions' : 'Preview assessment'}</button></div>
      <fieldset disabled={save.isPending} className="space-y-4">
        {questions.map((question, index) => <div key={index} className="rounded-md border border-[#d6e0db] p-4">
          {preview ? <><h4 className="font-semibold break-words">{index + 1}. {question.prompt}</h4><ol className="mt-3 space-y-2">{question.options.map((option, optionIndex) => <li key={optionIndex} className="break-words text-sm">{String.fromCharCode(65 + optionIndex)}. {option}{optionIndex === question.correctOption && <strong className="ml-2 text-[#095F46]">(Correct answer)</strong>}</li>)}</ol></> : <>
            <div className="flex items-center justify-between gap-2"><label htmlFor={`question-${index}`} className="text-sm font-semibold">Question {index + 1}</label><button type="button" className={buttonClass} disabled={questions.length === 1} onClick={() => setQuestions(previous => previous.filter((_, i) => i !== index))}>Remove question {index + 1}</button></div>
            <textarea id={`question-${index}`} className={`${inputClass} mt-2`} rows={2} maxLength={2000} value={question.prompt} onChange={event => updateQuestion(index, { prompt: event.target.value })} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="text-sm">Option {String.fromCharCode(65 + optionIndex)}<input aria-label={`Question ${index + 1} option ${String.fromCharCode(65 + optionIndex)}`} className={`${inputClass} mt-1`} maxLength={500} value={option} onChange={event => updateQuestion(index, { options: question.options.map((text, i) => i === optionIndex ? event.target.value : text) })} /></label>)}</div>
            <label className="mt-3 block text-sm">Correct answer<select aria-label={`Question ${index + 1} correct answer`} className={`${inputClass} mt-1`} value={question.correctOption} onChange={event => updateQuestion(index, { correctOption: Number(event.target.value) })}>{question.options.map((_, i) => <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>)}</select></label>
          </>}
        </div>)}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {!preview && <button type="button" className={buttonClass} disabled={questions.length >= 100 || save.isPending} onClick={() => setQuestions(previous => [...previous, blankQuestion()])}>Add question</button>}
        <button type="submit" className={`${buttonClass} bg-[#095F46] text-white hover:bg-[#074c38]`} disabled={save.isPending}>{save.isPending ? 'Saving assessment…' : 'Save assessment'}</button>
        <button type="button" className={buttonClass} disabled={save.isPending} onClick={() => { setEditing(false); setPreview(false); setError(''); }}>Close editor</button>
      </div>
    </form>}
    {isPending ? <p role="status">Loading assessments…</p> : isError ? <div role="alert"><p>Unable to load assessments.</p><button className={`${buttonClass} mt-2`} onClick={() => refetch()}>Try again</button></div> : data.length === 0 ? <p className="rounded-lg border border-dashed border-[#bac9c1] p-6 text-sm text-[#56635c]">No assessments yet. Create a question set or import your MCQs.</p> : <div className="divide-y divide-[#d6e0db] rounded-lg border border-[#d6e0db]">{data.map(assessment => <details key={assessment.id} className="p-4"><summary className="cursor-pointer break-words font-semibold focus-visible:outline-2 focus-visible:outline-[#095F46]">{assessment.title}<span className="ml-3 text-sm font-normal text-[#56635c]">{assessment.questions.length} MCQs</span></summary><ol className="mt-4 space-y-4">{assessment.questions.map((question, index) => <li key={index}><p className="break-words font-semibold">{index + 1}. {question.prompt}</p>{question.options.map((option, i) => <p key={i} className="mt-1 break-words text-sm">{String.fromCharCode(65 + i)}. {option}{i === question.correctOption && <strong className="ml-2 text-[#095F46]">(Correct answer)</strong>}</p>)}</li>)}</ol></details>)}</div>}
  </section>;
}

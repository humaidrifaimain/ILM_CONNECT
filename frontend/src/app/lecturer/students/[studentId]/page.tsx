'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  Globe,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
  TrendingUp,
  Star,
  Award,
  FileText,
  Video,
  Target,
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
  Layers,
  BarChart3,
  ClipboardList,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-[hsl(var(--muted-foreground))]">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function SessionRow({ session, isCompleted }: { session: any; isCompleted?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasNotes = !!session.notes;
  const isStudentNoShow = session.status === 'NO_SHOW_STUDENT';

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
      <button
        onClick={() => hasNotes && setExpanded(!expanded)}
        className={`w-full flex items-center gap-4 p-4 text-left ${hasNotes ? 'cursor-pointer hover:bg-[hsl(var(--muted)/0.4)]' : 'cursor-default'} transition-colors`}
      >
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
          <Video className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{session.lesson?.title || session.notes?.topicsCovered || 'Quran Session'}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            {new Date(session.startsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}
            {new Date(session.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {session.lesson?.module && <div className="text-xs text-[hsl(var(--primary))] mt-0.5">{session.lesson.module.title}</div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isStudentNoShow && (
            <div className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-semibold">
              Conducted No-show
            </div>
          )}
          {session.rating && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <Star className="h-3 w-3" />{session.rating.score}/5
            </div>
          )}
          {session.notes && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-semibold">
              <FileText className="h-3 w-3" />{session.notes.studentProgressRating}/5
            </div>
          )}
          {hasNotes && (expanded ? <ChevronUp className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /> : <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />)}
        </div>
      </button>
      {expanded && session.notes && (
        <div className="px-4 pb-4 space-y-3 border-t border-[hsl(var(--border))] pt-4 bg-[hsl(var(--muted)/0.2)]">
          {session.notes.topicsCovered && (
            <div>
              <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">Topics Covered</div>
              <p className="text-sm">{session.notes.topicsCovered}</p>
            </div>
          )}
          {session.notes.homework && (
            <div>
              <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">Homework</div>
              <p className="text-sm">{session.notes.homework}</p>
            </div>
          )}
          {session.notes.sharedNotes && (
            <div>
              <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">Notes for Student</div>
              <p className="text-sm">{session.notes.sharedNotes}</p>
            </div>
          )}
          {session.notes.internalNotes && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Internal Notes (Private)</div>
              <p className="text-sm">{session.notes.internalNotes}</p>
            </div>
          )}
          {session.rating && (
            <div>
              <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">Student Feedback</div>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i <= session.rating.score ? 'text-amber-400 fill-amber-400' : 'text-[hsl(var(--muted-foreground)/0.3)]'}`} />
                  ))}
                </div>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{session.rating.comment}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex justify-between text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
          <span className="font-semibold">{Math.round(value)}%</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-[hsl(var(--muted)/0.5)] overflow-hidden">
        <div className="h-full rounded-full bg-[hsl(var(--primary))] transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count }: { icon: any; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="h-8 w-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
        <Icon className="h-4 w-4 text-[hsl(var(--primary))]" />
      </div>
      <h2 className="text-base font-bold">{title}</h2>
      {count !== undefined && (
        <span className="ml-auto px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-xs font-semibold">{count}</span>
      )}
    </div>
  );
}

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params?.studentId as string;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lecturerStudentDetail', studentId],
    queryFn: () => apiFetch(`/profile/lecturer/students/${studentId}`),
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading student profile...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <XCircle className="h-10 w-10 text-[hsl(var(--destructive))]" />
        <p className="font-medium">Student not found</p>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">This student may not be assigned to you.</p>
        <Link href="/lecturer/students" className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline">
          Back to Students
        </Link>
      </div>
    );
  }

  const { profile, stats, upcomingSessions, completedSessions, canceledSessions, progressReports } = data;
  const sub = profile.subscriptions?.[0];
  const progress = profile.progress;
  const initials = profile.fullName?.substring(0, 2).toUpperCase() || '??';
  const assessments = data.assessments?.length
    ? data.assessments
    : (progressReports || []).flatMap((r: any) => r.contentJson?.assessments || []);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <Link href="/lecturer/students" className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Students
      </Link>

      {/* Profile Header */}
      <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-60 bg-gradient-to-bl from-[hsl(var(--primary)/0.06)] to-transparent pointer-events-none rounded-bl-full" />
        <div className="flex items-start gap-5">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,50%,45%)] flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-lg">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold mb-1">{profile.fullName}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-[hsl(var(--muted-foreground))]">
              {profile.user?.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{profile.user.email}</span>}
              {profile.country && <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{profile.country}</span>}
              {profile.timezone && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{profile.timezone}</span>}
              {profile.user?.createdAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {new Date(profile.user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">{profile.currentTier || 'FREE'} Tier</span>
              {profile.preferredLanguage && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300">{profile.preferredLanguage}</span>}
              {sub && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sub.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>
                  Subscription: {sub.status}
                </span>
              )}
            </div>
            {profile.learningGoals && (
              <div className="mt-3 p-3 rounded-xl bg-[hsl(var(--muted)/0.4)] text-sm">
                <span className="font-semibold text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Learning Goals · </span>
                {profile.learningGoals}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Total Sessions" value={stats.totalSessions} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completedCount} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={Clock} label="Upcoming" value={stats.upcomingCount} color="bg-amber-500/10 text-amber-700 dark:text-amber-400" />
        <StatCard icon={Star} label="Avg Progress Rating" value={stats.avgStudentRating ? `${stats.avgStudentRating}/5` : '—'} color="bg-purple-500/10 text-purple-600 dark:text-purple-400" />
      </div>

      {/* Curriculum Progress */}
      {progress && (
        <div className="p-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <SectionHeader icon={TrendingUp} title="Curriculum Progress" />
          <ProgressBar value={stats.progressPercentage} label="Overall Progress" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))]">
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Learning Path</div>
              <div className="text-sm font-semibold">{progress.currentLearningPath?.title || '—'}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">{progress.currentLearningPath?.level}</div>
            </div>
            <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))]">
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Current Module</div>
              <div className="text-sm font-semibold">{progress.currentModule?.title || 'Not started'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))]">
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Current Lesson</div>
              <div className="text-sm font-semibold">{progress.currentLesson?.title || 'Not started'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionHeader icon={Clock} title="Upcoming Sessions" count={upcomingSessions.length} />
          {upcomingSessions.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-[hsl(var(--border))] text-center text-sm text-[hsl(var(--muted-foreground))]">No upcoming sessions scheduled.</div>
          ) : (
            <div className="space-y-3">{upcomingSessions.map((s: any) => <SessionRow key={s.id} session={s} />)}</div>
          )}
        </div>
        <div className="space-y-5">
          <div className="p-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <SectionHeader icon={BarChart3} title="Subscription" />
            {sub ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Tier</span><span className="font-semibold">{sub.tier}</span></div>
                <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Status</span><span className={`font-semibold ${sub.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>{sub.status}</span></div>
                <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Expires</span><span className="font-semibold">{new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
              </div>
            ) : <p className="text-xs text-[hsl(var(--muted-foreground))]">No active subscription.</p>}
          </div>
          <div className="p-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <SectionHeader icon={Award} title="Certificates" count={profile.certificates?.length} />
            {profile.certificates?.length === 0 ? (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">No certificates earned yet.</p>
            ) : (
              <div className="space-y-2">
                {profile.certificates.map((cert: any) => (
                  <div key={cert.id} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="text-sm font-semibold">{cert.learningPath?.title}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">Issued {new Date(cert.issuedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                    {cert.performanceSummary && <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">{cert.performanceSummary}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completed Sessions */}
      <div>
        <SectionHeader icon={CheckCircle2} title="Completed Sessions" count={completedSessions.length} />
        {completedSessions.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-[hsl(var(--border))] text-center text-sm text-[hsl(var(--muted-foreground))]">No completed sessions yet.</div>
        ) : (
          <div className="space-y-3">{completedSessions.map((s: any) => <SessionRow key={s.id} session={s} isCompleted />)}</div>
        )}
      </div>

      {/* Quizzes & Assessments */}
      <div>
        <SectionHeader icon={ClipboardList} title="Quizzes & Assessments" count={assessments.length} />
        {assessments.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/0.5)] text-center">
            <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="h-6 w-6 text-[hsl(var(--primary))]" />
            </div>
            <p className="text-sm font-medium mb-1">No assessments recorded</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-xs mx-auto">
              Quiz and assessment results will appear here once assigned through the lesson curriculum.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.map((a: any, idx: number) => {
              const scorePercent = Math.round((a.score / (a.maxScore || 100)) * 100);
              const isHigh = scorePercent >= 90;
              const isMedium = scorePercent >= 75 && scorePercent < 90;
              return (
                <div key={a.id || idx} className="p-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                        {a.type || 'Assessment'}
                      </span>
                      <h3 className="font-semibold text-sm mt-1.5">{a.title}</h3>
                      {a.date && (
                        <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                          {new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                        isHigh
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : isMedium
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {a.score}/{a.maxScore || 100} {a.grade && `· ${a.grade}`}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                      <span>Score</span>
                      <span className="font-semibold">{scorePercent}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHigh ? 'bg-emerald-500' : isMedium ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                  </div>

                  {a.remarks && (
                    <div className="p-2.5 rounded-xl bg-[hsl(var(--muted)/0.4)] text-xs border border-[hsl(var(--border))]">
                      <span className="font-semibold text-[hsl(var(--foreground))]">Scholar Remarks: </span>
                      <span className="text-[hsl(var(--muted-foreground))]">{a.remarks}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress Reports */}
      {progressReports?.length > 0 && (
        <div>
          <SectionHeader icon={FileText} title="Monthly Progress Reports" count={progressReports.length} />
          <div className="space-y-4">
            {progressReports.map((r: any) => {
              const c = typeof r.contentJson === 'string' ? null : r.contentJson;
              return (
                <div key={r.id} className="p-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))] font-bold text-xs">
                        {r.periodMonth?.substring(0, 3).toUpperCase() || 'REP'}
                      </div>
                      <div>
                        <div className="text-sm font-bold">Progress Report · {r.periodMonth}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">
                          Issued {new Date(r.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    {c?.overallGrade && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                        Grade: {c.overallGrade}
                      </span>
                    )}
                  </div>

                  {c ? (
                    <div className="space-y-3 pt-2 text-sm">
                      {c.summary && <p className="text-[hsl(var(--foreground))] leading-relaxed">{c.summary}</p>}

                      {c.memorizationMilestone && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                          <Award className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-amber-800 dark:text-amber-300">Milestone: </span>
                            <span className="text-amber-700 dark:text-amber-400">{c.memorizationMilestone}</span>
                          </div>
                        </div>
                      )}

                      {c.strengths && c.strengths.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5">Key Strengths</div>
                          <div className="flex flex-wrap gap-1.5">
                            {c.strengths.map((s: string, sIdx: number) => (
                              <span key={sIdx} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-500/15">
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {c.improvements && c.improvements.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5">Areas for Focus</div>
                          <div className="flex flex-wrap gap-1.5">
                            {c.improvements.map((imp: string, iIdx: number) => (
                              <span key={iIdx} className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-500/15">
                                ⚠ {imp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {c.recommendations && (
                        <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.4)] text-xs border border-[hsl(var(--border))]">
                          <span className="font-semibold text-[hsl(var(--foreground))]">Scholar Recommendation: </span>
                          <span className="text-[hsl(var(--muted-foreground))]">{c.recommendations}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{typeof r.contentJson === 'string' ? r.contentJson : JSON.stringify(r.contentJson, null, 2)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Canceled Sessions */}
      {canceledSessions.length > 0 && (
        <div>
          <SectionHeader icon={XCircle} title="Canceled Sessions" count={canceledSessions.length} />
          <div className="space-y-2">
            {canceledSessions.map((s: any) => (
              <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0"><XCircle className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.notes?.topicsCovered || 'Session'}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(s.startsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-400">
                  Canceled
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

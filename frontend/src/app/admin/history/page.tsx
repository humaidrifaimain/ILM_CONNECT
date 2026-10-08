'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { HistoryData, HistoryUser } from '@/lib/admin-history';

const button =
  'min-h-11 rounded-lg border border-[#d6e0db] px-4 py-2 text-sm font-semibold hover:bg-[#eef4f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46]';
const date = (value?: string) =>
  value
    ? new Date(value).toLocaleString('en-GB', {
        timeZone: 'Asia/Colombo',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not recorded';
const money = (value: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value);
const status = (value: string) => value.replaceAll('_', ' ').toLowerCase();

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-xl border border-[#d6e0db] bg-white p-4 sm:p-5"
    >
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[#56635c]">{children}</p>;
}
function Fact({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-[#56635c]">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words font-medium">
        {value || 'Not recorded'}
      </dd>
    </div>
  );
}
function RecordContent({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span>Not recorded</span>;
  if (Array.isArray(value))
    return value.length ? (
      <ul className="space-y-3">
        {value.map((item, index) => (
          <li key={index}>
            <RecordContent value={item} />
          </li>
        ))}
      </ul>
    ) : (
      <span>None recorded</span>
    );
  if (typeof value === 'object')
    return (
      <dl className="space-y-2">
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt className="font-semibold capitalize">
              {key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')}
            </dt>
            <dd className="whitespace-pre-wrap break-words">
              <RecordContent value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return <span>{String(value)}</span>;
}

export default function AdminHistoryPage() {
  const [role, setRole] = useState<'STUDENT' | 'LECTURER'>('STUDENT');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const users = useQuery<HistoryUser[]>({
    queryKey: ['adminHistoryDirectory', role],
    queryFn: () => apiFetch(`/admin/users?role=${role}`),
  });
  const history = useQuery<HistoryData>({
    queryKey: ['adminHistory', selectedId],
    queryFn: () => apiFetch(`/admin/users/${encodeURIComponent(selectedId!)}/history`),
    enabled: !!selectedId,
    refetchInterval: 30000,
  });
  const visible = (users.data || []).filter((user) =>
    `${user.studentProfile?.fullName || user.lecturerProfile?.fullName || ''} ${user.email}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  function changeRole(next: typeof role) {
    setRole(next);
    setSelectedId(null);
    setSearch('');
  }

  return (
    <div className="space-y-5 text-[#202823]">
      <header>
        <h1 className="text-2xl font-bold">People &amp; History</h1>
        <p className="mt-1 text-sm text-[#56635c]">
          Student learning and billing records, and lecturer teaching and payout records.
        </p>
      </header>
      <div role="tablist" aria-label="People" className="flex gap-2">
        {(['STUDENT', 'LECTURER'] as const).map((item, index) => (
          <button
            key={item}
            id={`tab-${item}`}
            role="tab"
            aria-selected={role === item}
            aria-controls="people-panel"
            tabIndex={role === item ? 0 : -1}
            onClick={() => changeRole(item)}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 'STUDENT'
                    : event.key === 'End'
                      ? 'LECTURER'
                      : index === 0
                        ? 'LECTURER'
                        : 'STUDENT';
                changeRole(next);
                document.getElementById(`tab-${next}`)?.focus();
              }
            }}
            className={`${button} ${role === item ? 'border-[#095F46] bg-[#095F46] text-white hover:bg-[#074c38]' : 'bg-white'}`}
          >
            {item === 'STUDENT' ? 'Students' : 'Lecturers'}
          </button>
        ))}
      </div>
      <div
        id="people-panel"
        role="tabpanel"
        aria-labelledby={`tab-${role}`}
        className="grid min-w-0 items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]"
      >
        <section
          aria-label={role === 'STUDENT' ? 'Student directory' : 'Lecturer directory'}
          className="min-w-0 rounded-xl border border-[#d6e0db] bg-white p-4"
        >
          <label className="text-sm font-semibold" htmlFor="history-search">
            Search {role === 'STUDENT' ? 'students' : 'lecturers'}
          </label>
          <input
            id="history-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email"
            className="mt-2 min-h-11 w-full rounded-lg border border-[#b5c2ba] px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#095F46]"
          />
          {users.isPending ? (
            <p role="status" className="mt-4">
              Loading people...
            </p>
          ) : users.isError ? (
            <div role="alert" className="mt-4">
              <p>Unable to load people.</p>
              <button className={`${button} mt-2`} onClick={() => users.refetch()}>
                Retry directory
              </button>
            </div>
          ) : (
            <>
              <p className="my-3 text-sm text-[#56635c]">
                {visible.length} {visible.length === 1 ? 'person' : 'people'}
              </p>
              <ul className="max-h-[32rem] space-y-1 overflow-y-auto">
                {visible.map((user) => (
                  <li key={user.id}>
                    <button
                      aria-pressed={selectedId === user.id}
                      onClick={() => setSelectedId(user.id)}
                      className={`w-full rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-[#095F46] ${selectedId === user.id ? 'border-[#095F46] bg-[#eef4f1]' : 'border-transparent hover:bg-[#f5f7f6]'}`}
                    >
                      <span className="block break-words font-semibold">
                        {user.studentProfile?.fullName ||
                          user.lecturerProfile?.fullName ||
                          user.email}
                      </span>
                      <span className="block break-all text-sm text-[#56635c]">{user.email}</span>
                      <span className="mt-1 block text-xs capitalize text-[#56635c]">
                        {status(user.status)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {!visible.length && (
                <Empty>
                  {search
                    ? 'No people match your search.'
                    : `No ${role === 'STUDENT' ? 'students' : 'lecturers'} recorded yet.`}
                </Empty>
              )}
            </>
          )}
        </section>
        <div aria-live="polite" className="min-w-0 space-y-5">
          {!selectedId ? (
            <Section title="Select a person">
              <Empty>
                Choose a {role === 'STUDENT' ? 'student' : 'lecturer'} to view their full record.
              </Empty>
            </Section>
          ) : history.isPending ? (
            <p role="status">Loading history...</p>
          ) : history.isError ? (
            <Section title="History unavailable">
              <p role="alert">{history.error.message}</p>
              <button className={`${button} mt-3`} onClick={() => history.refetch()}>
                Retry history
              </button>
            </Section>
          ) : history.data ? (
            <PersonHistory
              data={history.data}
              onSelectStudent={(id) => {
                changeRole('STUDENT');
                setSelectedId(id);
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PersonHistory({
  data,
  onSelectStudent,
}: {
  data: HistoryData;
  onSelectStudent: (id: string) => void;
}) {
  const { account, profile, summary } = data;
  const student = account.role === 'STUDENT';
  const n = (key: string) => (typeof summary[key] === 'number' ? (summary[key] as number) : 0);
  const metrics = student
    ? [
        ['Sessions attended', n('attendedSessions')],
        ['Months with payment', n('paidMonths')],
        ['Successful payments', n('successfulPayments')],
        ['Total paid', money(n('totalPaidLkr'))],
        ['Refunded', money(n('refundedLkr'))],
        ['Assessments', n('assessmentCount')],
      ]
    : [
        ['Sessions completed', n('completedSessions')],
        ['Assigned students', n('assignedStudents')],
        ['Students in session history', n('studentsTaught')],
        ['Amount owed', money(n('owedLkr'))],
        ['Available for payout', money(n('availableLkr'))],
        ['Pending payouts', money(n('pendingPayoutLkr'))],
        ['Paid out', money(n('paidOutLkr'))],
      ];
  return (
    <>
      <Section title={profile.fullName}>
        <p className="mb-4 break-all text-sm text-[#56635c]">
          {account.email} · {status(account.status)}
        </p>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-[#56635c]">{label}</dt>
              <dd className="mt-1 break-words text-xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-[#56635c]">
          {student
            ? 'Attendance counts completed sessions only. Months with payment counts distinct calendar months with successful payments in Asia/Colombo; historical coverage periods are not stored per payment.'
            : 'Amount owed includes completed blocks available for payout plus pending payout requests. Unfinished session blocks do not earn a payout yet.'}{' '}
          All amounts are in LKR. Times are shown in Asia/Colombo.
        </p>
      </Section>
      <Section title="Account & profile">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Fact label="Joined" value={date(account.createdAt)} />
          <Fact label="Account ID" value={account.id} />
          <Fact label="Gender" value={account.gender} />
          <Fact
            label="Date of birth"
            value={
              account.dateOfBirth
                ? new Date(account.dateOfBirth).toLocaleDateString('en-GB', { timeZone: 'UTC' })
                : undefined
            }
          />
          {account.deletedAt && <Fact label="Deleted" value={date(account.deletedAt)} />}
          {student ? (
            <>
              <Fact label="Phone" value={profile.phone} />
              <Fact label="Country / timezone" value={`${profile.country} / ${profile.timezone}`} />
              <Fact label="Preferred language" value={profile.preferredLanguage} />
              <Fact label="Learning goals" value={profile.learningGoals} />
              <Fact label="Current plan" value={profile.currentTier} />
              <Fact
                label="Assigned lecturer"
                value={profile.assignedLecturer?.fullName || 'Unassigned'}
              />
              <Fact
                label="Preferred hours (Asia/Colombo)"
                value={profile.preferredHours?.map((hour) => `${hour}:00`).join(', ')}
              />
              <Fact
                label="Course progress"
                value={
                  profile.progress
                    ? `${profile.progress.currentLearningPath.title}: ${profile.progress.progressPercentage}%${profile.progress.currentModule ? ` / ${profile.progress.currentModule.title}` : ''}${profile.progress.currentLesson ? ` / ${profile.progress.currentLesson.title}` : ''}`
                    : 'No course progress recorded'
                }
              />
            </>
          ) : (
            <>
              <Fact label="Biography" value={profile.bio} />
              <Fact label="Qualifications" value={profile.qualifications} />
              <Fact label="Specializations" value={profile.specializations?.join(', ')} />
              <Fact label="Languages" value={profile.languages?.join(', ')} />
              <Fact
                label="Working hours (Asia/Colombo)"
                value={profile.hourlyAvailabilityJson?.map((hour) => `${hour}:00`).join(', ')}
              />
              <Fact label="Payout method" value={profile.payoutMethod} />
              <Fact label="Payout details" value={profile.payoutDetails} />
              <Fact
                label="Average rating"
                value={
                  profile.ratingCount
                    ? `${profile.ratingAvg?.toFixed(1)} / 5 (${profile.ratingCount} ratings)`
                    : 'No ratings yet'
                }
              />
            </>
          )}
        </dl>
      </Section>
      {!student && (
        <>
          <Section title="Assigned students">
            {!profile.assignedStudents?.length ? (
              <Empty>No students currently assigned.</Empty>
            ) : (
              <ul className="divide-y divide-[#d6e0db]">
                {profile.assignedStudents.map((person) => (
                  <li key={person.userId} className="py-3">
                    <button
                      className={`${button} text-[#095F46]`}
                      onClick={() => onSelectStudent(person.userId)}
                    >
                      {person.fullName}
                    </button>
                    <p className="mt-1 break-all text-sm text-[#56635c]">
                      {person.user.email} · {person.currentTier} · {status(person.user.status)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Payout history">
            {!profile.payouts?.length ? (
              <Empty>No payout requests recorded.</Empty>
            ) : (
              <div className="space-y-3">
                {profile.payouts.map((payout) => (
                  <article
                    key={payout.id}
                    className="rounded-lg border border-[#d6e0db] p-3 text-sm"
                  >
                    <p className="font-semibold">
                      {money(payout.amountLkr)} · {status(payout.status)}
                    </p>
                    <p>
                      {payout.method} · Requested {date(payout.initiatedAt)}
                    </p>
                    {payout.completedAt && <p>Paid {date(payout.completedAt)}</p>}
                    {payout.failureReason && <p>Failure: {payout.failureReason}</p>}
                    <p className="break-all text-[#56635c]">Reference: {payout.id}</p>
                    <p className="break-all text-[#56635c]">
                      Session blocks: {payout.sessionBlocksIncluded.join(', ') || 'None recorded'}
                    </p>
                  </article>
                ))}
              </div>
            )}
            <Link
              href="/admin/finance"
              className={`${button} mt-4 inline-flex items-center text-[#095F46]`}
            >
              Manage payouts in Finance
            </Link>
          </Section>
          <Section title="Session block earnings">
            {!profile.sessionBlocks?.length ? (
              <Empty>No session blocks recorded.</Empty>
            ) : (
              <ul className="space-y-3">
                {profile.sessionBlocks.map((block) => (
                  <li key={block.id} className="rounded-lg border border-[#d6e0db] p-3 text-sm">
                    <p className="font-semibold">
                      {block.student.fullName} · {money(block.payoutAmountLkr)} ·{' '}
                      {status(block.status)}
                    </p>
                    <p>Completed: {date(block.completedAt)}</p>
                    <p className="break-all text-[#56635c]">Block: {block.id}</p>
                    <p className="break-all text-[#56635c]">
                      Sessions:{' '}
                      {[block.session1Id, block.session2Id].filter(Boolean).join(', ') ||
                        'Not recorded'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
      {student && (
        <>
          <Section title="Payment history">
            {!data.payments?.length ? (
              <Empty>No payments recorded.</Empty>
            ) : (
              <div className="space-y-3">
                {data.payments.map((payment) => (
                  <article
                    key={payment.id}
                    className="rounded-lg border border-[#d6e0db] p-3 text-sm"
                  >
                    <p className="font-semibold">
                      {money(payment.amountLkr)} · {status(payment.status)} · {payment.tier}
                    </p>
                    <p>
                      {date(payment.processedAt)} · {payment.gateway}
                    </p>
                    <p className="break-all text-[#56635c]">Payment: {payment.id}</p>
                    <p className="break-all text-[#56635c]">
                      Gateway reference: {payment.gatewayChargeId}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </Section>
          <Section title="Subscription history">
            {!profile.subscriptions?.length ? (
              <Empty>No subscriptions recorded.</Empty>
            ) : (
              <ul className="space-y-3">
                {profile.subscriptions.map((subscription) => (
                  <li
                    key={subscription.id}
                    className="rounded-lg border border-[#d6e0db] p-3 text-sm"
                  >
                    <p className="font-semibold">
                      {subscription.tier} · {status(subscription.status)} ·{' '}
                      {money(subscription.lkrAmount)}
                    </p>
                    <p>
                      {date(subscription.currentPeriodStart)} to{' '}
                      {date(subscription.currentPeriodEnd)}
                    </p>
                    <p className="break-all text-[#56635c]">Reference: {subscription.id}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
      <Section title="Session history">
        <p className="mb-4 text-sm text-[#56635c]">
          {n('totalSessions')} total · {n('completedSessions')} completed · {n('scheduledSessions')}{' '}
          scheduled · {n('inProgressSessions')} in progress · {n('canceledSessions')} canceled ·{' '}
          {n('studentNoShows')} student no-shows · {n('lecturerNoShows')} lecturer no-shows
        </p>
        {!data.sessions.length ? (
          <Empty>No sessions recorded.</Empty>
        ) : (
          <div className="space-y-3">
            {data.sessions.map((session) => (
              <details key={session.id} className="rounded-lg border border-[#d6e0db] p-3 text-sm">
                <summary className="cursor-pointer rounded py-1 focus-visible:outline-2 focus-visible:outline-[#095F46]">
                  <span className="font-semibold">
                    {date(session.startsAt)} · {status(session.status)}
                  </span>
                  <span className="mt-1 block text-[#56635c]">
                    {student ? session.lecturer.fullName : session.student.fullName} ·{' '}
                    {session.lesson?.title || 'No lesson linked'}
                  </span>
                </summary>
                <div className="mt-3 space-y-2 whitespace-pre-wrap break-words">
                  <p className="break-all">Session: {session.id}</p>
                  <p>Ends: {date(session.endsAt)}</p>
                  {session.lesson && <p>Course: {session.lesson.module.learningPath.title}</p>}
                  {session.meetingStartedAt && (
                    <p>Meeting started: {date(session.meetingStartedAt)}</p>
                  )}
                  {session.rescheduledAt && <p>Rescheduled: {date(session.rescheduledAt)}</p>}
                  {session.notes ? (
                    <>
                      <p>Topics: {session.notes.topicsCovered || 'Not recorded'}</p>
                      <p>Homework: {session.notes.homework || 'Not recorded'}</p>
                      <p>Shared notes: {session.notes.sharedNotes || 'Not recorded'}</p>
                      <p>Internal notes: {session.notes.internalNotes || 'Not recorded'}</p>
                      <p>Progress rating: {session.notes.studentProgressRating} / 5</p>
                    </>
                  ) : (
                    <p>No session notes recorded.</p>
                  )}
                  {session.rating && (
                    <p>
                      Student feedback: {session.rating.score} / 5 · {session.rating.comment}
                    </p>
                  )}
                  <p>
                    Materials:{' '}
                    {session.materials
                      .map((material) => `${material.title} (${material.fileType})`)
                      .join(', ') || 'None recorded'}
                  </p>
                </div>
              </details>
            ))}
          </div>
        )}
      </Section>
      <Section title="Assessment history">
        {!data.assessments.length ? (
          <Empty>No assessment results recorded.</Empty>
        ) : (
          <div className="space-y-3">
            {data.assessments.map((assessment, index) => (
              <article
                key={`${assessment.reportId}-${index}`}
                className="rounded-lg border border-[#d6e0db] p-3 text-sm"
              >
                <p className="font-semibold">
                  {assessment.title || 'Assessment'} ·{' '}
                  {typeof assessment.score === 'number'
                    ? `${assessment.score}/${assessment.maxScore ?? 100}`
                    : 'No score recorded'}
                </p>
                <p>
                  {student ? assessment.lecturer.fullName : assessment.student.fullName} ·{' '}
                  {assessment.date ? date(assessment.date) : assessment.reportMonth}
                </p>
                {assessment.feedback && (
                  <p className="mt-2 whitespace-pre-wrap">{assessment.feedback}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </Section>
      {!student && (
        <Section title="Authored course assessments">
          {!data.authoredAssessments?.length ? (
            <Empty>No course assessments authored.</Empty>
          ) : (
            <ul className="space-y-3">
              {data.authoredAssessments.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="font-semibold">{item.title}</p>
                  <p>
                    {item.learningPath.title} · {date(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
      <Section title="Progress reports">
        {!data.reports.length ? (
          <Empty>No progress reports recorded.</Empty>
        ) : (
          <div className="space-y-3">
            {data.reports.map((report) => (
              <details key={report.id} className="rounded-lg border border-[#d6e0db] p-3 text-sm">
                <summary className="cursor-pointer rounded py-1 focus-visible:outline-2 focus-visible:outline-[#095F46]">
                  {report.periodMonth} ·{' '}
                  {student ? report.lecturer.fullName : report.student.fullName} ·{' '}
                  {date(report.generatedAt)}
                </summary>
                <div className="mt-3">
                  <RecordContent value={report.contentJson} />
                </div>
              </details>
            ))}
          </div>
        )}
      </Section>
      {student && (
        <>
          <Section title="Certificates">
            {!profile.certificates?.length ? (
              <Empty>No certificates issued.</Empty>
            ) : (
              <ul className="space-y-3">
                {profile.certificates.map((certificate) => (
                  <li key={certificate.id} className="text-sm">
                    <p className="font-semibold">
                      {certificate.learningPath.title} · {date(certificate.issuedAt)}
                    </p>
                    <p className="whitespace-pre-wrap">{certificate.performanceSummary}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Course requests">
            {!profile.courseRequests?.length ? (
              <Empty>No course requests recorded.</Empty>
            ) : (
              <ul className="space-y-3">
                {profile.courseRequests.map((request) => (
                  <li key={request.id} className="text-sm">
                    <p className="font-semibold">
                      {request.learningPath.title} · {status(request.status)}
                    </p>
                    <p>
                      {request.lecturer?.lecturerProfile?.fullName || 'Lecturer not recorded'} ·{' '}
                      {date(request.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
      {!student && (
        <Section title="Student feedback">
          {!profile.ratingsReceived?.length ? (
            <Empty>No student feedback recorded.</Empty>
          ) : (
            <ul className="space-y-3">
              {profile.ratingsReceived.map((rating) => (
                <li key={rating.id} className="text-sm">
                  <p className="font-semibold">
                    {rating.student.fullName} · {rating.score} / 5 · {date(rating.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap">{rating.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
      <Section title="Support & assignment requests">
        {!data.tickets.length ? (
          <Empty>No support or assignment requests recorded.</Empty>
        ) : (
          <ul className="space-y-3">
            {data.tickets.map((ticket) => (
              <li key={ticket.id} className="text-sm">
                <p className="font-semibold capitalize">
                  {status(ticket.type)} · {status(ticket.status)}
                </p>
                <p>
                  {date(ticket.createdAt)}
                  {ticket.resolvedAt ? ` · Resolved ${date(ticket.resolvedAt)}` : ''}
                </p>
                {ticket.reason && <p className="whitespace-pre-wrap">{ticket.reason}</p>}
                {ticket.messages.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer rounded py-2 focus-visible:outline-2 focus-visible:outline-[#095F46]">
                      Conversation ({ticket.messages.length})
                    </summary>
                    <ul className="mt-2 space-y-3">
                      {ticket.messages.map((message) => (
                        <li key={message.id}>
                          <p className="font-semibold">
                            {message.senderName} · {date(message.createdAt)}
                          </p>
                          <p className="whitespace-pre-wrap">{message.message}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Account activity">
        {!data.auditLogs.length ? (
          <Empty>No account activity recorded.</Empty>
        ) : (
          <div className="space-y-3">
            {data.auditLogs.map((log) => (
              <details key={log.id} className="rounded-lg border border-[#d6e0db] p-3 text-sm">
                <summary className="cursor-pointer rounded py-1 capitalize focus-visible:outline-2 focus-visible:outline-[#095F46]">
                  {status(log.action)} · {date(log.createdAt)}
                </summary>
                <p className="my-2 break-all">
                  {log.actor.email} · {status(log.entity)} · {log.entityId}
                </p>
                <RecordContent value={log.details} />
              </details>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

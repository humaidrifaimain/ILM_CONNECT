'use client';

import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
type HistoryArea = 'overview' | 'sessions' | 'billing' | 'assessments' | 'students' | 'activity';
const HistoryAreaContext = createContext<HistoryArea>('overview');

function Section({
  title,
  children,
  area,
}: {
  title: string;
  children: ReactNode;
  area?: HistoryArea;
}) {
  const activeArea = useContext(HistoryAreaContext);
  if (area && area !== activeArea) return null;
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-xl border border-[#d6e0db] bg-white p-4 sm:p-5"
    >
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
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
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">
        {value === '' ? 'Not recorded' : (value ?? 'Not recorded')}
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
  return (
    <Suspense fallback={<p role="status">Loading people...</p>}>
      <AdminHistoryContent />
    </Suspense>
  );
}

function AdminHistoryContent() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get('role') === 'LECTURER' ? 'LECTURER' : 'STUDENT';
  const selectedId = params.get('person');
  const directorySearch = params.get('q') || '';
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
  function navigate(nextRole: 'STUDENT' | 'LECTURER', person?: string, search = '') {
    const query = new URLSearchParams({ role: nextRole });
    if (person) query.set('person', person);
    if (search) query.set('q', search);
    router.push(`/admin/history?${query}`);
  }
  if (selectedId)
    return (
      <div className="min-w-0 space-y-4 text-[#202823]">
        <button
          className={`${button} bg-white`}
          onClick={() => navigate(role, undefined, directorySearch)}
        >
          Back to {role === 'STUDENT' ? 'students' : 'lecturers'}
        </button>
        {history.isPending ? (
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
            key={history.data.account.id}
            data={history.data}
            onSelectStudent={(id) => navigate('STUDENT', id)}
          />
        ) : null}
      </div>
    );
  return (
    <div className="space-y-5 text-[#202823]">
      <header>
        <h1 className="text-2xl font-bold">People &amp; History</h1>
        <p className="mt-1 text-sm text-[#56635c]">
          Choose a person to view their learning, teaching, and financial records.
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
            onClick={() => navigate(item)}
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
                navigate(next);
                document.getElementById(`tab-${next}`)?.focus();
              }
            }}
            className={`${button} ${role === item ? 'border-[#095F46] bg-[#095F46] text-white hover:bg-[#074c38]' : 'bg-white'}`}
          >
            {item === 'STUDENT' ? 'Students' : 'Lecturers'}
          </button>
        ))}
      </div>
      <div id="people-panel" role="tabpanel" aria-labelledby={`tab-${role}`} className="min-w-0">
        <PeopleDirectory
          key={`${role}-${directorySearch}`}
          role={role}
          initialSearch={directorySearch}
          users={users.data || []}
          loading={users.isPending}
          error={users.isError}
          retry={() => users.refetch()}
          select={(id, search) => navigate(role, id, search)}
        />
      </div>
    </div>
  );
}

function PeopleDirectory({
  role,
  initialSearch,
  users,
  loading,
  error,
  retry,
  select,
}: {
  role: 'STUDENT' | 'LECTURER';
  initialSearch: string;
  users: HistoryUser[];
  loading: boolean;
  error: boolean;
  retry: () => void;
  select: (id: string, search: string) => void;
}) {
  const [search, setSearch] = useState(initialSearch);
  const visible = users.filter((user) =>
    `${user.studentProfile?.fullName || user.lecturerProfile?.fullName || ''} ${user.email}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const label = role === 'STUDENT' ? 'students' : 'lecturers';
  return (
    <section
      aria-label={role === 'STUDENT' ? 'Student directory' : 'Lecturer directory'}
      className="overflow-hidden rounded-xl border border-[#d6e0db] bg-white"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d6e0db] p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold">{role === 'STUDENT' ? 'Students' : 'Lecturers'}</h2>
          <p className="mt-1 text-sm text-[#56635c]">
            {loading
              ? 'Loading people...'
              : `${visible.length} ${visible.length === 1 ? 'person' : 'people'}${search ? ' matching your search' : ''}`}
          </p>
        </div>
        <div className="w-full sm:max-w-sm">
          <label htmlFor="history-search" className="text-sm font-medium">
            Search {label}
          </label>
          <input
            id="history-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email"
            className="mt-1 min-h-11 w-full rounded-lg border border-[#b5c2ba] px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#095F46]"
          />
        </div>
      </div>
      {loading ? (
        <p role="status" className="p-5">
          Loading {label}...
        </p>
      ) : error ? (
        <div role="alert" className="p-5">
          <p>Unable to load people.</p>
          <button className={`${button} mt-3`} onClick={retry}>
            Retry directory
          </button>
        </div>
      ) : visible.length ? (
        <>
          <div
            aria-hidden="true"
            className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_110px] gap-5 border-b border-[#d6e0db] bg-[#f5f7f6] px-5 py-3 text-xs font-semibold text-[#56635c] md:grid"
          >
            <span>Name & email</span>
            <span>{role === 'STUDENT' ? 'Lecturer / plan' : 'Role'}</span>
            <span>Status</span>
            <span>Record</span>
          </div>
          <ul className="divide-y divide-[#d6e0db]">
            {visible.map((user) => (
              <li key={user.id}>
                <button
                  onClick={() => select(user.id, search)}
                  className="grid min-h-20 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 px-4 py-4 text-left hover:bg-[#eef4f1] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#095F46] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_110px] sm:px-5"
                >
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold sm:text-base">
                      {user.studentProfile?.fullName ||
                        user.lecturerProfile?.fullName ||
                        user.email}
                    </span>
                    <span className="mt-1 block break-all text-xs text-[#56635c] sm:text-sm">
                      {user.email}
                    </span>
                  </span>
                  <span className="hidden min-w-0 text-sm text-[#56635c] md:block">
                    {role === 'STUDENT' ? (
                      <>
                        {user.studentProfile?.assignedLecturer?.fullName || 'Unassigned'}
                        <span className="mt-1 block text-xs">
                          {user.studentProfile?.currentTier || 'No plan recorded'}
                        </span>
                      </>
                    ) : (
                      'Lecturer'
                    )}
                  </span>
                  <span className="col-start-1 row-start-2 text-xs font-medium capitalize text-[#56635c] md:col-auto md:row-auto">
                    {status(user.status)}
                  </span>
                  <span className="col-start-2 row-span-2 row-start-1 rounded-md bg-[#eef4f1] px-3 py-2 text-xs font-semibold text-[#095F46] md:col-auto md:row-auto md:row-span-1">
                    View record
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="p-8 text-center">
          <Empty>{search ? 'No people match your search.' : `No ${label} recorded yet.`}</Empty>
          {search && (
            <button className={`${button} mt-4`} onClick={() => setSearch('')}>
              Clear search
            </button>
          )}
        </div>
      )}
    </section>
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
  const [area, setArea] = useState<HistoryArea>('overview');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  const n = (key: string) => (typeof summary[key] === 'number' ? (summary[key] as number) : 0);
  const metrics = student
    ? [
        ['Sessions attended', n('attendedSessions')],
        ['Months with payment', n('paidMonths')],
        ['Total paid', money(n('totalPaidLkr'))],
        ['Assessments', n('assessmentCount')],
      ]
    : [
        ['Sessions completed', n('completedSessions')],
        ['Assigned students', n('assignedStudents')],
        ['Amount owed', money(n('owedLkr'))],
        ['Paid out', money(n('paidOutLkr'))],
      ];
  const tabs: { id: HistoryArea; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'sessions', label: 'Sessions', count: data.sessions.length },
    ...(student
      ? []
      : [
          {
            id: 'students' as const,
            label: 'Students',
            count: profile.assignedStudents?.length || 0,
          },
        ]),
    { id: 'billing', label: student ? 'Payments' : 'Earnings' },
    { id: 'assessments', label: 'Assessments', count: data.assessments.length },
    { id: 'activity', label: 'Activity' },
  ];
  return (
    <HistoryAreaContext.Provider value={area}>
      <section
        aria-label={profile.fullName}
        className="overflow-hidden rounded-xl border border-[#d6e0db] bg-white"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#d6e0db] p-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold text-[#56635c]">
              {student ? 'Student record' : 'Lecturer record'}
            </p>
            <h1 ref={heading} tabIndex={-1} className="break-words text-2xl font-bold outline-none">
              {profile.fullName}
            </h1>
            <p className="mt-1 break-all text-sm text-[#56635c]">{account.email}</p>
          </div>
          <span className="rounded-md border border-[#d6e0db] px-3 py-1 text-xs font-semibold capitalize text-[#56635c]">
            {status(account.status)}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 p-4 sm:grid-cols-4 sm:px-6">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-[#56635c]">{label}</dt>
              <dd className="mt-1 break-words text-xl font-semibold tabular-nums sm:text-2xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="px-4 pb-4 text-xs text-[#56635c] sm:px-6">
          Amounts in LKR · Times in Asia/Colombo ·{' '}
          {student
            ? 'Attendance counts completed sessions.'
            : 'Amount owed includes available earnings and pending payouts.'}
        </p>
      </section>
      <div
        role="tablist"
        aria-label="Record sections"
        className="sticky top-[72px] z-20 grid grid-cols-3 gap-1 rounded-lg border border-[#d6e0db] bg-[#f5f7f6] p-1 sm:flex sm:flex-wrap"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`record-tab-${tab.id}`}
            role="tab"
            aria-selected={area === tab.id}
            aria-controls="record-panel"
            tabIndex={area === tab.id ? 0 : -1}
            onClick={() => setArea(tab.id)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
              setArea(tabs[next].id);
              document.getElementById(`record-tab-${tabs[next].id}`)?.focus();
            }}
            className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#095F46] sm:px-4 sm:text-sm ${area === tab.id ? 'bg-[#095F46] text-white' : 'text-[#56635c] hover:bg-white'}`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums sm:text-xs ${area === tab.id ? 'bg-white/15 text-white' : 'bg-[#e5ece8] text-[#56635c]'}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        id="record-panel"
        role="tabpanel"
        aria-labelledby={`record-tab-${area}`}
        className="min-w-0 space-y-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#095F46]"
        tabIndex={0}
      >
        <Section title="Account & profile" area="overview">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Fact label="Joined" value={date(account.createdAt)} />
            <Fact
              label="Account ID"
              value={
                <details>
                  <summary className="cursor-pointer rounded py-1 text-[#095F46] focus-visible:outline-2 focus-visible:outline-[#095F46]">
                    Show account ID
                  </summary>
                  <span className="mt-1 block break-all">{account.id}</span>
                </details>
              }
            />
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
                <Fact
                  label="Country / timezone"
                  value={`${profile.country} / ${profile.timezone}`}
                />
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
            <Section title="Assigned students" area="students">
              <p className="mb-4 text-sm text-[#56635c]">
                {n('assignedStudents')} currently assigned · {n('studentsTaught')} distinct students
                in session history
              </p>
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
            <Section title="Payout history" area="billing">
              <dl className="mb-5 grid grid-cols-2 gap-4 border-b border-[#d6e0db] pb-5">
                <Fact label="Available for payout" value={money(n('availableLkr'))} />
                <Fact label="Pending payouts" value={money(n('pendingPayoutLkr'))} />
              </dl>
              <p className="mb-4 text-xs text-[#56635c]">
                Unfinished session blocks do not earn a payout yet.
              </p>
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
                      <details className="mt-2 text-[#56635c]">
                        <summary className="cursor-pointer rounded py-1 text-[#095F46] focus-visible:outline-2 focus-visible:outline-[#095F46]">
                          Payout reference & blocks
                        </summary>
                        <p className="break-all">Reference: {payout.id}</p>
                        <p className="break-all">
                          Session blocks:{' '}
                          {payout.sessionBlocksIncluded.join(', ') || 'None recorded'}
                        </p>
                      </details>
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
            <Section title="Session block earnings" area="billing">
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
                      <details className="mt-2 text-[#56635c]">
                        <summary className="cursor-pointer rounded py-1 text-[#095F46] focus-visible:outline-2 focus-visible:outline-[#095F46]">
                          Block & session references
                        </summary>
                        <p className="break-all">Block: {block.id}</p>
                        <p className="break-all">
                          Sessions:{' '}
                          {[block.session1Id, block.session2Id].filter(Boolean).join(', ') ||
                            'Not recorded'}
                        </p>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
        {student && (
          <>
            <Section title="Payment history" area="billing">
              <dl className="mb-5 grid grid-cols-2 gap-4 border-b border-[#d6e0db] pb-5">
                <Fact label="Successful payments" value={n('successfulPayments')} />
                <Fact label="Refunded" value={money(n('refundedLkr'))} />
              </dl>
              <p className="mb-4 text-xs leading-relaxed text-[#56635c]">
                Months with payment counts distinct months containing successful payments in
                Asia/Colombo. Payment records do not include their historical coverage periods.
              </p>
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
                      <details className="mt-2 text-[#56635c]">
                        <summary className="cursor-pointer rounded py-1 text-[#095F46] focus-visible:outline-2 focus-visible:outline-[#095F46]">
                          Payment references
                        </summary>
                        <p className="break-all">Payment: {payment.id}</p>
                        <p className="break-all">Gateway reference: {payment.gatewayChargeId}</p>
                      </details>
                    </article>
                  ))}
                </div>
              )}
            </Section>
            <Section title="Subscription history" area="billing">
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
        <Section title="Session history" area="sessions">
          <p className="mb-4 text-sm text-[#56635c]">
            {n('totalSessions')} total · {n('completedSessions')} completed ·{' '}
            {n('scheduledSessions')} scheduled · {n('inProgressSessions')} in progress ·{' '}
            {n('canceledSessions')} canceled · {n('studentNoShows')} student no-shows ·{' '}
            {n('lecturerNoShows')} lecturer no-shows
          </p>
          {!data.sessions.length ? (
            <Empty>No sessions recorded.</Empty>
          ) : (
            <div className="space-y-3">
              {data.sessions.map((session) => (
                <details
                  key={session.id}
                  className="rounded-lg border border-[#d6e0db] p-3 text-sm"
                >
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
        <Section title="Assessment history" area="assessments">
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
          <Section title="Authored course assessments" area="assessments">
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
        <Section title="Progress reports" area="assessments">
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
            <Section title="Certificates" area="assessments">
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
            <Section title="Course requests" area="activity">
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
          <Section title="Student feedback" area="sessions">
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
        <Section title="Support & assignment requests" area="activity">
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
        <Section title="Account activity" area="activity">
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
      </div>
    </HistoryAreaContext.Provider>
  );
}

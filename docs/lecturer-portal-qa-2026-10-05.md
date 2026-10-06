# Lecturer portal QA — 5 October 2026

**Verdict: not ready for release.** Testing reproduced unauthorized conversation access, lecturer financial and private-note disclosure, duplicate bookings, unapproved lecturer access, and incorrect attendance/session transitions. Successful ordinary workflows do not offset these failures.

Tested commit: `37a11d8`, with the existing working tree. No application source was changed. Only QA runners and this report were added; the existing admin/student QA files were preserved.

## Execution and evidence

| Layer | Executed | Passed | Failed |
|---|---:|---:|---:|
| Lecturer API baseline | 242 | 203 | 39 |
| Contracts, independent reproductions, account states, confidentiality | 23 | 7 | 16 |
| Browser survey and interactions | 77 | 59 | 18 |
| Existing unit tests, 17 suites | 98 | 98 | 0 |

There are **342 new QA checks**, alongside **98 existing unit tests**. Failed checks include multiple manifestations/reproductions of the same defect; they are not 73 separate bugs. Four failed API checks assume every availability interval must be exactly 40 minutes; that policy needs confirmation and is excluded from the confirmed defect list below.

The report records **34 grouped findings: 12 P1 and 22 P2**. Priorities are proposed triage priorities, not axe's severity labels.

The 24 desktop/mobile survey states also ran axe with WCAG A/AA tags. Twelve states had violations across four rule types. Functional survey pass/fail is separate from axe results: a page can render correctly and still fail accessibility checks. This is not a full WCAG conformance audit.

Evidence is saved under [lecturer-qa](../output/playwright/lecturer-qa/):

- [Summary](../output/playwright/lecturer-qa/summary.json)
- [Every executed QA case, timestamp and verdict](../output/playwright/lecturer-qa/test-case-matrix.csv)
- [API request results](../output/playwright/lecturer-qa/api-results.json)
- [Independent rechecks and schema contracts](../output/playwright/lecturer-qa/boundary-results.json)
- [Browser results, accessible snapshots and axe nodes](../output/playwright/lecturer-qa/browser-results.json)
- Screenshots named after each browser case; CSV and PDF download artifacts are in the same directory.

All timestamps in the raw evidence are UTC. The run and report date use Asia/Colombo.

## Environment

- Local Next.js 16.2.9 frontend at `http://localhost:3000`, local Nest backend at `http://localhost:3002/api/v1`.
- Separate PostgreSQL 16 cluster at `127.0.0.1:55439`, database `lecturer_qa`. The configured remote database was not used.
- Real application services and database; LiveKit token generation, email delivery and WhatsApp delivery were replaced at the third-party boundary. Internal notifications and database effects remained real.
- Synthetic courses, lessons, assigned/unassigned students, primary/other/empty lecturers, subscriptions, completed/upcoming/live/canceled/no-show sessions, assessments, payouts and resources.
- Chromium via Playwright 1.63.0, primarily 1440×844 and 390×844. Course controls also tested at 320 and 768 pixels. Browser timezone Asia/Colombo, with an additional America/New_York calendar check.
- No external messages, payment charges or bank transfers. Temporary credentials were kept in a private fixture file and removed at teardown.
- Teardown verified zero users, courses, sessions and materials in the isolated database. The API/frontend were stopped, the temporary PostgreSQL cluster was removed, and evidence artifacts were retained.

## Lecturer charters and coverage

Each charter used the lecturer's observable outcome as its oracle, with HTTP/database evidence for persistence and ownership.

| Charter | Scope and executed cases | Status |
|---|---|---|
| Explore account entry with active, suspended, pending, deleted and wrong-role identities to discover approval/session failures. | UI login/logout, anonymous redirect, student role denial, bearer tampering, expired token, suspension, password reset/reuse and old/new credentials. | Covered locally; real recovery email untested. |
| Explore lecturer settings with valid, blank, typed, protected and oversized fields to discover validation/data loss. | Unicode edit/reload, required name, 5,001-character bio, list type/count/element length, protected payout/status/shift/rating fields. | Covered for the exposed fields. |
| Explore scheduling with adjacent, overlapping, booked, past, out-of-shift and simultaneous slots to discover invalid availability. | Create/read/delete, duplicate idempotency, booked lock, foreign deletion, overlap, adjacent interval, date errors, past cells, calendar modes, save/reload/remove, outage handling. | Covered; interval-duration policy unresolved. |
| Explore lecturer bookings with assigned/unassigned students and time/state boundaries to discover ownership and attendance failures. | Assigned booking, missing subscription, unauthorized modification, 6h±1 minute cancellation, successful UI reschedule/cancel, malformed reschedule, notes save/reload, completion/absence repetition, concurrent booking. | Covered locally; exact clock equality not claimed. |
| Explore classrooms with future, expired, completed, canceled, missing and foreign sessions to discover admission/lifecycle failures. | Token authorization/window checks, reopen, error UI, simulated entry, classroom note persistence, End Session and return to sessions. | Partial: real media/reconnection/peer delivery untested. |
| Explore student records with assigned and foreign IDs and zero-progress records to discover exposure or progress errors. | Roster/detail/search, foreign deep link denial, assessment save/reload, score 0/100/85.5 and 99.5, score/title/feedback validation, progress advance and terminal lesson. | Covered for current UI/API. |
| Explore course controls with lesson cursors, whole-course grants, reset and per-student permissions to discover incorrect access. | Partial grant/reload, Unlock All, dismiss/accept Lock confirmation, matrix, content preview, search, invalid/foreign requests. | Covered for one active course per student; multi-course progress semantics unresolved. |
| Explore resource sharing with valid, missing, oversized and spoofed files to discover access and upload failures. | PDF upload/download in browser and API, file signature/MIME, 10MiB+1, missing/blank/long title, no/foreign/missing session, owner/student/outsider download, attachment and nosniff headers. | Covered for PDF; actual PNG/JPEG workflows and malware scanning untested. |
| Explore conversations with ordinary, blank, huge and forged-thread messages to discover leakage and unusable states. | Enter send/reload, UI blank-send prevention, backend malformed inputs, unread/read/presence endpoints, foreign read/injection/re-read, long-message layout. | Covered locally; cross-device live delivery untested. |
| Explore earnings with zero, available, pending, successful, invalid and concurrent requests to discover incorrect withdrawals. | Balance/history ownership, invalid monetary amounts/methods, full-balance request, concurrent reservation, zero-balance disabled control, CSV export, outage display. | Covered for request accounting; settlement untested. |
| Explore support and notifications with own/foreign IDs, invalid payloads and keyboard interaction to discover escalation failures. | Inquiry/history/reply, status tampering, resolved ticket reopen, ownership denial, unread/read/mark-all, dropdown keyboard, coordinator link. | Covered locally; provider delivery/SSE reconnect untested. |
| Explore portal navigation with phone/tablet widths, keyboard input and outages to discover unreachable features. | Every survey route, empty lecturer workflows, overflow, sidebar collapse, dialogs/Escape/focus, axe, visible failure states/reload recovery. | Partial: no physical device, screen reader or other browser engine. |

## Confirmed findings

### P1 — privacy, permissions and core lecturer operation

| ID | Reproduction and observed result | Evidence / source |
|---|---|---|
| LC-01 | **Another lecturer can read a private conversation.** A student and lecturer exchange messages in T. Another lecturer sends to that student with `threadId: T`. POST returns 201; subsequent GET T returns 200 containing earlier private messages. Reproduced twice independently in the final recheck. | `Foreign thread injection denied`, `Foreign thread read still denied after injection`, repeated injection/read checks; `backend/src/message/message.service.ts:135`. |
| LC-02 | **Students receive lecturer bank details.** As an assigned student, GET `/profile/student` exposes `assignedLecturer.payoutDetails`; GET `/profile/lecturers` exposes lecturer payout details in the directory. | Boundary confidentiality checks; `backend/src/profile/profile.service.ts:21,66`. |
| LC-03 | **Students receive lecturer internal notes.** Write private `SessionNotes.internalNotes`, then GET `/bookings/student` as that session's student. The private value is in the response. | `Lecturer private notes hidden from student`; `backend/src/booking/booking.service.ts:454`. |
| LC-04 | **One lecturer slot can be booked twice.** Send simultaneous lecturer booking requests for two subscribed assigned students at the same open slot. Both return 201 and two SCHEDULED sessions exist. Reproduced in the baseline and both final rechecks. | Booking concurrency checks; `backend/src/booking/booking.service.ts:16,139`. |
| LC-05 | **Unapproved lecturers can enter the portal API.** A PENDING lecturer signs in, receives a JWT and reads `/profile/lecturer` with 200. | PENDING login/access checks; `backend/src/auth/auth.service.ts:137`, `backend/src/auth/strategies/jwt.strategy.ts:30`. |
| LC-06 | **A lecturer can book another lecturer's assigned student.** Submit `/bookings` with an unassigned student's ID and a slot belonging to the caller. It returns 201 instead of an ownership rejection. | `Lecturer cannot book unassigned student`; `backend/src/booking/booking.service.ts:35`. |
| LC-07 | **Attendance can blame the student before class or overwrite lecturer absence.** `/bookings/:id/absent` accepts a future session and changes it to NO_SHOW_STUDENT. The same action changes NO_SHOW_LECTURER to NO_SHOW_STUDENT. | `Future absence rejected`, `Terminal attendance rejects NO_SHOW_LECTURER`; `backend/src/booking/booking.service.ts:524`. |
| LC-08 | **Classroom admission and reopening ignore terminal/time boundaries.** Tokens are issued an hour before class, for COMPLETED sessions and for old sessions outside the stated join window. POST reopen changes COMPLETED to IN_PROGRESS; `?reopen=true` admits expired canceled sessions. Browser entry into the future session succeeds. | Classroom baseline/rechecks and `classroom-future-entry-denied`; `backend/src/livekit/livekit.controller.ts:24,121,146`. |
| LC-09 | **Completed lessons can become scheduled lessons again.** A COMPLETED session within the post-session reschedule window is rescheduled to an available future slot; 201 changes it to SCHEDULED. | `Completed reschedule rejected`; `backend/src/booking/booking.service.ts:704`. |
| LC-10 | **Lecturers can resolve their own support tickets.** Post an own-ticket reply with `newStatus: RESOLVED`. The request returns 201 and changes the ticket to RESOLVED, bypassing the administrator-only status endpoint. Reproduced twice. | Support status injection checks; `backend/src/support/support.service.ts:167`. |
| LC-11 | **Essential lecturer destinations are unreachable from mobile navigation.** At 390px, visible links omit Courses, My Students, Earnings, Support and Settings. Sidebar is hidden below the large breakpoint with no complete replacement menu. | `mobile-navigation-completeness`, screenshot; `frontend/src/components/layout/dashboard-sidebar.tsx:170`. |
| LC-12 | **End Session does not complete the lesson.** Enter the simulated lecturer classroom, save notes, press End Session. Navigation returns to sessions, notes persist, but the session remains IN_PROGRESS. | `classroom-save-notes-and-end-status`; `frontend/src/components/classroom/interactive-classroom.tsx:624`, lecturer room `onLeave`. This finding applies to the simulated path; real LiveKit ending was not exercised. |

### P2 — validation, recovery, layout and accessibility

| ID | Reproduction and observed result | Evidence / source |
|---|---|---|
| LC-13 | **Concurrent identical availability requests create duplicate rows.** Two simultaneous POSTs for the same interval can both create slots. Reproduced in baseline and both final rechecks; an earlier recheck did serialize successfully, so this is a timing-dependent race. | Availability concurrency checks; `backend/src/availability/availability.service.ts:38,71`. |
| LC-14 | **Missing/typed lesson and course IDs produce 500s.** PUT lesson/course access with `{}` or numeric ID returns internal server error. Invalid string IDs correctly return 404. | Four `Access invalid` failures; `backend/src/profile/profile.service.ts:214,275`. |
| LC-15 | **Malformed reschedule dates produce 500.** Send `startsAt: "bad"` for an otherwise eligible active session. | `Active reschedule invalid date bad`; `backend/src/booking/booking.service.ts:720`. |
| LC-16 | **Message API accepts blank/huge messages and crashes on invalid input.** Empty, whitespace and 10,001-character content returns 201. Missing/numeric content and nonexistent recipient return 500. UI prevents blank send, but server does not. | Message validation checks; `backend/src/message/message.service.ts:135`. |
| LC-17 | **Support API lacks payload validation.** Invalid category and blank reason are stored. Missing/numeric reason/message can return 500; whitespace reply is stored. | Support request/reply validation checks; `backend/src/support/support.controller.ts:16,40`. |
| LC-18 | **Assigned teaching shifts are not enforced by the API.** A lecturer assigned 10–14 can create a 03:00 availability interval. The UI advertises that availability is restricted to the assigned shift. | `Availability rejects outside assigned shift`; `backend/src/availability/availability.service.ts:24`. |
| LC-19 | **Past availability remains editable and can be created.** API accepts a past interval; previous-week calendar cells are enabled and advertise Add slot. | Past API/UI checks; `frontend/src/app/lecturer/availability/page.tsx`, `backend/src/availability/availability.service.ts:24`. |
| LC-20 | **Deleted lecturers can still obtain login tokens.** A lecturer with `deletedAt` set receives 201/token. Protected profile access does reject the resulting token, which limits impact. | DELETED login/access checks; `backend/src/auth/auth.service.ts:137`. |
| LC-21 | **Course controls overflow phones and tablets.** Course page document width reaches 732px at 390/320px viewports and 979px at 768px. | `course-detail-390`, mobile/tablet course checks and screenshots; `frontend/src/app/lecturer/courses/[courseId]/page.tsx`. |
| LC-22 | **Long chat content causes document overflow.** With the accepted long message, scroll width is 1448 at a 1440 viewport and 394 at 390. | Messages survey states/screenshots; `frontend/src/app/lecturer/messages/page.tsx`. |
| LC-23 | **Notes and course preview overlays lack dialog/keyboard behavior.** Both expose zero dialog roles; Escape leaves them open. In notes, Tab from Save Notes moves to a background link rather than remaining in the overlay. | Preview and notes dialog keyboard checks; `frontend/src/app/lecturer/sessions/page.tsx:699`, course page `:826`. Withdrawal overlay also exposes zero dialog roles, recorded in its successful functional check. |
| LC-24 | **Notifications cannot be closed with Escape.** Open by keyboard; Escape leaves `aria-expanded=true`. | `notifications-dropdown-keyboard`; `frontend/src/components/layout/dashboard-nav.tsx:130`. |
| LC-25 | **Collapsed sidebar's expand button has no accessible name.** Collapse sidebar and inspect/focus its remaining button: snapshot is an unnamed button. Keyboard activation works. | `sidebar-collapse-keyboard-accessible-name`; `frontend/src/components/layout/dashboard-sidebar.tsx`, bottom toggle. |
| LC-26 | **The scholar WhatsApp support link has no destination phone number.** Its href is `https://wa.me/`. | `support-whatsapp-link-valid`; `frontend/src/app/lecturer/support/page.tsx:337`. The external link was inspected, not used to send a message. |
| LC-27 | **Availability outage appears as an editable schedule.** Force `/availability` to 503. Calendar and Save Changes remain without a visible error. Removing the outage and reloading recovers. | `availability-api-error-recovery`; availability query does not consume `isError`. |
| LC-28 | **Session outage appears as an empty session list.** Force `/bookings/lecturer` to 503, switch to list, observe No sessions found. | `sessions-outage-is-not-empty-state`; `frontend/src/app/lecturer/sessions/page.tsx:55`. |
| LC-29 | **Course outage appears as an empty catalogue.** Force `/curriculum/paths` to 503, observe No courses found. | `courses-outage-is-not-empty-state`; `frontend/src/app/lecturer/courses/page.tsx:20`. |
| LC-30 | **Assigned-student outage is hidden by historical booking fallback.** Force `/profile/lecturer/students` to 503. The page still presents historical-session students and totals, with no alert that the assigned roster could not load. | `students-outage-is-not-empty-state`; `frontend/src/app/lecturer/students/page.tsx:21`. |
| LC-31 | **Low-contrast text in multiple lecturer workflows.** Axe reports serious contrast violations on availability, sessions, student performance, course detail and support, on desktop/mobile. | Exact HTML/targets/failure summaries in survey `violations`; examples include calendar cells, lesson access controls, 0/100 badge and support link. |
| LC-32 | **Course access and support selectors have no accessible name.** Visible label text is not associated with the select. Axe reports critical `select-name`. | Course detail/support desktop/mobile survey; source selectors in respective pages. |
| LC-33 | **Message send button has no accessible name.** Axe reports critical `button-name` for the icon-only send control. | `messages-1440` axe result; `frontend/src/app/lecturer/messages/page.tsx:835`. |
| LC-34 | **Mobile payout history scroll region cannot receive keyboard focus.** Axe reports serious `scrollable-region-focusable`. | `earnings-390`; `frontend/src/app/lecturer/earnings/page.tsx`, payout table wrapper. |

## Successful workflows

UI login/logout and anonymous redirect worked. Wrong-role and foreign-student access were rejected in the tested cases. Lecturer profile edits persisted, with useful errors and retained input on invalid saves. Assigned student search/detail, assessment save/reload and score boundaries worked. Course partial grants, full unlock, lock confirmation/cancel, and the matrix worked. Session notes, valid rescheduling and cancellation persisted. File upload/download and invalid-file errors worked. Withdrawal reserved the full balance, concurrent payout requests produced one success, zero balance disabled withdrawal, and CSV export contained the successful payout. Support inquiry/history/reply worked. The empty lecturer could traverse empty roster/sessions/earnings/messages/support states. Dashboard, earnings and settings displayed outages; reload recovered those pages.

Six Zod response contracts passed: lecturer profile, bookings, student progress roster, payout history, payout balance and message threads. API reads checked JSON content types; file downloads checked PDF content, attachment disposition and nosniff. Passing shape contracts do not prove authorization correctness.

## Policy questions and remaining coverage

1. Availability accepts intervals from one second to 24 hours. The UI creates 40-minute slots, but the booking service can consume a larger interval. Confirm whether larger availability windows are intended before treating the four duration failures as defects.
2. Course permissions and learning completion share a single progress cursor. Granting full access sets progress to 100; granting another course replaces that cursor. Confirm intended multi-course and completion semantics before asserting these as defects.
3. Real LiveKit camera/audio/screen sharing, second-participant delivery, permission recovery, disconnect/reconnect, packet loss and classroom end behavior need a configured media environment and a separate charter.
4. Email/WhatsApp delivery, real password-recovery links, SSE reconnection and actual payout settlement were not tested. No real external action was performed.
5. Firefox/WebKit, physical mobile devices, VoiceOver/screen-reader announcements, dark mode, sustained load and exhaustive timezone/DST combinations remain untested. The New York check only verifies timezone-aware calendar rendering, not DST boundary correctness.
6. The matrix states exactly what ran. These are broad, repeatable checks of current portal behavior, not a claim that every possible input, state combination or endpoint permutation has been exhausted.

## Repeating the run

The runners are [API fixtures and baseline](../backend/test/lecturer-portal-qa.cjs), [browser checks](../backend/test/lecturer-browser-qa.cjs), and [boundary/contract rechecks](../backend/test/lecturer-boundary-qa.cjs). API runners reject a non-local database URL. They use `LECTURER_QA_DATABASE_URL` or the isolated local default, not the project's configured database.

Create an isolated PostgreSQL cluster/database on port 55439, then run from `backend`:

```sh
npm run build
DATABASE_URL=postgresql://lecturer_qa@127.0.0.1:55439/lecturer_qa npx prisma db push
node test/lecturer-portal-qa.cjs --serve
```

Start the frontend in another terminal with `NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1 npm run dev -- --port 3000`. Then, from `backend`:

```sh
node test/lecturer-browser-qa.cjs
node test/lecturer-browser-qa.cjs --edges
node test/lecturer-boundary-qa.cjs
npm test -- --runInBand
```

Set `QA_PLAYWRIGHT_PATH` to a compatible installed Playwright package if the machine's cached package differs. Browser scans use the installed axe script at `/tmp/ilm-student-qa-tools/node_modules/axe-core/axe.min.js`. A few calendar cases are tied to this run's October 2026 dates and must be updated for a later run; these are investigation runners, not an integrated CI suite. Each browser case uses a fresh context, but the workflow run deliberately shares fixture records across related state transitions. Use a fresh fixture server for a full rerun. Targeted correction reruns use `--edges --only=case-name,...` and replace the selected evidence records.

New QA runners exit nonzero on failing checks. The API `--serve` mode stays running for browser testing despite baseline failures. Stop it with SIGINT/SIGTERM to delete its temporary users, courses, materials and private fixture file. Stop the frontend and isolated database afterwards.

## Triage order

Address LC-01–LC-10 first: authorization, private response fields, atomic reservations and session transitions. Then restore mobile navigation and correct End Session persistence. After those fixes, rerun the same failing cases before broadening coverage to real media and external delivery. Fix the validation/outage and accessibility findings alongside those workflows. No fixes or deployment were performed in this testing task.

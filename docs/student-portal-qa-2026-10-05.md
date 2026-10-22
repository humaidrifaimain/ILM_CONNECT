# Student portal QA - 5 October 2026

Follow-up: [fixes and post-fix verification](student-portal-fixes-2026-10-05.md). The findings and counts below are the original pre-fix baseline.

Scope: test the portal as a student, including normal journeys, invalid inputs, state transitions, ownership boundaries, interrupted requests, and desktop/mobile use. Application fixes are outside this testing pass.

## Session Charters

1. Explore registration, login, recovery, and logout with fresh accounts, invalid inputs, duplicate submissions, and revoked tokens to discover barriers to account access.
2. Explore trial and subscription access with fresh, active, expired, and paid fixture states to discover incorrect access decisions and misleading billing behavior.
3. Explore booking, rescheduling, cancellation, and classroom entry with assigned/unassigned students, availability boundaries, simultaneous requests, and session states to discover scheduling and admission failures.
4. Explore course materials, assessment results, awards, and feedback with empty and populated fixture records to discover missing, inaccessible, or incorrectly exposed learning data.
5. Explore messages, notifications, support, and profile settings with separate student accounts and malformed inputs to discover persistence, validation, and ownership failures.
6. Explore student navigation with desktop/mobile viewports, keyboard controls, broken routes, offline requests, and session expiry to discover usability and recovery failures.

## Environment

- Local Next.js frontend at http://localhost:3000 and Nest backend at http://localhost:3002.
- Tested repository revision: `37a11d8`.
- Real configured database; only temporary QA accounts and their related records are written and removed. Existing curriculum is read.
- QA backend uses the application's production validation settings, cookie parsing, and local credentialed CORS.
- Booking email/WhatsApp dispatch disabled. Password recovery sender disabled. No external messages or payments.
- Classroom transport overridden with a simulated token. Admission rules remain real; this does not verify two-person media connectivity.
- Playwright Chrome browser. Other browsers and physical devices are not covered unless listed later.

## Session Log

| Time (Asia/Colombo) | Tag | Observation |
| --- | --- | --- |
| 14:40 | NOTE | Started frontend and inspected existing student workflows and earlier verification gaps. |
| 14:41 | NOTE | Existing backend suite: 17 suites / 98 tests passed. |
| 14:45 | NOTE | Empty browser signup submission stays on signup and does not create an account. |
| 14:46 | BUG | API accepts whitespace-only registration name and invalid timezone. |

## Results

Release recommendation: **do not release the student portal with the confirmed privacy and admission failures below.** Application code was not changed.

### Execution Summary

- Existing backend suite: 17 suites, 98 tests passed.
- New API baseline: 98 checks, 79 passed and 19 failed.
- Extended lifecycle/concurrency pass: 32 checks, 27 passed and 5 failed. An earlier run passed the trial race; the repeat reproduced it.
- Focused API recheck: 24 checks, 3 passed and 21 failed. This reproduced all 19 baseline failures and found two additional failures: deleted-account login and expired paid access.
- 12 student routes inspected at 1440px and 390px in Chrome, including rendered content, screenshots, overflow and axe-core WCAG 2 A/AA and 2.2 AA rules. Dashboard overflow also reproduced at 320px and 768px.
- Browser journeys exercised signup/login, trial activation, booking/rescheduling/cancellation, feedback, profile edits, messages, support replies, materials preview/download, classroom prejoin/leave, calendar persistence, logout, recovery errors and service outages.
- Failed test steps caused by strict locators or the Next.js development overlay are excluded from confirmed product findings. Automated accessibility checks are not a complete WCAG certification.

### Confirmed Findings

P1 means high impact; P2 means medium impact. Several failing checks describe the same underlying defect.

| ID | Priority | Finding and Reproduction | Source / Evidence |
| --- | --- | --- | --- |
| ST-01 | P1 | **Another student's conversation can be exposed.** Student A sends to a lecturer in thread T. Student B initially receives 403 reading T. B then sends to that lecturer with client-supplied `threadId: T`; POST returns 201 and GET T returns 200 with A's earlier messages. | `backend/src/message/message.service.ts:121,143`; baseline and recheck thread-injection checks. |
| ST-02 | P1 | **Lecturer financial data and private lesson notes reach students.** GET student profile includes assigned lecturer `payoutDetails`; GET student bookings includes lecturer financial fields and notes `internalNotes`. Fixture sentinel values confirmed exposure, not just schema presence. | `backend/src/profile/profile.service.ts:26`; `backend/src/booking/booking.service.ts:469`; API redacted responses. |
| ST-03 | P1 | **Simultaneous requests book the same slot multiple times.** Four parallel booking requests against one open slot returned four 201 responses and created four sessions on the repeat. Earlier run created three. | `backend/src/booking/booking.service.ts:138`; extended concurrency results. |
| ST-04 | P1 | **Classroom admission ignores scheduled time, completion and expired access.** Token requests succeeded for a session three days ahead, a completed lesson, and an expired-trial student. UI also enabled early classroom entry. Unauthorized outsider was correctly rejected. | `backend/src/livekit/livekit.controller.ts:86,146`; API baseline/recheck and early-entry browser log. |
| ST-05 | P1 | **Students can reactivate canceled or completed lessons.** POST reopen returned 201 and changed canceled to SCHEDULED and completed to IN_PROGRESS. Token query `reopen=true` also reactivates canceled/no-show sessions. | `backend/src/livekit/livekit.controller.ts:24,47,121`; baseline/recheck. |
| ST-06 | P1 | **Rescheduling bypasses booking rules.** Moving to two hours ahead succeeds despite the 12-hour creation cutoff; moving to a day already occupied succeeds despite daily allowance. Browser also rescheduled beyond the trial term. | `backend/src/booking/booking.service.ts:710`; extended API and browser reschedule logs. |
| ST-07 | P1 | **Expired paid accounts without trial history are not gated.** An expired Standard subscription returns `requiresSubscription: false`. The gate only derives expiration from prior trials. | `backend/src/subscription/subscription.service.ts:57`; API recheck. |
| ST-08 | P2 | **Concurrent trial claims create multiple trials.** Four parallel claims returned four 201 responses and produced four subscriptions on repeat. This is timing-dependent, not a consistently failing sequential check. | `backend/src/subscription/subscription.service.ts:85`; extended repeat results. |
| ST-09 | P2 | **Booking can extend beyond subscription expiry.** An active seven-day plan accepted a session forty days ahead. | `backend/src/booking/booking.service.ts:64`; extended API results. |
| ST-10 | P2 | **Deleted accounts receive login tokens.** Setting the fixture student's deletion timestamp still allowed login (201), while subsequent auth/me correctly returned 401. Suspended accounts were correctly rejected. | `backend/src/auth/auth.service.ts:151`; API recheck. |
| ST-11 | P2 | **Students can resolve their own support tickets through the API.** Supplying `newStatus: RESOLVED` while posting a reply returned 201 and changed status. | `backend/src/support/support.service.ts:167`; baseline/recheck. |
| ST-12 | P2 | **Malformed requests produce 500s or accept empty data.** Invalid reschedule dates, missing message/reply and nonexistent recipient return 500. Empty messages, whitespace support replies, invalid support type, whitespace registration names and invalid registration timezone are accepted. Browser signup trims names, so whitespace-name acceptance is an API finding. | API baseline/recheck, named validation checks. |
| ST-13 | P2 | **Populated dashboard overflows narrow screens.** Document width is 890px at 320/390px and 894px at 768px. Students must horizontally scroll to reach content. | `dashboard-390.png`, `dashboard-320.png`, `dashboard-768.png`; browser survey/edge logs. |
| ST-14 | P2 | **Mobile loses the desktop navigation without a replacement menu.** Sidebar is hidden below lg. Settings and course subsection navigation are absent. Some routes remain reachable through dashboard links; assigned students can reach support through lecturer-change, so this is not a claim that every route is inaccessible. | Mobile screenshots and `mobile-navigation.log`; sidebar source. |
| ST-15 | P2 | **Read failures masquerade as empty learning records.** Intercepting bookings with 503 displays 'No sessions booked'; intercepting curriculum with 503 displays 'No course materials are available yet.' Subscription outage correctly blocks access and recovers via Try again. | `session-read-error-is-not-empty-state.log`, `curriculum-error-is-not-empty-state.log`, recovery log. |
| ST-16 | P2 | **Accessibility gaps.** Support category select lacks a programmatic label; collapsed sidebar expand control has no accessible name; reschedule and support overlays lack dialog semantics. Stable axe scans also found low contrast on dashboard/booking controls, support muted text and feedback status badges. | `browser-survey.json`, focus and support history logs. Contrast measured after finite animations settled; earlier transient opacity failures excluded. |

### Passing Coverage

Registration's invalid email/password and duplicate-account paths, incorrect login, suspended-user checks, unauthorized role/ownership checks, normal booking lifecycle, notification reads, assessment/certificate display, feedback persistence, profile persistence and invalid timezone editing were exercised. Browser empty signup and consent validation prevented submission. Materials opened with keyboard, closed with Escape and downloaded; API checked actual PDF bytes, foreign access, student upload denial, executable/signature validation and size limits. Message Enter-to-send and support reply persistence worked. Logout removed session data and protected routes redirected to sign-in. Recovery without a token was rejected; disabled recovery sender produced an honest error.

### Evidence and Reproduction

- `output/playwright/student-qa/api-results.json`: baseline request/response evidence.
- `output/playwright/student-qa/extended-api-results.json`: lifecycle and repeat race evidence.
- `output/playwright/student-qa/api-recheck.json`: confirmed repeat failures and extra account-state checks.
- `output/playwright/student-qa/browser-survey.json`: desktop/mobile route snapshots and settled axe results.
- Individual browser `.log` files include executed Playwright code and results. Screenshots are beside them.
- `browser-confirmed-results.json` collects completed browser results; harness failures remain separately visible in logs. The final message-page accessibility rescan timed out while the backend logged database connection failures, so it is incomplete and not a product defect. Earlier message sending and conversation ownership checks completed.
- API runner: `node test/student-portal-qa.cjs` from backend. This writes temporary fixtures, tests, cleans them and exits nonzero for failures. It uses the configured database: run only against an authorized testing database.
- Browser setup: start frontend on 3000; run `node test/student-portal-qa.cjs --serve` from backend on 3002; open Playwright CLI session `student-qa`; then run the browser driver from repo root. Requires locally available axe-core path declared in the driver. Stop fixture server to clean up. Runners intentionally retain failing assertions.

### Limits and Remaining Coverage

Real payments, email delivery/link completion, WhatsApp delivery and two-person LiveKit audio/video were not verified. No destructive production tests, load/stress testing, physical mobile devices, screen-reader session, or full Firefox/Safari matrix was performed. Course routing includes hardcoded `beginner-qaida` links, but their complete downstream impact needs a separate reproduction before counting another confirmed bug. Corrected rechecks passed the missing-session error, expired-trial gate, plan-selection restriction, support exception, and simulated classroom leave-to-feedback flow. Exhaustive A-Z assurance is not possible from one pass; remaining gaps are explicit rather than marked passed.

Cleanup: the fixture server confirmed temporary QA accounts and uploaded files were removed. Local frontend/backend servers and the test browser were stopped.

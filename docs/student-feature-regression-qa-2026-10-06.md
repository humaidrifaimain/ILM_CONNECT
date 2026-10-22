# Student feature regression QA - 6 October 2026

**Result: no confirmed product defects reproduced in the covered workflows.** The new-feature API checks and focused browser journeys passed, and the earlier student regression suites remain green. This is a targeted change check, not a complete portal audit or production release approval.

QA skills only were used. No anti-slop review or application feature fixes were performed.

## Scope And Risk

Compared current code and uncommitted changes with the prior QA fix commit `9e865e0`, including subsequent course-request and classroom connection commits. Signup demographics were added while testing; the backend was rebuilt, the new migration applied and signup tests rerun. Changes made after this pass are not covered.

| Changed area | Impact x probability | Check priority and evidence |
| --- | --- | --- |
| Registration, availability and assignment requests | 4 x 4 = 16 | High: API validation, ownership, assignment and mobile signup/settings journeys. |
| Classroom admission, authoritative timer and connection lifecycle | 5 x 4 = 20 | High: API roles/status/expiry, unit clock tests, browser warning/automatic exit. |
| Booking breaks, rescheduling and notifications | 4 x 4 = 16 | High: real database boundary checks, booking lifecycle/races, notification checks. |
| Regional pricing and subscription compatibility | 5 x 3 = 15 | High: API price validation, local/international separation, browser switching/persistence, access regressions. |
| Course requests | 4 x 3 = 12 | High: existing lifecycle suite, duplicate/concurrent review, request UI. |
| Existing messages, support, materials and progress | 4 x 2 = 8 | Medium: earlier student API regression suites and backend unit suite. |

Main failure modes checked: blank/invalid new signup fields preventing access; unavailable-hour lecturer assignment; student privilege escalation; timer resets or incorrect 40/45-minute completion; nine-minute lecturer breaks; duplicate trials/bookings; currency selection changing access or displaying the wrong configured price. External media delivery and complete administrator/lecturer UI coverage remain gaps.

## Results

| Suite | Result |
| --- | --- |
| Backend unit tests | 24 suites, **187 passed** |
| Frontend existing regression tests | **9 passed** |
| Student API baseline, repeated after latest signup changes | **98 passed, 0 failed** |
| Extended student lifecycle/concurrency API | **32 passed, 0 failed** |
| New feature/API checks | **61 passed, 0 failed** |
| Focused Chrome browser checks | **19 passed, 0 failed** |
| Database migrations | All **14** applied to an empty isolated database |
| Backend build, frontend production build, separate frontend type check | Passed |

The 191 API checks are execution counts, not 191 unique requirements. Some scenarios overlap between suites. The separate existing course-request integration suite also passed; its output reports lifecycle coverage rather than a numbered test count. The frontend build skips type validation by configuration, so the independent `tsc --noEmit` run supplies type-check evidence.

### New Functionality Verified

- Signup saves gender, date of birth and selected availability. Invalid gender, future/impossible/malformed birth dates, empty hours, duplicates and out-of-range hours return 400. The mobile form completes registration and login with the latest fields.
- Registration creates one pending assignment request. Students cannot assign themselves or forge registration tickets. Admin assignment rejects a lecturer without overlapping hours; matching assignment resolves the request and cannot be repeated.
- Availability settings persist across reloads. Empty selection disables confirmation. A forced 503 preserves the selected windows, displays an error and succeeds after retry. Existing students without hours receive the prompt.
- Lecturer breaks reject nine minutes and accept exactly ten minutes through the API. Accepted lessons retain their 40-minute duration. Unit tests also cover before/after break boundaries, availability and rescheduling.
- Students receive their own booking confirmations and lecturers receive the matching confirmation. Existing unread/message notification persistence still passes.
- Only the assigned lecturer/admin may start the timer. Outsiders cannot read it. Repeated start calls preserve the original start. At 40 minutes the lesson remains active in its extension; at 45 minutes it completes and new token requests are rejected.
- Browser timer waits for the lecturer, displays the five-minute extension dialog and automatically leaves for feedback at expiry. Clock boundaries were accelerated with fixture timestamps; this was not a 45-minute real-time soak.
- Local LKR pricing remains unavailable until configured, as documented. Admin configuration independently saves LKR/USD prices and rejects missing, duplicate, zero and underpriced Fast Track values. LKR/USD/GBP display and GBP selection persistence pass in billing with a selected plan.
- Course request UI creates one pending request. The existing integration suite verifies accept/decline, role/assignment boundaries, duplicate notifications, concurrent reviews, initial zero-percent course assignment and student notification.
- Dashboard, settings, courses, billing and sessions were checked at 390px and 1440px. All ten scans had no document overflow or axe WCAG 2 A/AA and 2.2 AA violations in the scanned main content.

### Existing Functionality Rechecked

Authentication, invalid credentials, duplicate signup, role restrictions, conversation injection prevention, lecturer/private-note filtering, subscription/trial access, booking cutoff and allowance, rescheduling/cancellation, duplicate booking/trial races, material upload/download ownership and file validation, assessments/certificates, feedback persistence, support permissions, notification reads and password-reset token revocation all passed their existing API checks.

Active-session entry before the scheduled time is now an intentional behavior change (`a28a008`), not an old admission-window regression. Tests assert early access is allowed for the authorized active student, while completed/canceled sessions, outsiders and expired subscriptions remain blocked.

## Session Log

Charter 1: Explore signup, availability and assignment with fresh/existing students and admin requests to discover validation, persistence and authorization regressions. Covered in API and focused browser checks.

Charter 2: Explore booking, rescheduling and classroom timing with boundary timestamps and real database fixtures to discover regressions in breaks, admission, countdown and exit. Covered for server rules and simulated classroom UI; real media transport is unverified.

Charter 3: Explore pricing/course requests alongside earlier student journeys to discover access, display and ownership regressions. Covered for student/API boundaries; full administrator/lecturer UI and real settlement are not covered.

| Time, Asia/Colombo | Tag | Observation |
| --- | --- | --- |
| 17:16 | NOTE | Initial 179-test backend suite passed; isolated database prepared. |
| 17:22 | NOTE | Rebuilt after demographics appeared; latest backend suite passed 187 tests. |
| 17:25 | NOTE | Browser signup persisted demographics and morning hours. |
| 17:27 | NOTE | Availability save/reload/error-retry and pending course request passed. |
| 17:27-17:28 | NOTE | Ten desktop/mobile route scans passed overflow and axe checks. |
| 17:28 | NOTE | Classroom waiting, extension warning and expiry exit passed. |
| 17:28 | NOTE | Selected-plan currency switching and GBP persistence passed. |
| 17:29 | NOTE | Final 98-check student API baseline passed after the latest signup build. |

Initial harness errors were corrected and rerun: signup hot reload reset the partially filled form; login was attempted during initial rendering; the course test expected the wrong pending label; the pricing test omitted the selected-plan query; the timer test initially expected the sessions route instead of feedback. These were not filed as product defects. The first pricing check also incorrectly expected migration-created LKR prices; project documentation explicitly requires admin configuration. Final results above use corrected, completed runs.

## Environment, Evidence And Limits

Real Nest application and PostgreSQL in a dedicated temporary local database, with production-style validation and real authentication. Local frontend and Chrome browser; browser API requests were forwarded to the isolated test backend. Email/WhatsApp sends and LiveKit transport were stubbed; payment checkout remains unconnected. Exchange retrieval ran against the configured reference provider, with service unit tests covering provider failure/stale data handling.

Local evidence: `output/playwright/student-changes-qa-2026-10-06/` contains API results, browser results, screenshots and per-step logs. New repeatable checks: `backend/test/student-feature-changes.e2e.cjs` and `backend/test/student-feature-changes.browser.cjs`. The existing runner now accepts `STUDENT_QA_OUTPUT` so this pass does not overwrite the previous audit's evidence.

No confirmed bugs were filed from this pass. Real two-person LiveKit chat, reaction delivery, audio/video, room deletion, real message delivery/payment processing, other browser engines, physical devices and a screen-reader audit were not verified. Full administrator/lecturer UI testing and a timed soak are deferred. Those gaps prevent a claim that every newly added feature works end to end in production.

Cleanup: isolated QA browser/backend/frontend stopped, temporary PostgreSQL cluster stopped and removed, fixture credentials removed. Existing application records, user edits and unrelated running services were left untouched.

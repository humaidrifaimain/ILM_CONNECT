# Student attendance and fifteen-minute no-show prompt

The lecturer classroom now shows whether the assigned student has joined, is waiting to join, or joined and subsequently disconnected. Requesting a room token and viewing the camera preview do not count as joining. LiveKit room participants and authenticated, signed LiveKit events supply attendance; student connection reports are verified against the room in configured environments. Local simulation uses authenticated heartbeats, which are disabled as a production fallback.

The first student join is stored permanently for the meeting attempt. If no student connection has been recorded after fifteen minutes from the later of the scheduled start and the lecturer starting the meeting, the lecturer gets two actions:

- **Wait for a while:** keep the room open and postpone the reminder for five minutes. The decision persists across reloads. Escape performs this same wait action.
- **Mark class absent:** recheck attendance, close the room, save `NO_SHOW_STUDENT`, write an audit entry and attendance note, notify the student account, and return the lecturer to Sessions.

A student joining within fifteen minutes prevents the prompt. Arrival while the prompt is open dismisses it automatically. A later disconnection does not turn a student who attended into a no-show. Provider failures show unknown attendance and do not offer a no-show decision. Failed room deletion rolls back the absence so it can be retried. Attendance is checked again before room deletion and under the same database locks used by joins and meeting expiry.

Admin Sessions has a new attendance column, an attendance field in Session Details, and attendance in its CSV export. It distinguishes a joined student, waiting student, no join recorded after fifteen minutes, and a confirmed absence. The existing ten-second admin refresh updates these records; the classroom checks every five seconds. Reopened sessions reset attendance and use a fresh room name to isolate events from the previous attempt.

The required-feedback workflow remains active for completed lessons. An absent lesson exits without requiring completed-lesson feedback, including when a transport disconnect arrives before the absence transaction commits. Completion from another tab or administrator does not request duplicate feedback if a valid shared note is already saved.

## Validation

- Backend and frontend production builds: PASS.
- Independent frontend type-check: PASS.
- ESLint for the new attendance UI, timer, required-feedback provider, attendance helper and admin Sessions page: PASS, zero warnings/errors. Existing lecturer room `any` annotations remain outside this change's lint cleanup scope.
- Unit/regression tests: PASS, 63 tests across attendance, classroom admission, meeting clocks and booking suites. Fake-clock cases test the exact fifteen-minute boundary and five-minute postponement.
- New attendance API/browser suite: PASS, 17 checks. [Runner](../backend/test/student-attendance.qa.cjs), [results](../output/student-attendance-qa/results.json).
- Required lecturer-feedback API/browser regression suite: PASS, all 23 existing checks.
- Migration test: PASS, all sixteen migrations applied to a fresh isolated PostgreSQL database; `prisma migrate status` reports the schema up to date.
- Attendance popup accessibility: PASS, axe reports zero violations. Phone viewport 390 × 844 and 200% text size show no horizontal overflow; both buttons remain reachable. The Wait action was exercised using keyboard Enter.
- Browser verification covers camera preview versus actual student entry, on-time arrival, late arrival dismissing an open prompt, later disconnection, persistent Wait, close failures, disconnect during close, absence exit, admin attendance states, and CSV export. No lecturer/student browser runtime exceptions occurred.
- Webhook tests use the real SDK signature/body-checksum verification with temporary test signing keys. Unsigned and tampered bodies are rejected; both `application/webhook+json` and `application/json` are exercised. Old-room events cannot affect a reopened attempt.
- API and database were real; LiveKit transport and external email/WhatsApp delivery were stubbed. No real student or family messages were sent. The QA runner deletes its temporary users, sessions, notifications and audit entries.
- The existing PostgreSQL/Prisma adapter emitted a non-fatal concurrent-query deprecation warning during a simulated close failure. Assertions and cleanup still passed.

## Deployment and reproduction

The additive migration is `backend/prisma/migrations/20261007120000_student_attendance/migration.sql`. Run the existing `npm run db:migrate` deployment step before serving this backend. The migration was applied only to the isolated QA database during this task.

Configure LiveKit to send signed webhook events to `https://YOUR_API_HOST/api/v1/livekit/webhook`, using the same LiveKit API key and secret configured for the backend. The endpoint validates SDK signatures and the raw body checksum. Polling and verified student heartbeats also detect current connections; webhook delivery preserves brief connections that occur between polls. A real LiveKit Cloud room was not exercised in this run.

For local reproduction, use database `attendance_qa` on localhost port 55448 and apply migrations. Build the backend. Build and start the frontend on port 3007 with `NEXT_PUBLIC_API_URL=http://localhost:3017/api/v1`. Run `node test/student-attendance.qa.cjs` from `backend`; it owns the API on port 3017. `ATTENDANCE_QA_DATABASE_URL` and `QA_PLAYWRIGHT_PATH` can override the isolated database and installed Playwright package. The runner uses the existing local axe script at `/tmp/ilm-student-qa-tools/node_modules/axe-core/axe.min.js`.

## Antislop delivery gate

Scope: new attendance labels, absence dialog, admin attendance cells, and the integration with required feedback. Unrelated existing classroom decoration and dashboard styling are excluded. Reading this as a lecturer attendance decision in the existing classroom/dashboard visual language: ENERGY 1 / RHYTHM 1 / MOTION 1.

Design reasons: the existing white form surface keeps the decision readable above the dark classroom; green identifies the action that records and closes; the bordered Wait button keeps the reversible option distinct. The existing sans typeface avoids inheriting the timer's monospace styling. Stacked buttons support small screens, and the scrollable dialog supports enlarged text. One modal shadow conveys elevation. An ordinary text column lets admins scan attendance without adding a decorative badge or new dashboard section.

### Hard gate

- R-02 PASS: new product copy contains no em dashes.
- R-03 PASS: phone-width and 200% text-size checks show no horizontal overflow.
- R-17 PASS: fifteen- and five-minute durations describe implemented logic; join timestamps come from stored connection records.
- R-18 PASS: no testimonials added.
- R-23 PASS: no new imagery, logos or navigation structure added.
- R-24 PASS: no navigation links added; confirmed absence returns to the existing Sessions route.
- R-25 PASS: white-background contrast ratios are 6.30:1 for guidance/borders, 7.67:1 for green, and 6.57:1 for errors. The popup axe scan reports zero violations.
- R-26 PASS: Wait persists the reminder, Mark class absent records/closes, Retry refetches, and CSV export contains attendance. API/browser assertions verify these actions.
- R-27 PASS: explicit loading, waiting, joined, disconnected, unavailable and action-error states are implemented; provider and close failures were exercised.
- R-28 PASS: no FAQ added.
- R-32 PASS: native modal focus, autofocus on Wait, visible focus styles and keyboard Enter work; Escape maps to the permitted wait action.
- R-33 PASS: behavior is written directly in component/service/controller source files; no runtime patching or external CSS injection.
- R-34 PASS: the fixed white dialog uses explicit dark text above the existing classroom surface; no theme toggle added.
- R-35 PASS: production builds, type-checking and API/browser click-through completed.
- R-36 PASS: no fabricated security, performance or customer claims added.
- R-37 PASS: existing classroom dialog/dashboard direction and the declared dials guide the change.
- R-38 PASS: student/session content and attendance derive from saved records; test fixtures are explicitly named QA.

### Purpose gate

- R-01 PASS: no gradients or glows added.
- R-04 PASS: no icons added.
- R-06 PASS: existing sans typography supports readable attendance decisions; the timer retains monospace only for its numeric clock.
- R-07 PASS: no background patterns added.
- R-08 PASS: no decorative arrows added.
- R-09 PASS: attendance is plain text, with no new capsules/badges.
- R-10 PASS: dialog is opaque; no glassmorphism added.
- R-12 PASS: one modal shadow indicates its elevation above the meeting.
- R-13 PASS: no glows added.
- R-14 PASS: no feature cards added.
- R-19 PASS: no animation added to the attendance task.
- R-22 PASS: no illustrations added.

### Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 1 suits a calm attendance decision.
- Consistency PASS: simple status text, one modal and no added animation follow the declared dials.
- Focal point PASS: the missing-student decision and its two actions carry the dialog.
- Whitespace PASS: title, explanation, errors and actions are separated in reading order.
- Accent PASS: established green marks the action that closes and records; Wait is neutral.
- Identity PASS: existing IlmConnect classroom palette and precise lecturer/student language carry the product context.
- Design Read PASS: audience, direction and dials were declared before generation.

### Craftsmanship and quality locks

- C-1 PASS: surface, accent, typography, mobile stacking and elevation have explicit reasons above.
- C-2 PASS: each added action has a working API handler and was exercised.
- C-3 PASS: each added element supports attendance detection or the lecturer's decision.
- C-4 PASS: phone width, enlarged text, keyboard actions, reloads, provider failure and close failure were checked.
- C-5 PASS: no fictional testimonials or claims added.
- R-05 PASS: a decision dialog and attendance column follow the actual session workflow.
- R-11 PASS: modest dialog/button radii match existing forms; no pills added.
- R-15 PASS: “Wait for a while”, “Mark class absent” and “Retry attendance” name their actions.
- R-16 PASS: no marketing buzzwords added.
- R-20 PASS: the dialog describes this classroom's fifteen-minute attendance decision.
- R-21 PASS: existing classroom/dashboard surfaces retained without forcing a new theme.
- R-29 PASS: existing green, white/dark neutrals and error red retain their established roles.
- R-30 PASS: existing product styling is retained instead of copying another product.
- R-31 PASS: major design decisions each have a functional reason recorded above.

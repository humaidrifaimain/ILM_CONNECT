# Required lecturer lesson feedback

Lecturers must save at least 30 trimmed characters of shared feedback when finishing a lesson. The lecturer-wide modal has no skip or close control, ignores Escape and backdrop clicks, traps keyboard focus, blocks Back and in-app links, and restores unfinished feedback after reload or a new login. Drafts are stored locally by session ID. Manual completion saves the note and completion status together; automatic 45-minute expiry still ends the classroom and requires feedback afterwards.

Existing completed sessions with missing or shorter feedback also appear in the required queue. Cancelled and absent sessions are excluded. The existing private lecturer notes stay private.

The saved note appears in the student's feedback view, admin session notes, and the new lecturer-feedback section on the admin Feedback page. Email and WhatsApp use the **existing student account contacts**. There is no separate parent contact model; this implementation assumes the family's account contacts are the delivery destination. In-app notifications are stored for the student account. External delivery uses the project's existing notification providers.

Browser controls can still close a tab or force navigation after an unload warning. The application cannot disable those browser controls; server-side pending feedback returns when the lecturer opens the portal again.

## Verification

- Backend build: PASS.
- Frontend production build and independent `tsc --noEmit`: PASS.
- Targeted backend tests: PASS, 36 tests across five suites covering bookings, feedback, notifications, meeting clocks, and email delivery.
- API/browser runner: PASS, 23 checks. [Runner](../backend/test/required-lesson-feedback.qa.cjs) and [results](../output/required-lesson-feedback-qa/results.json).
- New feedback component and modified admin Feedback page ESLint: PASS, zero warnings/errors.
- Broader lecturer-room/classroom lint: existing `any` types, unused variables, and a media-effect dependency warning remain. These are outside the feedback changes; the now-unused live-classroom toast import was removed.
- API checks cover authentication, assigned lecturer ownership, invalid/oversized feedback, trimmed storage, student/admin visibility, private-note exclusion, retry idempotency, and concurrent completion without duplicate messages.
- Browser checks cover empty/short feedback, Escape/backdrop dismissal prevention, native Back, focus trapping, reload drafts, fresh browser recovery, save failures, navigation after save, manual completion, Back from an active classroom, automatic expiry, and student/admin views.
- Popup axe scan: PASS, zero violations. Narrow viewport: 390 × 844. Text resize: 200%, no dialog overflow and submit remains reachable by scrolling.
- Messaging and LiveKit transport were stubbed; API/database behavior was real. No live family messages were sent. The test uses an isolated PostgreSQL database at port 55447 and temporary fixture users, which the runner deletes.
- Real LiveKit media transport was not exercised. The shared completion callback is used by both the simulated and LiveKit classrooms; the simulated classroom and real server expiry were exercised.

## Design decisions

Reading this as a lecturer task form in the existing IlmConnect dashboard language: ENERGY 1 / RHYTHM 1 / MOTION 1.

The white modal and existing typeface match the dashboard's forms. Dark green identifies the only primary action. The dark backdrop and modal elevation isolate the required task. Full-width input and submit stack on small screens; scrollable height supports zoom and mobile keyboards. A separate flat section distinguishes lecturer feedback from student ratings in the admin view. No new icons, imagery, motion, or branding assets were introduced.

## Antislop delivery gate

Scope: the new required-feedback UI, new admin lesson-note section, and changed classroom completion copy. Unrelated existing dashboard design is excluded. The explicit user requirement that this popup cannot be dismissed overrides the skills' usual Escape-to-close rule.

### Hard gate

- R-02 PASS: changed product copy contains no em dashes.
- R-03 PASS: phone-width and 200% text-size browser checks show no horizontal overflow.
- R-17 PASS: only a real typed-character count and persisted session dates are introduced.
- R-18 PASS: no testimonials introduced.
- R-23 PASS: no new assets or navigation structure introduced.
- R-24 PASS: no new navigation links introduced; Sessions navigation was clicked after save.
- R-25 PASS: white-background contrast ratios are 6.30:1 for muted text/borders, 7.67:1 for green, and 6.57:1 for error text. Computed with the installed contrast checker; popup axe scan has zero violations.
- R-26 PASS: submit writes the API, Retry refetches, and completion requests the required form; browser click-through verified submission and retry.
- R-27 PASS: loading, pending-note, error, save-in-progress, and empty admin-note states exist; failed-save recovery was exercised.
- R-28 PASS: no FAQ introduced.
- R-32 PASS: autofocus, Tab/Shift+Tab containment, visible focus styles, and inert background support keyboard use. Escape is intentionally blocked under the user's explicit requirement.
- R-33 PASS: feature behavior is implemented directly in the component and service source files; no external runtime patching or CSS injection is used.
- R-34 PASS: modal uses a deliberate fixed white surface with explicit dark text, consistent with existing lecturer form dialogs; no theme toggle introduced.
- R-35 PASS: production builds, API checks, and browser click-through completed with zero lecturer runtime exceptions.
- R-36 PASS: no security, performance, or customer claims introduced.
- R-37 PASS: direction comes from the existing dashboard palette, forms, and typography; dials declared above before implementation.
- R-38 PASS: displayed session/student/lecturer content comes from persisted records, with clearly named QA fixtures used only in tests.

### Purpose gate

- R-01 PASS: no gradients/glows introduced.
- R-04 PASS: no icons introduced.
- R-06 PASS: existing dashboard typography retained to match its forms; no display monospace or tracked uppercase added.
- R-07 PASS: no decorative patterns introduced.
- R-08 PASS: no decorative arrows introduced.
- R-09 PASS: no capsules or badges introduced.
- R-10 PASS: opaque form surface; no glassmorphism introduced.
- R-12 PASS: one modal shadow marks its elevation above the blocked dashboard.
- R-13 PASS: no glows introduced.
- R-14 PASS: admin notes use divided text entries rather than identical feature cards.
- R-19 PASS: no animation added to the feedback task.
- R-22 PASS: no illustrations introduced.

### Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 1 fits a required academic task.
- Consistency PASS: one calm form, predictable reading order, and no added animation.
- Focal point PASS: the feedback note and single green save button carry the task.
- Whitespace PASS: spacing separates session context, guidance, writing, validation, and submission.
- Accent PASS: green is reserved for submission and focus.
- Identity PASS: the established dashboard green and lecturer/student lesson vocabulary carry IlmConnect's academic context.
- Design Read PASS: audience, visual direction, and dials are recorded above and were announced before editing.

### Craftsmanship and quality locks

- C-1 PASS: palette, form layout, typography, elevation, and spacing have specific reasons above.
- C-2 PASS: save, retry, and classroom completion controls have real handlers exercised through the browser.
- C-3 PASS: every added field/section serves required lesson feedback and administrative review.
- C-4 PASS: phone viewport, enlarged text, keyboard use, recovery, and save failures were exercised.
- C-5 PASS: no fabricated testimonials, statistics, or claims introduced.
- R-05 PASS: a task form and persisted note list follow the content, with no marketing template added.
- R-11 PASS: rectangular textarea and modest existing rounded form controls; no pill styling added.
- R-15 PASS: actions say “Save feedback and finish”, “Write lesson feedback”, and “Retry”.
- R-16 PASS: changed copy has no marketing buzzwords.
- R-20 PASS: session context and feedback guidance are specific to lecturer-led lessons.
- R-21 PASS: existing dashboard surface language retained; no forced dark mode introduced.
- R-29 PASS: existing green, dark neutral text, white surface, and error red are used for their established roles.
- R-30 PASS: existing product forms retained rather than importing another product's design.
- R-31 PASS: major design choices each have an explicit functional reason above.

## Re-run

Create an isolated PostgreSQL database named `feedback_qa` with user `feedback_qa` on localhost port 55447, then run `DATABASE_URL=postgresql://feedback_qa@127.0.0.1:55447/feedback_qa npx prisma db push` from `backend`. Build the backend. Build/start the frontend on port 3007 with `NEXT_PUBLIC_API_URL=http://localhost:3017/api/v1`. Run `node test/required-lesson-feedback.qa.cjs` from `backend`; it owns the test API on port 3017. The runner supports `QA_PLAYWRIGHT_PATH` for another installed Playwright test package. Axe is loaded from the existing local QA tools at `/tmp/ilm-student-qa-tools/node_modules/axe-core/axe.min.js`.

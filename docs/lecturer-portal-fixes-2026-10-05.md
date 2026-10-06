# Lecturer portal fixes - 5 October 2026

The 34 confirmed findings in the lecturer QA report have been addressed in the local working tree. The original report remains unchanged. This is a verified local repair, not a production deployment or full release certification.

## Verification

| Check | Result |
|---|---:|
| Lecturer API checks | 242 / 242 passed |
| Independent boundary, confidentiality, concurrency and contract checks | 27 / 27 passed |
| Browser survey and interaction checks | 77 / 77 passed |
| Backend unit tests, 18 suites | 114 / 114 passed |
| WCAG-tagged axe survey, 24 desktop/mobile states | Zero violations |
| Backend build, frontend production build, frontend TypeScript | Passed |

The browser run used the production build after development-server loading interruptions. Screens were surveyed at 1440 and 390 pixels; course controls were also checked at 320 and 768 pixels. The lesson overview also received a dialog-specific axe check.

Evidence: [API checks](../output/playwright/lecturer-qa/api-results.json), [boundary checks](../output/playwright/lecturer-qa/boundary-results.json), [browser checks and screenshots](../output/playwright/lecturer-qa/browser-results.json), [case matrix](../output/playwright/lecturer-qa/test-case-matrix.csv). Original evidence is retained in [before](../output/playwright/lecturer-qa/before/).

## Finding-to-fix mapping

| Finding | Change and verification |
|---|---|
| LC-01 | Message writes bind a thread to its sender/recipient pair. Historical reads require participation in every message. Foreign read and read-marking are rejected. Injection and subsequent reads were independently rechecked twice. |
| LC-02 | Student profile and lecturer directory return an explicit public lecturer projection, excluding payout credentials and bank details. Confidentiality checks pass. |
| LC-03 | Student bookings select shared session-note fields and public lecturer fields. Internal notes remain private. |
| LC-04 | Booking validation and slot reservation run in one transaction, with ordered locks for the lecturer and student and a conditional claim of the open slot. Baseline and two independent races create one session. |
| LC-05 | Login and JWT validation require an ACTIVE, non-deleted user. PENDING login and existing-token access are rejected. |
| LC-06 | Lecturer-created bookings require the student to be assigned to that lecturer. Foreign assignment is rejected. |
| LC-07 | Attendance rejects future classes and terminal states. The final status write conditionally claims an active session, preventing attendance overwrite. The existing shared attendance repair was retained and tested. |
| LC-08 | Classroom admission enforces 30 minutes before start through two hours after start. Completed sessions and lecturer absences cannot be joined or reopened. Only the lecturer or an administrator can reopen an eligible cancellation/student absence, with conflict checks and transactional slot reservation. Positive reopening and premature-completion checks also pass. |
| LC-09 | Completed sessions and lecturer absences cannot be rescheduled. Rescheduling checks overlap and changes both slots and the session atomically. UI actions follow the same eligible states. |
| LC-10 | Only administrators may supply a support reply status. A student's or lecturer's ordinary reply can reopen an already resolved ticket to IN_REVIEW and clears resolvedAt. |
| LC-11 | The existing shared mobile navigation now includes all nine lecturer destinations. Every required link is visible at 390 pixels. |
| LC-12 | The simulated lecturer End Session action saves COMPLETED before leaving, disables duplicate submissions and keeps the classroom open on failure. Notes and completion persist. A conditional backend transition prevents concurrent attendance changes from being overwritten. |
| LC-13 | Availability creation, overlap checks and identical-request reuse run under the same lecturer transaction lock. Repeated concurrent requests store one slot. Deletion shares that lock with booking operations. |
| LC-14 | Missing and non-string course/lesson IDs are rejected before Prisma queries. Valid but missing IDs retain their not-found response. |
| LC-15 | Invalid reschedule timestamps are rejected with a client error before database operations. |
| LC-16 | Messages require an active recipient and nonblank string content, with a 10,000-character limit. Unknown recipients return 404. The UI applies the same content limit. |
| LC-17 | Support categories and inquiry/reply text are validated. Blank, missing, numeric and oversized text are rejected. Form labels and limits match the API. |
| LC-18 | Availability intervals must stay within the administrator-assigned shift. Shift interpretation is explicitly Asia/Colombo in the API and calendar, including when the device uses another timezone. |
| LC-19 | Past availability creation is rejected. Past calendar cells are disabled and explain why. |
| LC-20 | Deleted lecturers cannot sign in or use an existing token. |
| LC-21 | Course grids use shrinkable columns; tabs, student metadata and access controls wrap. The document fits phone and tablet widths. Wide permission tables retain internal scrolling. |
| LC-22 | Chat uses bounded layout, removes overflowing negative margins and wraps long unbroken content. A directly seeded legacy 10,001-character message was included in the survey. The message stream is keyboard focusable. |
| LC-23 | Notes, rescheduling, cancellation, attendance, withdrawal, lesson-access, lesson-overview and support dialogs have names, modal roles, focus trapping, Escape dismissal and focus restoration using the shared accessibility helper. |
| LC-24 | The shared notification dropdown closes with Escape and restores focus to its trigger. |
| LC-25 | The shared sidebar toggle has an accessible Expand/Collapse name. |
| LC-26 | A configured WhatsApp number produces a numbered link. Without a number, the control directs lecturers to the working inquiry form. No destination number was invented. |
| LC-27 | Failed availability/profile queries show an alert and Retry rather than an editable empty schedule. Retry recovery was exercised. |
| LC-28 | Failed session queries show an alert and Retry rather than No sessions found. |
| LC-29 | Failed catalogue or student-access queries show an alert and Retry rather than empty catalogue totals. |
| LC-30 | Failed assigned-roster/session queries show an alert and Retry, preventing historical bookings from disguising the outage. |
| LC-31 | Reported calendar, shift, course-access, assessment and support contrast failures were corrected. The retest also corrected unread-message badge/time contrast and keyboard scrolling. All 24 surveyed states pass the scanned WCAG rules. |
| LC-32 | Support category/subject/details and per-student lesson selects have associated labels. |
| LC-33 | The chat send control has the accessible name Send message. |
| LC-34 | The earnings scroll region is named Payout History and can receive keyboard focus. |

## QA adjustments

- The original report excluded an unconfirmed requirement that availability must be exactly 40 minutes. The API continues to accept valid intervals within the shift; bookings remain 40 minutes. The four interval checks now test that distinction explicitly.
- Resolved-ticket reopening is seeded directly as a resolved fixture, rather than depending on the status-injection defect being present.
- An unknown message recipient's 404 is accepted as a valid client rejection.
- The add-slot browser case uses an empty target. The adjacent-interval API fixture is cleaned up after its assertions.
- Ordinary classroom navigation and End Session are separate tests. The earlier simulation-entry test no longer completes the classroom needed by the later notes/completion test. The affected fixtures were reset only in the isolated QA database, and the affected cases were rerun.
- The simulation-entry case was renamed to describe what it actually checks; it does not claim resource download coverage. The separate course PDF upload/download test verifies an actual file transfer.
- Browser accessibility checks now affect the survey verdict instead of merely recording violations beside a functional pass.

## Anti-slop delivery gate

Mode: during, session choice. Scope: the repaired lecturer UI and copy, not a redesign or whole-site certification. Design Read before the final UI iteration: lecturer portal, existing green/neutral Ilmbit identity; ENERGY 1 / RHYTHM 1 / MOTION 1. Existing course rows, forms, schedules and financial tables supply the structure.

| Item | Status and evidence |
|---|---|
| R-02, punctuation | PASS: changed lecturer copy uses plain sentences; em-dash placeholders were replaced with explicit empty-state text. |
| R-03, reflow | PASS: desktop/mobile survey fits viewport; course controls fit 320 and 768 pixels; long-message fixture stays bounded. |
| R-17, statistics | PASS: counts, progress, balances and payout history use API data; test totals come from saved results. |
| R-18, testimonials | PASS: no testimonials or invented people were added. QA identities are synthetic fixtures. |
| R-23, assets | PASS: no new branding, photographs or generated assets; mobile links repair existing lecturer destinations. |
| R-24, navigation | PASS: all nine lecturer destinations exist and were visited. |
| R-25, contrast | PASS: zero WCAG-tagged axe violations in the 24 surveyed states and the checked lesson dialog. |
| R-26, controls | PASS: repaired controls perform the recorded navigation, mutations, exports, downloads and dialog actions; unconfigured WhatsApp uses a real form. |
| R-27, states | PASS: loading/empty states retained; reported outages now have alerts and Retry, with recovery tested. |
| R-28, FAQ | PASS: no FAQ or template content was added. |
| R-32, keyboard | PASS: notes focus trap, dialog Escape, notifications Escape, sidebar activation and named scroll/send controls verified. |
| R-33, implementation | PASS: application fixes were written in source through patches; browser scripts only exercise the app. |
| R-34, themes | PASS: no theme toggle or new theme was introduced; the portal's current light appearance was retained. |
| R-35, execution | PASS: backend/frontend builds, TypeScript, unit/API checks and 77 recorded browser checks; screenshots were inspected. |
| R-36, claims | PASS: unsupported support response-time claims and the message-compliance claim were removed. |
| R-37, direction | PASS: existing lecturer task structure and brand were retained; final iteration uses the declared 1/1/1 dials. |
| R-38, fabricated features | PASS: the summary panel is called a lesson overview; the false Interactive Presentation Active claim and invented fallback objectives were removed. |
| R-01, gradients | PASS: no new gradients/glows; the decorative overview gradient was removed. Retained legacy record-header styling identifies course/profile summaries. |
| R-04, icons | PASS: retained functional calendar, lesson, attendance and finance icons; the generic sparkle in access instructions became a permission shield. |
| R-06, typography | PASS: retained existing typography for English/Arabic teaching content; no display font or tracking treatment added. |
| R-07, patterns | PASS: no grid/dot/blueprint decoration added. |
| R-08, arrows | PASS: no decorative arrow treatment added. |
| R-09, badges | PASS: retained data-backed access, attendance, unread and payout states; removed the fictitious presentation badge. |
| R-10, glass | PASS: no new glass treatment; modal overlays distinguish foreground tasks. |
| R-12, shadows | PASS: retained existing record/dialog elevation; no global shadow styling added. |
| R-13, glow | PASS: no glow system introduced. |
| R-14, cards | PASS: existing course summaries and student records remain content-driven; no feature-card section added. |
| R-19, motion | PASS: no new animation system; the unread text badge no longer pulses through unreadable contrast. |
| R-22, illustrations | PASS: no generic/generated illustrations. |
| Dials | PASS: 1/1/1 suits operational lecturer work and keeps the existing UI restrained. |
| Focal points | PASS: the active schedule, roster, conversation, form or financial table remains the task focus. |
| Whitespace | PASS: wrapping and shrinkable layout separate controls while retaining existing spacing. |
| Accent | PASS: existing green marks primary actions and selection; semantic colors communicate status. |
| Identity motif | PASS: Ilmbit mark, English/Arabic teaching typography and lecturer terminology retained. |
| Design Read | PASS: existing direction declared before the final overview-copy iteration. |
| C-1, intention | PASS: each change maps to a reproduced defect or an inaccurate visible claim. |
| C-2, completeness | PASS: changed controls have handlers and the recorded persistence/recovery checks. |
| C-3, composition | PASS: operational sections retained; no marketing template sections. |
| C-4, resilience | PASS: reported widths, keyboard/dialog states and API outages tested. |
| C-5, evidence | PASS: saved test results support the repair claims; limitations are explicit. |
| R-05, templates | PASS: no hero, trust strip or generic marketing layout added. |
| R-11, radius | PASS: existing record/input/dialog/status radius hierarchy retained. |
| R-15, actions | PASS: labels describe actual actions, including Retry, Send message, End Session and View lesson overview. |
| R-16, buzzwords | PASS: changed copy describes lecturer tasks; no promotional AI wording added. |
| R-20, specificity | PASS: shifts, student lesson access, attendance, LKR payouts and teaching sessions remain product-specific. |
| R-21, theme default | PASS: no forced dark default or deferred theme requirement introduced. |
| R-29, palette | PASS: existing green/neutral palette; stronger semantic colors improve readability. |
| R-30, cloning | PASS: no borrowed product layout or redesign. |
| R-31, reasons | PASS: layout/color/focus changes serve reflow, readability, recovery and lecturer workflow. |

## Practical limits

Tests used isolated local PostgreSQL at port 55439, QA API at 3012 and a production frontend at 3003. Third-party LiveKit token transport, email and WhatsApp delivery were stubbed. The configured remote database was not used. Existing admin/student/shared-workspace changes were preserved and overlapping protections were verified in their final versions.

Real LiveKit audio/video, peer messaging, reconnection, screen sharing, actual payout settlement and outbound provider delivery remain unverified. Firefox/WebKit, physical devices and screen readers remain outside this run. Zero axe violations in the scanned states is not a full WCAG conformance claim.

If WhatsApp contact is required, set a real international digits-only `NEXT_PUBLIC_SUPPORT_WHATSAPP` value before the frontend build. The current fallback remains usable without it.

The original unresolved multi-course progress semantics and exact availability-duration policy were not silently changed. No database migration is required for these fixes; transaction locks use the existing PostgreSQL database.

After verification, fixture cleanup left zero users, courses, sessions and materials in the isolated database. The QA API, frontend and PostgreSQL servers were stopped, and temporary build directories were removed.

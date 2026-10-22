# Student portal fixes - 5 October 2026

The 16 grouped defects in the [original QA report](student-portal-qa-2026-10-05.md) have been addressed in the local working tree. This is a verification of those fixes, not a claim that every possible portal defect is gone. Existing changes from the other portal work were preserved and tested where they overlap student behavior. Nothing was deployed or committed.

## Fix Status

| Finding | Change | Verification |
| --- | --- | --- |
| ST-01 | Message threads enforce participant ownership; client-supplied thread IDs cannot add an outsider. Historical mixed-participant threads fail closed. | API baseline/recheck; five message service regression tests. |
| ST-02 | Student responses select public lecturer fields and omit private lesson notes and payout details. Availability and rating counts remain available. | API sentinel checks and populated browser dashboard/calendar. |
| ST-03 | Booking uses transaction-scoped database locks and overlap checks. Lock results are cast to text for Prisma; transaction timeout allows competing requests to reach validation. | Four parallel requests: one 201, three 400, one database session. |
| ST-04 | Classroom admission checks participant, session state, subscription and the entry window. Prejoin blocks entry until admission succeeds and shows the rejection reason. | API state/window checks; early-entry UI disabled; prejoin axe scan. |
| ST-05 | Students cannot reopen canceled/completed sessions through either endpoint or token query. Student reopen button removed. | API role and state regressions. |
| ST-06 | Rescheduling applies the 12-hour cutoff, active subscription term, full session duration, allowance and overlap rules. The moved session is excluded from its own allowance count. | Extended API checks; keyboard reschedule dialog. |
| ST-07 | Expired paid subscriptions require renewal even without previous trial history. | API recheck and subscription regression test. |
| ST-08 | Trial claims serialize per student inside a database transaction. | Four parallel claims: one 201, three 400, one subscription. |
| ST-09 | Bookings must start and end inside the active subscription term. | Extended API expiry checks. |
| ST-10 | Deleted accounts are rejected during login. | API recheck. |
| ST-11 | Student support replies cannot change ticket status. | API role/status checks and support service tests. |
| ST-12 | Blank registration/contact/message/support fields, invalid timezones, invalid dates and unknown recipients return validation/not-found responses rather than 500s or accepting empty records. | Baseline, extended and focused API checks. |
| ST-13 | Dashboard grid and calendar containers can shrink without forcing document overflow. Mobile message bubble no longer covers study content. | Dashboard at 320/390/768/1440px; route screenshots. |
| ST-14 | Mobile menu exposes existing student and course destinations. Escape closes it and returns focus to its summary. | Visible mobile navigation and Settings link; 12 mobile routes. |
| ST-15 | Session/material read failures show an alert and retry action, not an empty-record claim. | Forced 503, then successful retry for both views. |
| ST-16 | Support controls have labels; overlays have names/dialog semantics and focus handling; session details open by keyboard. Text/control contrast corrected in affected views. | 24 route axe scans, prejoin axe scan, dialog Tab/Enter/Escape/focus checks. |

The support screen also removes an unconfigured WhatsApp destination and unsupported response-time/operating-hour claims. It points students to the working support form instead. Prejoin no longer claims a secure/encrypted connection before connecting.

## Verification

- API baseline: **98 passed, 0 failed**.
- Extended lifecycle/concurrency: **32 passed, 0 failed**.
- Focused API recheck: **24 passed, 0 failed**. These checks overlap the baseline and are not 24 additional unique scenarios.
- Backend Jest: **18 suites, 114 tests passed**.
- Browser survey: **24 passed**, covering 12 student pages at 1440px and 390px; no page errors, document overflow or axe WCAG 2 A/AA / 2.2 AA violations in the scanned main content.
- Focused browser fixes: **8 passed, 0 failed**, covering dashboard widths, mobile menu, keyboard dialogs, session/material outage recovery and early classroom rejection. Prejoin was also scanned with no axe violations.
- Backend build, frontend production build and separate frontend `tsc --noEmit` passed. The frontend build's configured type-check skip is not treated as type-check evidence.

Evidence: `output/playwright/student-qa/api-results.json`, `extended-api-results.json`, `api-recheck.json`, `browser-survey.json`, `browser-fix-verification.json`, and adjacent screenshots/logs. Original evidence is retained in `output/playwright/student-qa-before-fixes`. These local artifacts are ignored by Git. Browser navigation timeouts and a menu locator that toggled an already-open menu were corrected and rerun; they are not counted as product regressions.

Cleanup: temporary student QA accounts and uploaded files removed; database count for this run's account prefix is zero. Fixture credentials removed from artifacts and the isolated QA backend/browser closed. Normal frontend/backend development servers are running on ports 3000/3002 for local review.

## Anti-Slop Delivery Gate

Mode: during, session override. Scope: changed student UI and copy, not a redesign or whole-site certification. Design Read: student learning portal, existing green-and-neutral identity; ENERGY 1 / RHYTHM 1 / MOTION 1.

### Hard Gate

- R-02 PASS: newly edited copy uses no em dashes.
- R-03 PASS: document width stays within 320/390/768/1440px viewports; populated mobile screenshots inspected.
- R-17 PASS: no invented statistics added; dashboard figures come from student records.
- R-18 PASS: no testimonials added; QA identities are isolated test fixtures.
- R-23 PASS: no visual assets created; mobile navigation restores existing destinations within the requested bug-fix scope.
- R-24 PASS: restored destinations correspond to existing student/course routes exercised in the survey.
- R-25 PASS: stable route scans and classroom prejoin scan report no axe contrast violations in tested content.
- R-26 PASS: changed menu, dialog, media toggles and retry actions have handlers; dead WhatsApp link removed.
- R-27 PASS: preserved loading/empty states; forced read failures show errors and recover on retry.
- R-28 PASS: no FAQ created or modified.
- R-32 PASS: session details open with Enter; dialog Tab stays inside, Escape closes, focus returns to trigger; mobile menu supports native keyboard navigation.
- R-33 PASS: application edits are in source; no external script patches application UI/CSS.
- R-34 PASS: no theme toggle introduced or changed.
- R-35 PASS: builds/type check and recorded browser checks cover the changed workflows, including rejection and recovery states.
- R-36 PASS: unsupported support timing and prejoin security claims removed; no certification or performance claim added.
- R-37 PASS: Design Read and 1/1/1 dials declared before student UI edits.
- R-38 PASS: no invented product, team or customer content added.

### Purpose Gate

- R-01 PASS: no new gradients/glows; existing brand treatments retained.
- R-04 PASS: Menu, camera, microphone and retry icons describe their actual controls; existing Lucide library retained.
- R-06 PASS: existing portal typography retained; newly revised classroom labels use normal case without wide tracking.
- R-07 PASS: no decorative grid/dot background added; calendar grid represents time slots.
- R-08 PASS: no decorative arrow pattern added; existing navigation arrows retain their routing purpose.
- R-09 PASS: false readiness/security badges removed; retained statuses reflect records.
- R-10 PASS: no new glass layers; media toolbar background separates controls from the camera image.
- R-12 PASS: no new component-wide shadows; modal elevation distinguishes an overlay from underlying content.
- R-13 PASS: no added glow effects.
- R-14 PASS: no feature-card template added; session rows and calendar retain their different data roles.
- R-19 PASS: no new animation suite; browser scans wait for finite existing animations before contrast checks.
- R-22 PASS: no generic illustrations added.

### Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 1 are explicit; screenshots show a restrained operational portal.
- Focal point PASS: study progress, session calendar and lecturer information remain the dashboard's working content; other views lead with their records/forms.
- Whitespace PASS: spacing separates records and controls; the narrow-screen fix contains the calendar rather than adding filler sections.
- Accent PASS: existing green accent marks primary actions and active navigation; amber/red convey states.
- Identity PASS: Quran course/lesson terminology and the established ILM branding remain visible.
- Design Read PASS: recorded before edits and preserved through delivery.

### Craftsmanship And Quality Locks

- C-1 PASS: each change addresses a reproduced access, validation, recovery or usability defect.
- C-2 PASS: changed controls execute real actions; unsupported contact action removed.
- C-3 PASS: no filler section added; existing student workflows retained.
- C-4 PASS: tested narrow layouts, keyboard dialogs, API failure/retry and admission rejection states.
- C-5 PASS: claims restricted to observed test results and actual record data.
- R-05 PASS: no hero/marketing template introduced; content remains a student workspace.
- R-11 PASS: existing control shapes retained; new menu uses native details/summary, not a pill-button collection.
- R-15 PASS: new actions name the task: Menu, Try again, Retry and session details.
- R-16 PASS: no AI marketing copy added.
- R-20 PASS: screenshots retain the portal's course, lesson, lecturer and subscription context.
- R-21 PASS: existing prejoin dark camera surface retained for media inspection; no forced site-wide dark theme added.
- R-29 PASS: existing green/neutral palette retained with semantic warning/error colors.
- R-30 PASS: no outside product template or branding introduced.
- R-31 PASS: contrast aids reading, constrained grid tracks contain calendar width, and dialogs preserve focus during a task.

## Limits

Live payment processing, delivered email/WhatsApp, real two-person LiveKit audio/video, other browser engines, physical devices and a full screen-reader audit are not verified. External messages/payments were disabled and media transport simulated during fixture testing. Automated axe results are not a WCAG certification.

The original report's unconfirmed wider concerns, including hardcoded course aliases in dashboard/global session routing, still need separate requirements and verification. The confirmed ST-01 through ST-16 fixes do not establish correctness for every course configuration. Changes remain local; production readiness still requires authentic service integration and deployment checks.

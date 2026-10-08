# Admin People & History: implementation and QA

Added `/admin/history` to the desktop sidebar and mobile admin navigation. The page has Students and Lecturers tabs, a searchable directory, and individual records. ADMIN and SUPER_ADMIN can retrieve histories; student, lecturer, anonymous, and invalid sessions cannot.

Student records show completed attendance, session statuses, payment totals and all payment statuses, subscription periods, current course progress, assessment results from every historical lecturer, session notes, materials, feedback, progress reports, certificates, course requests, support conversations, and account activity.

Lecturer records show completed sessions, currently assigned students, distinct students in session history, amounts owed, available earnings, pending payouts, successful payouts, failed payouts, session blocks, assessment results and authored assessments, student feedback, progress reports, support requests, and account activity. Assigned students open their student histories. Payout management links to the existing Finance page.

Amounts owed use the existing payout rules: completed session blocks available for payout plus pending payout requests. Unfinished blocks and failed payout records are excluded. Successful payouts have their own total. Histories use a repeatable-read transaction so records and totals come from one database snapshot. Authentication fields are excluded from the account query and related user selections.

## Data limitation

Each payment has a processing timestamp but no historical billing coverage period. **Months with payment** therefore means distinct calendar months containing successful payments, in Asia/Colombo. It does not claim the number of subscription months purchased. The page explains this beside the totals. Failed, pending, and refunded payments do not contribute to this count or the successful-payment total. Refunds appear separately. Attendance counts COMPLETED sessions only; both no-show statuses are separate.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Backend production build | PASS | `npm run build` compiled Prisma and TypeScript |
| Frontend production build | PASS | Next.js generated `/admin/history` successfully |
| Frontend type checking | PASS | Separate `npx tsc --noEmit`; the existing build config skips type validation |
| Changed frontend lint | PASS | ESLint on the new page and history types |
| Existing backend regression suite | PASS | 24 suites, 191 tests |
| Live API checks with local Postgres | PASS | 13 scenarios in `output/playwright/admin-history/api-results.json` |
| Chromium browser checks | PASS | 16 scenarios in `output/playwright/admin-history/browser-results.json` |
| Text contrast | PASS | Muted text on white 6.30:1; white on primary green 7.67:1; foreground on selected background 13.57:1 |
| Source formatting and whitespace | PASS | Prettier check for new application files; `git diff --check` |

Repeatable runners are `backend/test/admin-history.qa.cjs` and `backend/test/admin-history.browser.cjs`. The API runner seeds records into a disposable local database, authenticates through the actual login endpoint, validates response contracts with Zod, and cleans up its accounts. Pass `--serve` to keep it running for browser checks; SIGINT or SIGTERM performs cleanup. The browser runner accepts `PLAYWRIGHT_MODULE` for an installed Playwright module path. QA used API port 3022 and frontend port 3023. All 15 existing migrations were applied to a fresh UTF-8 database on localhost port 55449. No production database was modified. Email and WhatsApp dispatch were stubbed.

API checks cover duplicate payment months, the Colombo month boundary, failed/refunded/pending exclusions, no-show exclusions, historical lecturers, notes and assessments, malformed legacy assessment fields, support conversations, assignment activity, credential exclusion, empty profiles, role restrictions, missing profiles, payout totals, and the effect of failing a pending payout.

Browser checks cover navigation, both profiles, searching, no matches, empty profiles, empty directories, keyboard Arrow/Home/End tab behavior, selection reset, student drill-down from lecturers, 375px and 320px layouts, loading, failures and working retries, delayed-response isolation, Finance navigation, and browser runtime errors. The delayed-response check keeps an old history request pending, selects another student, then releases the old response and confirms it does not replace the current record.

Screenshots: `student-desktop.png`, `lecturer-desktop.png`, `student-mobile.png`, and `lecturer-mobile.png` in `output/playwright/admin-history/`. These use explicitly named QA records.

## Exploratory session

Charter: Explore admin student and lecturer histories with multiple roles, mixed billing/session states, historical lecturers, delayed and failed requests, keyboard navigation, and narrow viewports to discover incorrect totals, record leakage, stale selections, inaccessible controls, and layout failures.

Times below are on 7 October 2026 in Asia/Colombo.

| Time | Tag | Observation |
| --- | --- | --- |
| 15:45:09 | NOTE | API scenarios passed against the migrated local database. Two completed sessions counted as attendance; both no-show types remained separate. |
| 15:45:09 | NOTE | Three successful payments in two Colombo calendar months totaled LKR 36,000; a payment near the UTC month boundary counted in October. |
| 15:45:09 | NOTE | Lecturer owed LKR 7,000: LKR 2,500 available plus LKR 4,500 pending. A failed payout released its blocks without changing the total owed. |
| 15:45:09 | NOTE | Historical lecturer assessments appeared for the student. Assignment activity appeared in both the relevant student and lecturer records. |
| 15:47:04 | NOTE | Browser session confirmed the sidebar, directories, full histories, notes, conversations, and report disclosure controls. |
| 15:47:12 | NOTE | Final browser checks passed for empty/error/loading states, retry actions, delayed-response isolation, keyboard tabs, and 320px containment. |
| 15:47:12 | RISK | Billing coverage months cannot be reconstructed from current payment fields; the UI states the narrower metric accurately. |

Debrief: Functional records, totals, access boundaries, request failures, selection races, and basic keyboard/mobile behavior are covered. Visual screenshots were inspected. No unresolved application defect was found within this charter. High-volume performance, a full screen-reader audit, Firefox, and WebKit were not tested in this pass. No claim of complete WCAG certification is made.

## Design decisions

Reading this as an administrative records page for ILM Connect administrators in the existing green-and-neutral visual language. ENERGY 1 / RHYTHM 1 / MOTION 1.

- Color: existing green identifies selected tabs and records; neutral text and white surfaces preserve the admin shell's hierarchy.
- Layout: directory beside the record on desktop and stacked on mobile keeps person selection close to their history.
- Typography: existing application type and readable sentence-case labels keep the page consistent with the admin portal.
- Spacing: larger gaps separate record categories; smaller gaps keep ledger entries and facts together.
- Surfaces: bordered sections group real record categories and their empty states; repeated payment rows serve a ledger rather than feature promotion.
- Icon: the existing FileText sidebar glyph identifies a records page and matches the surrounding navigation.
- Motion: only existing hover/focus responses are used; no decorative animation competes with reading histories.
- Detail disclosure: native details elements keep long session notes and progress reports readable and keyboard operable.

## Antislop delivery gate

The following gate applies to the new history feature and its navigation addition.

### Hard gate

- R-02 PASS: new page copy contains no em dashes; source search returned none.
- R-03 PASS: live student and lecturer pages had no document overflow at 375px; long student references remained contained at 320px.
- R-17 PASS: statistics are calculated from persisted sessions, payments, blocks, payouts, and assessments; business totals are checked by the API runner.
- R-18 PASS: no testimonials or invented public endorsements were added.
- R-23 PASS: the user requested the page and sidebar addition; no new logos or profile images were created.
- R-24 PASS: sidebar opens `/admin/history`; Finance link opens `/admin/finance`; both were clicked in Chromium.
- R-25 PASS: feature text colors passed the installed contrast checker at 6.30:1, 7.67:1, and 13.57:1.
- R-26 PASS: tabs, directory selection, student drill-down, search, disclosure controls, retry buttons, and Finance navigation all have real behavior and browser evidence.
- R-27 PASS: loading, empty person/directory, no-match, directory-error, and history-error states were exercised.
- R-28 PASS: no FAQ was added.
- R-32 PASS: Arrow/Home/End tab navigation was exercised; native buttons and disclosure controls support keyboard input and have visible focus styling.
- R-33 PASS: application changes were written directly in source; no runtime source/CSS patching was introduced.
- R-34 PASS: no new theme toggle was introduced; the feature follows the existing light admin shell.
- R-35 PASS: both applications built, and the 16 recorded browser scenarios exercised the new control types.
- R-36 PASS: no fabricated security, compliance, performance, or customer claims were added.
- R-37 PASS: the design follows the existing admin shell; direction, dials, and reasons are recorded above.
- R-38 PASS: the feature renders API records; synthetic screenshots and fixtures are explicitly labeled as QA evidence.

### Purpose gate

- R-01 PASS: no gradients or glows were added.
- R-04 PASS: the existing FileText icon identifies records in the sidebar; its purpose is documented above.
- R-06 PASS: existing application typography was retained for admin continuity; no wide-tracked uppercase or oversized monospace treatment was added.
- R-07 PASS: no decorative background pattern was added.
- R-08 PASS: no decorative arrows were added.
- R-09 PASS: no promotional capsule badges were added.
- R-10 PASS: no glassmorphism was added.
- R-12 PASS: record sections use borders rather than decorative elevation.
- R-13 PASS: no glow effects were added.
- R-14 PASS: repeated payment, payout, and session rows group comparable ledger data; category sections follow the available record types.
- R-19 PASS: no template animation was introduced; motion matches the calm dial.
- R-22 PASS: no generic illustration was added.

### Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 1 were declared before implementation.
- Dial consistency PASS: predictable record sections and quiet interactions match an administrative reading task.
- Focal point PASS: the selected person's name and financial/attendance summary lead each history.
- Structural whitespace PASS: directory, summary, account facts, and ledger categories have distinct grouping and spacing.
- Deliberate accent PASS: existing green marks active tabs, selected people, and navigation actions.
- Identity motif PASS: ILM Connect's established green sidebar and matching course, lecturer, session-block, and billing terminology are retained.
- Design read PASS: audience, existing visual language, and dials were stated before generating the page.

### Craftsmanship and consistency

- C-1 PASS: major visual decisions have written reasons above.
- C-2 PASS: interactive control types were exercised by the browser runner.
- C-3 PASS: every section corresponds to existing learning, billing, teaching, payout, support, or activity records.
- C-4 PASS: tested loading/error/empty states, keyboard tabs, delayed responses, and 320px/375px layouts remained usable.
- C-5 PASS: no fictional product claims were introduced; displayed totals are checked against seeded records.
- R-05 PASS: layout follows a directory-and-record workflow rather than a marketing template.
- R-11 PASS: modest existing section/button radii are used; no pill treatment was added.
- R-15 PASS: actions use specific labels such as Retry history and Manage payouts in Finance.
- R-16 PASS: no AI marketing buzzwords were added.
- R-20 PASS: the page reflects ILM Connect's course assessments, historical lecturers, session notes, and session-block payout rules.
- R-21 PASS: the existing admin shell's light presentation was retained.
- R-29 PASS: neutral text/surfaces and one existing green accent form the feature palette.
- R-30 PASS: the feature extends the application's existing administrative design rather than copying an external product.
- R-31 PASS: layout, color, type, spacing, surfaces, icon, motion, and disclosure reasons are documented above.

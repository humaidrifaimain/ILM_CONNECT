# Admin portal QA — 5 October 2026

Tested repository commit `37a11d8` from an administrator's perspective. Product code was not changed. The only new tracked candidates are this report and `backend/test/admin-portal-qa.cjs`; existing student QA files were preserved.

## Result

The portal is not ready for an admin release: attendance can blame the wrong participant, status mutations disclose password hashes, role/status boundaries permit invalid assignments, and phone users cannot navigate between admin sections.

- Existing backend tests: **98 passed across 17 suites**.
- New API checks: **141 executed; 112 passed; 29 failed assertions**. These are assertions, not 29 distinct bugs. One assertion about pending-admin access requires a product-policy decision, and the negative hourly-rate check concerns an accepted but unused input.
- Browser workflow groups: **17 recorded; 10 passed, 6 failed, 1 blocked**. Groups contain multiple interactions and are not individual test-case counts.
- All eight admin routes were opened; each was also surveyed at **390 × 844**. Desktop interactions used **1440 × 1000**.
- Backend build, frontend TypeScript check, and test-script syntax check passed.

Raw evidence is in `output/admin-qa/api-results.json`, `api-run.log`, `browser-results.json`, `mobile-survey.json`, page snapshots, and screenshots. The API suite exits nonzero for failures. It uses the real Nest application, JWT login, validation pipeline, and PostgreSQL; email and WhatsApp delivery are replaced with test providers.

## Environment and isolation

The repository's configured database is hosted on Neon. Mutating QA requests were directed to a separate local PostgreSQL 16 cluster on `127.0.0.1:55440`. Browser fixtures used database `postgres`; the complete independent API run used a fresh database `admin_api` and API port `3003`. Browser API port was `3002`, and the frontend was `localhost:3000`.

No existing hosted accounts, prices, payouts, sessions, or support tickets were modified. All test passwords and JWTs belong to disposable local fixtures. Evidence redacts password hashes and tokens from API responses. Fixture files are local, ignored output files with restricted permissions. No real money was transferred and no external notifications were sent.

## Session charters and coverage

| Charter | Executed coverage | Status and limits |
|---|---|---|
| Explore admin authentication with anonymous, student, lecturer, admin, owner, expired and malformed tokens to discover access violations. | Login, invalid password, all eight protected read endpoints across five access states, suspended stale token, student direct admin URL. | Covered for these identities; MFA, logout token revocation, and long-lived sessions were not exercised. |
| Explore user management with valid, duplicate, Unicode, empty, malformed, suspended and wrong-role accounts to discover invalid onboarding or assignment states. | Creation API, duplicate/case variant emails, password bounds, blank names, malformed arrays, search, reassign, suspend/reactivate, working shifts. | Covered for listed boundaries; bulk actions and concurrent duplicate creation not exercised. |
| Explore session management with future, past, canceled, completed and no-show sessions to discover incorrect transitions. | Notes, oversized notes, completion/repeat, cancellation/repeat, absence, lecturer absence through browser, filtering, second page and empty search. | Partial: rescheduling and real classroom integration not tested. |
| Explore finance and configuration with duplicate processing and boundary amounts to discover incorrect payouts or persisted settings. | Success/failure payout record, repeated and concurrent processing, paid block transition, six plan prices, currency/date boundaries, save/reload. | Covered for listed API operations; real payment gateway, conversion reconciliation and month/timezone rollovers not tested. |
| Explore requests, feedback and audit with multiple roles, hostile text and invalid status changes to discover lost or misrepresented records. | Ticket ownership, replies, empty/missing replies, status transitions, filters, Unicode/literal HTML, feedback filters, audit presence/search. | Partial: enquiry export/download, long conversation pagination, and 100/200-record caps not runtime-tested. |
| Explore all admin sections with desktop/phone widths, keyboard dismissal and API outage to discover unreachable or misleading states. | Eight phone route snapshots, page widths, modal Escape, rating accessibility, finance/dashboard/session outage. | Partial: embedded browser only; no complete WCAG audit, tablet matrix, real device, OS/browser matrix or load test. |

## Confirmed findings

Severity: P1 means fix before release; P2 means a functional, validation or accessibility defect requiring correction. Each reproduction uses a disposable local fixture and was observed through HTTP or the browser unless explicitly labelled source-only below.

| ID | Priority | Reproduction | Expected | Observed / evidence |
|---|---|---|---|---|
| ADM-01 | P1 | PATCH `/admin/users/{lecturerId}/status` with `SUSPENDED` or `ACTIVE`. | Sanitized user response. | HTTP 200 includes `passwordHash` and internal user fields. Both status-response checks fail even though the requested status changes. `AdminService.updateUserStatus`, line 272. Hash is redacted in evidence. |
| ADM-02 | P1 | POST `/admin/students/{adminId}/assign-lecturer` with a real lecturer ID. | Reject a non-student target. | HTTP 201 creates a student profile for an ADMIN user. Role remains ADMIN. `assignLecturer`, line 198. |
| ADM-03 | P1 | Suspend lecturer, then assign a student to that lecturer; fetch lecturer users. | Reject suspended assignment; reflect the same status in user and lecturer profile. | Assignment returns 201. User is SUSPENDED while lecturer profile stays ACTIVE. The stale lecturer token is correctly denied, making the inconsistent assignment unusable. |
| ADM-04 | P1 | PATCH lecturer working hours with `null`, `"text"`, `[-1,24,99]`, duplicate hours, or `[]`. | Validate type, hour range, uniqueness and the UI's minimum shift rule. | All five inputs return 200 and persist malformed availability. Creation also accepts invalid hour elements. `updateLecturer`, line 253. |
| ADM-05 | P1 | Open Sessions → search a started scheduled QA session → Mark No-Show → Lecturer Absent → Confirm Absent. | Record `NO_SHOW_LECTURER`; row and confirmation agree. | Toast says “Session marked as lecturer absent”; row says “Conducted (Student No-show)”. Frontend sends the role only as reason text; backend always writes `NO_SHOW_STUDENT`. Existing lecturer no-show can also be overwritten. See `lecturer-absent.txt` and screenshot below. |
| ADM-06 | P1 | POST `/bookings/{futureSessionId}/absent` for a session three days ahead. | Reject attendance before the session starts. | HTTP 201 immediately records student no-show. Completion correctly rejects future sessions, so the transition rules are inconsistent. `BookingService.markStudentAbsent`, line 524. |
| ADM-07 | P1 | As the student ticket owner, POST a reply with `{message:"QA student reply",newStatus:"RESOLVED"}`. | Restrict administrative status selection to authorized staff. | HTTP 201 sets ticket RESOLVED. The dedicated status endpoint is admin-only, but the message endpoint permits the same change. `SupportService.addTicketMessage`, line 135. |
| ADM-08 | P1 | Suspend/reactivate a user and process success/failure payouts; GET audit logs. | Record actor and result for consequential administrative changes. | No status/suspension or payout-processing audit entry. Lecturer creation, assignment, pricing and currency changes do create records. Source confirms these mutations do not write audit logs. |
| ADM-09 | P1 | At 390 × 844 open any admin subpage. | A visible, operable menu reaches all admin sections. | Sidebar is hidden and no replacement menu exists. Most pages expose only the dashboard-home link. All eight route snapshots and `mobile-survey.json` confirm it. Sidebar uses `hidden lg:flex` at line 170. |
| ADM-10 | P2 | Create lecturer with whitespace-only full name, numeric languages, numeric specialization or invalid hour elements. | Reject malformed required/profile data. | Each returns 201; whitespace name is trimmed to empty and invalid array elements reach profile JSON. Negative `hourlyRate` is also accepted but ignored; this particular assertion is an input-contract concern rather than proven incorrect pay. |
| ADM-11 | P2 | GET users with invalid role/status; GET support tickets with invalid role; PATCH user status with `INVALID`. | Controlled 400 validation response. | HTTP 500 from Prisma enum validation. SQL-like role text also yields 500; this demonstrates missing validation, not proven SQL injection. |
| ADM-12 | P2 | PATCH `/admin/users/{id}/status` with `{}`. | Reject missing required status. | HTTP 200 returns an unchanged full user record. |
| ADM-13 | P2 | PATCH support ticket status to `INVALID`. | Restrict statuses to supported transitions/states. | HTTP 200 persists the arbitrary string, which does not match the portal's status filters. |
| ADM-14 | P2 | POST ticket message containing only spaces; repeat with `{}`. | Reject blank/missing message with 400. | Spaces produce a stored empty message and 201; missing message throws and returns 500. The browser does disable blank replies, but direct requests bypass that check. |
| ADM-15 | P2 | Stop local API; reload/navigate to Sessions. | Explicit service-error state. | Page says “No sessions found matching current filter or search criteria.” Finance reports an explicit error and dashboard reports failure. `sessions-outage.txt` records the misleading empty state. |
| ADM-16 | P2 | Sign in as STUDENT, then navigate directly to `/admin/config`. | Redirect or display access denied before rendering admin controls. | Student sees admin navigation and editable pricing/currency forms. Save is correctly denied with “Forbidden resource”; no unauthorized write succeeded. `student-admin-config.txt`. |
| ADM-17 | P2 | Open Feedback at width 390. | Content fits viewport or scrolls inside its intended container. | Document width reaches 462 px; filter buttons force page overflow. Other surveyed routes fit the viewport. |
| ADM-18 | P2 | Open request conversation, focus reply textarea, press Escape. | Dismiss modal with keyboard and expose appropriate dialog semantics. | Modal remains open. Conversation markup has no dialog role in the inspected DOM. Full focus-trap and screen-reader behavior were not tested. |
| ADM-19 | P2 | Inspect the feedback table accessibility snapshot for a rating of 4. | Rating cell announces “4 out of 5” or equivalent. | Rating cell is empty in the accessibility tree; five decorative SVG stars communicate the score visually only. Feedback page line 66. |

![Lecturer absence recorded as student absence](/Volumes/mac external/bitmo projects/ILM_CONNECT/output/admin-qa/lecturer-absent.png)

## Source-confirmed risks and policy questions

These are separated from runtime defects and failed assertions where the expected policy is not established.

- **Session CSV quoting/formulas:** `frontend/src/app/admin/sessions/page.tsx:102` interpolates profile names directly inside quotes, without escaping embedded quotes or protecting spreadsheet formula prefixes. A QA student named `=HYPERLINK("https://example.test","QA")` is visible in the table. The download-event check timed out, so the actual downloaded artifact is unverified. The shared `downloadCsv` helper already handles both concerns, but this export bypasses it.
- **Pending admin access:** after setting an ADMIN fixture to PENDING, its valid token still reads `/admin/stats` with 200. The test expects 401. Confirm whether PENDING administrators are intended to retain access; do not count this policy-dependent assertion as a confirmed authorization exploit. Suspended tokens are correctly rejected.
- **Owner/staff model:** navigation visibility uses local storage `ilm_admin_role`, defaulting to owner; both ADMIN and SUPER_ADMIN can reach finance/config APIs. The intended backend distinction between staff and owner has not been specified, so no privilege-escalation claim is made.
- **Date/report boundaries:** sessions-this-week has a lower date bound without an upper bound, and monthly payout totals use initiation date rather than completion date. These were identified in source, but rollover/runtime reconciliation remains untested.
- **List truncation:** sessions/feedback stop at 200, audit at 100, and finance lists at 50. The portal's client-side pagination cannot retrieve beyond those caps. Runtime coverage used 39 sessions, so data-loss behavior beyond the caps remains a follow-up.

## Passing behavior worth preserving

- Anonymous, student and lecturer users are blocked from every protected admin read endpoint. Both admin and owner roles can read them.
- Malformed/expired tokens and invalid login passwords are rejected. Suspended lecturer tokens stop working.
- Valid lecturer creation and Unicode names work; duplicate and case-variant emails return 409. Empty names, invalid email, short/overlong password and a role-injection field return 400.
- Valid assignments/reassignments persist. Missing student/lecturer IDs return 404 and empty lecturer IDs return 400.
- User search, no-match search, reassignment and suspension/reactivation work through the browser.
- Empty lecturer-form submission is blocked; UI working shifts enforce one to three selections.
- Notes save; overlong notes fail; future/repeated completion and repeated cancellation fail.
- Completed/canceled sessions cannot be marked absent.
- Payout success updates included blocks to PAID_OUT. Failure has no completion timestamp. Duplicate processing fails. Concurrent processing results in one success and one rejection.
- Students and lecturers cannot write plan/currency configuration. All six prices save; invalid count/duplicates, zero/negative/string/null, excessive precision and above-limit prices are rejected.
- Invalid currency values and dates are rejected; LKR remains fixed at one. Browser price and currency validation work and a valid price survives reload.
- Support ticket ownership blocks unrelated lecturers. Admin reply advances a pending ticket to IN_REVIEW; resolve/reopen updates timestamps correctly. Browser blank reply is disabled, and Unicode replies persist.
- Script-looking text in support and feedback renders literally. No JavaScript alert was observed for the seeded strings.
- Feedback and audit search/empty-state filtering work. Session filtering, second-page pagination and no-match search work.
- Finance and dashboard expose failure messages when the API is unavailable.

## Timestamped session log

Times below use Asia/Colombo where shown as local times. Exact request timestamps are retained in API evidence as UTC ISO strings.

| Time | Tag | Observation |
|---|---|---|
| 16:10 | NOTE | Backend build and existing 98 tests passed. |
| 16:14 | BUG | Initial HTTP exploration reproduced invalid enum 500s, malformed profiles, role-invalid assignment, hash exposure and invalid support state changes. |
| 16:16 | NOTE | Browser support reply persisted Unicode; literal script text stayed visible text. |
| 16:16–16:18 | BUG | Request modal did not dismiss with Escape. |
| 16:18 | NOTE | Added disposable sessions for pagination and hostile CSV-text exploration. |
| 16:27:50 | BUG | Phone survey found missing navigation and Feedback page overflow. |
| 16:28:23 | BUG | Lecturer-absent UI reproduced conflicting toast and student-no-show row. |
| 16:29:01–16:29:02 | NOTE | Independent fresh-database run completed 141 API checks, 112 passing and 29 failing assertions. |
| 16:30:25 | BUG | API outage appeared as an empty Sessions dataset. |
| 16:31:03 | NOTE | Finance/dashboard reported the outage; viewport override was reset and QA tab closed. |

## Re-running the API suite

Use a **fresh disposable local PostgreSQL database**. The script rejects non-local database hosts. It is not safe to point Prisma reset/setup commands at a retained database; the example below creates schema in a new database rather than deleting existing data.

From `backend`, after creating a fresh local database named `admin_qa_fresh`:

```sh
DATABASE_URL='postgresql://qa_admin@127.0.0.1:55440/admin_qa_fresh' npx prisma db push
npm run build
QA_DATABASE_URL='postgresql://qa_admin@127.0.0.1:55440/admin_qa_fresh' QA_API_PORT=3003 node test/admin-portal-qa.cjs
```

The suite seeds its own fixtures and runs all 141 checks. A nonzero exit currently indicates the reproduced failures. Use `--serve` against another fresh local database to expose seeded fixtures for browser exploration; that mode does not execute API assertions. HTTP evidence is written after each check, so an interrupted run is identifiable as partial.

## Debrief and remaining work

All planned admin areas were surveyed, but coverage is **partial**, not exhaustive. The strongest positive evidence is backend role enforcement and price/payout validation; the largest risks are attendance accuracy, profile/state consistency, audit completeness and mobile reachability.

The test script preserves failing cases as regression candidates. No product fixes or red-then-green repair validation were performed because the request was to test the portal. Re-run these cases after fixes, especially the attendance UI path as well as its API.

Explicitly deferred: real email/WhatsApp delivery, LiveKit/classroom behavior, real payment gateways, full student-portal retest, rescheduling, browser/device matrix, complete accessibility audit, 100/200-record limits, race tests beyond payout processing, long-text maximums beyond notes/password, timezone/DST/month-end reconciliation, sustained load, and CSV artifact verification. These gaps prevent a claim that every possible case has been tested.

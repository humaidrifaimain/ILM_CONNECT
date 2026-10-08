# New changes and regression QA — 6 October 2026

The focused check found **one confirmed availability display bug**. The tested admin APIs, new meeting-clock APIs and existing cross-portal workflows passed. This is a local verification of the working tree, not a production release approval. Other chats were editing this shared repository during the run.

## Results

| Check | Result |
|---|---|
| Backend unit tests | 179 passed across 24 suites |
| Existing admin API regression | 138 passed, zero failed |
| Additional new-feature API checks | 37 passed, zero failed |
| Existing cross-portal demo workflows | 58 passed, zero failed |
| Course-request integration suite | Passed lifecycle, role boundaries, duplicate notification prevention and concurrent review |
| Backend build / frontend TypeScript | Passed |
| Availability label regression | 2 passed, 3 failed — confirmed bug below |
| Browser regional pricing | Independent LKR 5,100 and USD 31 saved, survived reload and appeared correctly in Finance |
| Browser assignment navigation | Direct assignment removed from Users; Requests exposes assignment, availability and incompatible-shift explanation |
| Mobile changed admin pages | Configuration, Finance, Requests and Users fit 390 × 844 without document overflow |

## Confirmed bug: saved availability can display as missing

**Priority: P2.** The backend accepts any nonempty array of unique integer hours from 0 to 23. The formatter in `frontend/src/lib/student-availability.ts` only recognizes complete morning, afternoon or evening shift blocks. Valid saved values such as `[10]`, `[0,23]`, or `[6,7,8,9]` therefore display **“Availability not provided.”**

Reproduction:

1. Register a student with preferred hours `[0,23]`, or save `[10]` through the student profile API.
2. Open that student's registration request as admin.
3. Observe “Available: Availability not provided” despite persisted hours. The matching logic still reads the stored array and can reject incompatible shifts.

Expected: display the actual saved hours, or enforce the same supported shift choices consistently across the API and UI. Empty availability should be the only case labelled as not provided.

Evidence: `output/changes-qa-2026-10-06/availability-label-bug.txt`, `availability-label-bug.png`, and `availability-label-results.json`. Repeatable failing check: `cd backend && node test/availability-label-qa.cjs`. No product fix was made in this QA request.

## New behavior covered

- Availability persistence, all-day/hour-boundary values, sorting, duplicate/fractional/string/empty/null rejection and invalid-registration atomicity.
- Student registration creates one assignment request. Assignment rejects incompatible hours, resolved requests, general support requests, unauthorized roles and missing requests; compatible assignment succeeds.
- Meeting clock waits for the lecturer; students cannot start it; outsiders cannot inspect it. Repeated starts retain the original timestamp. Both participants see the same clock. Warning is at 40 minutes and expiry at 45; overdue session completes and cannot restart.
- Regional plan responses expose independent LKR/USD prices and converted currency fields. Finance exposes exchange snapshots and plan values. Browser save/reload and converted amount checks pass.
- Existing login, trial, profile, booking, rescheduling, cancellation, curriculum access, notes, feedback, assessment, material upload/download permissions, support, messaging, payout idempotency, pricing, payment confirmation, waitlist and password-reset workflows pass in the 58-check demo suite.
- Existing unit coverage includes the new 10-minute lecturer break boundaries, meeting expiry/retry/restart behavior, notification formatting and exchange-provider failure handling.

## Test corrections and limits

The first demo attempt lacked curriculum fixtures in the empty local database. A minimal QA course/module/lesson was added, then the suite was rerun. An old demo assertion expected HTTP 403 for student currency editing; the endpoint has intentionally been removed and now returns 404 for all roles. Only that test expectation was corrected. The final suite passes.

Test data used a separate PostgreSQL database `admin_changes_20261006` on localhost:55440. Browser tests used isolated API/frontend ports 3015/3105 and a separate Next build directory. No hosted records or real money were changed. Meeting room shutdown and notification delivery were stubbed in additional API/demo tests; the real application and database ran normally. Exchange snapshots were fetched from the configured reference provider.

Not verified end to end: live two-person audio/video, meeting chat/reaction transmission, actual provider room deletion, external email/WhatsApp delivery, production migrations, full browser/device matrix and load/performance behavior. Meeting expiry was verified with a persisted overdue timestamp and unit fake clocks rather than a 45-minute live call. There is no claim that every unchanged feature is unaffected.

Evidence folders/logs: `output/changes-qa-2026-10-06/`, `output/admin-changes-api.log`, `output/new-feature-api.log`, `output/course-changes-api.log`, `output/demo-changes-api.log`. Added new-feature checks are in `backend/test/changes-qa-20261006.cjs`. Antislop was not used.

# Changed functionality and regression QA, 6 October 2026

The focused pass found two confirmed issues. The other targeted new-feature scenarios and existing cross-portal workflows passed. Application code was not changed, and anti-slop was not used.

## Confirmed issues

### CH-01: reopening bypasses the lecturer break (P1)

Create a scheduled session from 10:00 to 10:40 and a cancelled session for the same lecturer from 10:40 to 11:20. As the lecturer, POST `/api/v1/livekit/reopen/{cancelled-session-id}`.

Expected: HTTP 400, because the new lecturer scheduling rule requires a ten-minute gap. Actual: HTTP 201; the cancelled session becomes SCHEDULED immediately after the first session. The reopen query checks actual overlap, while booking/rescheduling use a buffered conflict window. The token route with `reopen=true` delegates to the same reopening path.

The failing API check is `reopening must preserve lecturer ten-minute break` in `backend/test/changes-oct6-qa.cjs`. It creates two isolated fixtures and deletes them after the check. Response and timestamp are recorded in `output/changes-qa-2026-10-06/api-results.json`.

### CH-02: valid saved hours display as missing (P2)

Save `{ "preferredHours": [10] }` using PUT `/api/v1/profile/student`, then open Student Settings. The API returns HTTP 200 and stores the hour, but the UI displays “Availability not provided.”

`frontend/src/lib/student-availability.ts` formats only complete morning, afternoon and evening blocks. The backend accepts individual integer hours from 0 to 23. The API and display therefore disagree. Display actual saved hours, or enforce the same full-window contract on both sides.

The failing browser check is `partial-hour-display-contract` in `backend/test/changes-oct6-browser-qa.cjs`. Evidence: `output/changes-qa-2026-10-06/partial-hour-display-contract.png` and the matching entry in `browser-results.json`.

## Results

| Verification | Result |
|---|---|
| Final backend unit suite | 187 passed, 24 suites |
| Changed-feature API checks | 45 passed, 1 failed: CH-01 |
| Focused browser checks | 12 passed, 1 failed: CH-02 |
| Cross-portal demo regression | 58 workflows passed |
| Course-request integration | Passed lifecycle, role boundaries, concurrent review and duplicate-notification checks |
| Trial integration | Passed new-account access, claiming, duplicate rejection, expiry and authentication checks |
| Backend build | Passed |
| Frontend TypeScript | Passed |
| Migration deployment | Applied successfully to fresh local databases; final database has no pending migrations |
| Working-tree whitespace | Passed |

The older super-admin API harness also ran: 198 checks passed and 15 assertions failed. Those 15 are not additional confirmed product bugs: nine still exercise the removed manual currency write route, five pricing checks encounter the harness's extra six-plan catalog, and one combined audit assertion expects records from those unsuccessful/retired operations. The replacement manual-route behavior, canonical six-plan save, invalid-price rejection, independent regional prices and pricing reload were checked directly in the new API/browser suites. The original raw failures are retained in `old-admin-api-results.json` rather than reported as a green old-suite run.

## Changes covered

- Student availability: signup selection requirement, mobile form fit, API validation, sorted persistence, settings save/reload and empty-selection prevention.
- Request-based lecturer assignment: registration request creation, matched/unmatched shifts, student authorization denial, repeated assignment rejection, required assignment before resolution, and browser assignment followed by reload.
- Regional pricing: independent LKR/USD prices, server-calculated GBP/EUR/AUD prices, sourced exchange metadata, finance equivalents, price validation, save/reload and CSV export.
- Meeting clock: student start denial, waiting state, lecturer start, repeated-start preservation, outsider denial, 40-minute warning timestamp, 45-minute expiry/completion and rejoin/restart rejection.
- Classroom entry: student entry to a future active session and waiting timer through the local simulation path.
- Existing behavior: login, trial, profile permissions, booking, rescheduling, cancellation, course/lesson access, notes, feedback, assessments, material upload/download permissions, support, messaging, payouts and repeated processing protection, payment confirmation, enquiries and password reset.
- Existing admin Users, Sessions, Feedback and Audit pages rendered at 390px without document overflow.

The unit suite additionally covers lecturer break boundaries, meeting expiry/retry behavior, provider failures/stale snapshots, notification changes and signup demographics validation. Signup browser checks were updated to fill the newly required gender and date-of-birth fields before checking availability validation.

## Charters and session notes

| Charter | Mission | Coverage |
|---|---|---|
| CH-AVAIL | Explore signup, preferred hours and request assignment with role fixtures, malformed values and reloads to discover persistence and matching inconsistencies. | Covered targeted flows; CH-02 found. |
| CH-PRICE | Explore regional pricing and finance with a controlled external rate snapshot and independent LKR/USD changes to discover calculation and existing billing regressions. | Covered local/API/browser flows; real provider/settlement unverified. |
| CH-MEETING | Explore meeting clocks and reopening with active, future, expired and adjacent sessions to discover authorization, timing and break-rule regressions. | API covered; local browser entry covered; CH-01 found. |
| CH-REGRESS | Explore existing cross-portal workflows after these changes with the demo, trial, course-request and unit suites to discover effects outside the new features. | Targeted regression covered; no blanket claim for every unchanged function. |

| Timestamp (UTC) | Tag | Observation |
|---|---|---|
| 2026-10-06T11:49:36Z | NOTE | Old admin harness finished with 198 passes and 15 failures; separated obsolete route/catalog assumptions from product failures. |
| 2026-10-06T11:55:35.646Z | BUG | Adjacent cancelled session reopened with HTTP 201 despite the ten-minute break rule. |
| See `browser-results.json`, `partial-hour-display-contract.at` | BUG | API accepted `[10]`; Settings displayed missing availability. |
| See `browser-results.json` | NOTE | Corrected test setup/selectors for new required demographics, renamed View & assign and Enter classroom controls, and valid Fast Track pricing. Repeated affected checks; only CH-02 remained. |

## Environment, evidence and limits

Tests used disposable local PostgreSQL on port 55441, QA API 3009 and frontend 3019 with an isolated Next build directory. The backend/database were real; external exchange-rate responses, LiveKit transport, email and WhatsApp delivery were stubbed. No hosted data or real payments were changed. Other chats were editing this shared workspace during the run; the final unit/build/type checks were repeated after additional signup changes appeared.

Evidence is under `output/changes-qa-2026-10-06/`: `api-results.json`, `browser-results.json`, screenshots, CSV export, migration logs, `unit.log`, `backend-build.log`, `frontend-types.log`, `demo-regression.log`, `course-requests.log` and `trial.log`. Fixture credentials are temporary and kept in ignored local output.

Not verified end to end: two-person LiveKit audio/video, chat or reaction delivery, real room deletion, live exchange-provider availability, external notifications, payment settlement, Firefox/WebKit, physical devices and load testing. Chat/reaction inspection and TypeScript checks do not prove cross-participant delivery. The 45-minute boundary used a persisted overdue timestamp, not a 45-minute live call. A frontend production build was not rerun in this fast pass.

Reproduction: build the backend, apply migrations to an empty local database, then run `DATABASE_URL=<local-test-url> node test/changes-oct6-qa.cjs --serve` from `backend`. Run the frontend on port 3019 with `NEXT_PUBLIC_API_URL=http://localhost:3009/api/v1`; run `node test/changes-oct6-browser-qa.cjs` for the browser scenarios. The two failing checks intentionally remain red to preserve the findings.

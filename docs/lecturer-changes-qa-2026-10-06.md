# Lecturer changes QA — 6 October 2026

Result: **515 passed, one confirmed failure across 516 checks**. The course-request lifecycle integration suite also passed and is counted separately. This is a focused change and regression pass, not a claim that every possible behavior is covered. Application code was not changed.

## Scope and charters

- Explore lecturer booking breaks, availability and session status with API fixtures and desktop/mobile browsers to discover inconsistent enforcement and regressions.
- Explore meeting clocks with shared student/lecturer API calls, exact time boundaries and controlled browser responses to discover restart, authorization and expiry failures.
- Explore preferred hours and request-based assignment with matching/mismatching shifts and role boundaries to discover validation and permission failures.
- Explore shared regional pricing and course requests with current unit/integration suites to discover effects on existing lecturer workflows.

Recent commits since the previous audit add course requests and unrestricted active-session joining. The working changes add ten-minute lecturer breaks, preferred hours, request-based assignments, meeting timers, status labels, meeting chat/reactions and regional pricing. The changed join policy was treated as intentional, rather than testing against the previous join-window restriction.

## Verification

| Layer | Passed / total | Evidence |
|---|---:|---|
| Backend unit tests, 24 suites | 179 / 179 | `/tmp/ilm-qa-oct6-units.log` |
| Existing lecturer API checks | 242 / 242 | `output/playwright/lecturer-qa-oct6/api-results.json` |
| Boundary, race, permission and privacy checks | 27 / 27 | `output/playwright/lecturer-qa-oct6/boundary-results.json` |
| Desktop/mobile surveys and focused browser regressions | 37 / 37 | `output/playwright/lecturer-qa-oct6/browser-results.json` |
| New feature API checks | 24 / 25 | `output/playwright/lecturer-qa-oct6/changed-api-results.json` |
| Meeting timer browser checks | 6 / 6 | `output/playwright/lecturer-qa-oct6/changed-browser-results.json` |

Backend build, frontend TypeScript check and migration deployment to a fresh isolated PostgreSQL database passed. The 24 page survey states had no WCAG-tagged axe violations. Course-request integration covered request lifecycle, duplicate notification prevention, role/assignment boundaries, validation, concurrent review, initial progress and student notification.

Passed changed-feature scenarios include invalid/duplicate/out-of-range preferred hours, normalized persistence, matching and mismatching assignment shifts, resolved-request replay prevention, lecturer/student clock permissions, reconnect preservation, shared timestamps, forty-minute extension, forty-five-minute completion, expired token denial and direct LKR/USD plan prices. Browser checks covered timer display, warning dismissal and expiry exit, existing status filters, notes dialog keyboard controls, availability views, past-time restrictions, whitespace-only messages, mobile navigation, course controls, foreign-timezone slot preservation and outage recovery.

The old availability harness assumed adjacent slots were allowed. It was updated to leave ten minutes between slots; the new meeting expiry dependency was added to the existing LiveKit stub. These are test-harness changes, not application fixes.

## Confirmed finding

**LCH-01 — P1: Reopening a cancelled session bypasses the ten-minute lecturer break.**

Minimal reproduction:

1. Create a scheduled session for a lecturer from 10:00 to 10:40.
2. Create a cancelled session for the same lecturer from 10:40 to 11:20.
3. As that lecturer, POST `/api/v1/livekit/reopen/<cancelled-session-id>`.

Expected: HTTP 400 because reopening would leave no lecturer break.
Actual: HTTP 201 and the cancelled session becomes SCHEDULED. This can also be reached through the token endpoint with `?reopen=true`, which delegates to reopening.

The reopen overlap query in `backend/src/livekit/livekit.controller.ts` checks actual time overlap. Booking and rescheduling use the new buffered `lecturerConflictWindow`, so reopening is an inconsistent path. Two back-to-back active sessions can therefore exist despite the new rule. The saved failing API test uses a fresh isolated fixture, records the response, then removes the fixture.

Reproduction command while the isolated lecturer QA server is serving: `cd backend && node test/lecturer-changes-qa.cjs`. The failing check is named `Reopen enforces lecturer ten-minute break`.

## Session log

| Time (UTC) | Tag | Observation |
|---|---|---|
| 2026-10-06T11:48:26.661Z | NOTE | Started changed-feature API checks after builds, units and migrations passed. |
| 2026-10-06T11:48:26.821Z | BUG | Reopen returned 201 where lecturer break requires 400; response saved. |
| 2026-10-06T11:49:27.504Z | NOTE | Timer display, warning, dismissal and expiry exit passed. |
| 2026-10-06T11:49:48.195Z | NOTE | Final focused browser regression passed. |

## Coverage limits

API and browser runs used isolated local PostgreSQL, API port 3012 and frontend port 3003. Email, WhatsApp and LiveKit room transport were stubbed. The browser warning/expiry scenarios used controlled server-clock responses; actual database expiry was separately checked through the API.

Real two-participant LiveKit chat, reactions, audio/video, reconnect transport and provider room shutdown remain **unverified**. Chat/reaction components were inspected and type-checked, but that is not proof that messages reach another participant. Regional pricing provider failure/stale-rate paths passed mocked unit tests; live financial settlement was not exercised. Firefox/WebKit, physical devices and screen-reader testing were outside this fast pass. The frontend was tested with the development server; a frontend production build was not rerun.

No other regressions were observed in the checks run. The remaining failure prevents a clean pass for the new lecturer-break rule.

Teardown verified zero users, sessions and courses remained in the isolated database. The QA API, frontend and database servers were stopped and their temporary build/database directories removed. Other local development servers and concurrent workspace changes were preserved.

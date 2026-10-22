# SUPER admin portal QA — 5 October 2026

**Assessment: changes needed before release.** Tested the application as a real `SUPER_ADMIN` fixture through the shared `/admin` portal, including all eight portal routes and their API operations. Attendance, credential handling, assignments, input validation, and audit coverage have confirmed defects.

| Execution | Checks | Passed | Failed assertions |
|---|---:|---:|---:|
| Real API + PostgreSQL | 221 | 161 | 60 |
| Chromium browser workflows, responsive layout, keyboard, axe | 83 | 54 | 29 |
| Zod response contracts + financial reconciliation | 12 | 12 | 0 |
| Existing backend Jest suite | 98 | 98 | 0 |
| **Total** | **414** | **325** | **89** |

Failed assertions are not distinct bugs. Several exercise the same defect with different inputs or widths. Token lifecycle, pending-account behavior, stricter payload rejection, payload length, and cache-header assertions include policy assumptions; those are distinguished below. Final browser results contain zero harness errors. Initial selector/setup errors were corrected and their affected scenarios rerun; the append-only execution log retains those earlier attempts.

## Environment and artifacts

- Working tree tested: the current local checkout. Application source was not changed.
- Frontend: Next.js dev server, `http://localhost:3000`; backend: NestJS with its actual modules, Prisma, PostgreSQL, validation pipe, JWT and cookie authentication.
- Disposable local PostgreSQL 16 cluster: `127.0.0.1:55441`. Final API database: `super_api_full`, API port `3003`. Browser database: `super_browser`, API port `3002`.
- Browser: headless Chromium; fresh context per case; Asia/Colombo timezone. Survey widths: 1440, 768 and 390; additional reflow checks at 320.
- Email and WhatsApp delivery stubbed at the service boundary. No hosted database was mutated and no real payment was transferred. Payout tests record status changes in the local database.
- Backend build passed; 17 Jest suites / 98 tests passed.

Reusable runners:

- [API runner](../backend/test/super-admin-portal-qa.cjs)
- [Browser runner](../backend/test/super-admin-browser-qa.cjs)
- [Response-contract runner](../backend/test/super-admin-contract-qa.cjs)

Evidence:

- [API results](../output/super-admin-qa/api-results.json): timestamps, inputs, expected/actual HTTP status, predicate outcomes, redacted responses, headers, durations.
- [Browser results](../output/super-admin-qa/browser-results.json): timestamps, verdicts, accessibility snapshots, browser errors, axe nodes, overflow measurements, and captured CSV contents.
- [Contract results](../output/super-admin-qa/contract-results.json).
- [Every new QA case](super-admin-qa-case-inventory-2026-10-05.csv).
- [Timestamped session observations](../output/super-admin-qa/session-log.json).
- Screenshots use the browser scenario name under `output/super-admin-qa/`.
- Fixture files contain disposable test credentials/tokens and remain in ignored `output/`; they are not part of the report or committed test code.

## Charters and coverage

| Charter | Information goal and execution | Coverage / debrief |
|---|---|---|
| SA-AUTH | Explore owner authentication and privileges with anonymous/student/lecturer/admin/owner identities, malformed/expired/forged claims, suspension/deletion/logout and direct URLs to discover access-boundary failures. | API read/write boundaries covered. Browser login, expired session, logout, anonymous and student config covered. Token lifecycle policy remains open. |
| SA-USERS | Explore user administration with malformed fields, Unicode, duplicate emails, role mismatches, suspended lecturers, assignments and shifts to discover invalid or inconsistent account state. | API boundaries and browser create/search/filter/suspend/reactivate/assign/edit shifts covered. Deep invitation delivery and concurrent duplicate creation remain untested. |
| SA-OPS | Explore sessions, support, enquiries and feedback with past/future/terminal states, search, empty lists, replies, resolution/reopening, CSV, markup strings and outages to discover incorrect transitions and misleading data. | API and browser core operations covered. Attendance defects and export defect reproduced. Every supported operation is not every possible sequence or combination. |
| SA-FINANCE | Explore owner finance/configuration with price/rate boundaries, failed requests, invalid bulk payloads, real local payouts, concurrent processing and successful/failed payments to discover financial inconsistencies. | Save/reload/retry, duplicate-submit disablement, reconciliation and concurrent payout covered. External gateway settlement, production FX and real transfers untested. |
| SA-AUDIT-UI | Explore all eight pages with volume beyond list limits, desktop/tablet/mobile, keyboard and axe to discover missing records, inaccessible controls and failure-state gaps. | List caps reproduced, all routes surveyed at three widths, four routes at 320. Keyboard probes covered selected dialogs/navigation. Real screen-reader and cross-browser checks remain untested. |

The observations in `session-log.json` carry timestamps, a charter and NOTE/BUG/RISK tags. The case inventory records passes and failures without treating a source review as a runtime test.

## Confirmed defects, ordered by impact

Fix follow-up: `super-admin-fixes-2026-10-05.md` records the implementation and passing regressions. The observations below remain the original baseline.

P1 means a material correctness/security/accountability issue to fix before release. P2 means a functional, validation, recoverability or accessibility issue needing remediation. Severity reflects this test environment; no production exploitation is claimed.

| ID | Priority | Reproduction / expected behavior | Observed evidence |
|---|---|---|---|
| SA-01 | P1 | As SUPER_ADMIN, PATCH `/admin/users/{lecturer-or-owner}/status` to a valid state; response must exclude credentials. | HTTP 200 includes `passwordHash`. Also present for missing-status requests. Raw hash is redacted in saved evidence. `suspend lecturer`, `super admin suspend another owner`. Backend `admin.service.ts:272`. |
| SA-02 | P1 | Sessions → search a past scheduled fixture → Mark No-Show → Lecturer Absent → Confirm Absent. | Request succeeds with `NO_SHOW_STUDENT`. UI reports lecturer absence while backend records student absence. `sessions-lecturer-absent-status`. Frontend `sessions/page.tsx:141`. |
| SA-03 | P1 | POST assignment with an ADMIN user as the student ID; should reject role mismatch. | HTTP 201 creates a student profile for an ADMIN. `assignment admin as student rejected`. Backend `admin.service.ts:198`. |
| SA-04 | P1 | Suspend a lecturer, then assign a student to that lecturer; should reject an unavailable account. | HTTP 201 assigns the suspended lecturer. `assignment suspended lecturer rejected`. |
| SA-05 | P1 | POST `/bookings/{future-session}/absent` before the session. | HTTP 201 changes a session 72 hours ahead to an absence. `future absent rejected`. |
| SA-06 | P1 | Change status, process payout, or edit lecturer hours; then inspect `/admin/audit-logs` for actor/entity/action. | Creation, assignment and pricing/rates have records; tested suspension/status/payout/hours operations do not. Both audit assertions fail before volume probes. `audit covers owner status payout and hours`. |
| SA-07 | P1 | PATCH lecturer hours with null, string, object, duplicates, fractional/out-of-range values or an undersized array. | HTTP 200 stores invalid availability JSON. This field drives working shifts. `invalid working hours ...`, `availability malformed ...`. |
| SA-08 | P1 | As the ticket-owning STUDENT, POST a reply with `newStatus: RESOLVED`. | HTTP 201 applies a status supplied by a non-admin. A student can choose operational status through the reply endpoint. `support student cannot choose admin status`. Backend `support.service.ts:135`. |
| SA-09 | P2 | PATCH support status to `INVALID`; supported states are PENDING/IN_REVIEW/RESOLVED in the portal. | HTTP 200 persists `INVALID`, outside portal filters. Empty body is also accepted as an unchanged update. `support invalid status rejected`, `support status missing rejected`. |
| SA-10 | P2 | POST ticket message with whitespace, omitted message or number. | Whitespace stores an empty message (201); missing/numeric text produces 500. Browser disables whitespace correctly, but the API can bypass it. |
| SA-11 | P2 | Create lecturer with a whitespace-only full name or invalid hours. | Whitespace passes DTO validation, then trimming stores an empty name. Invalid hours arrays also pass. `invalid lecturer input 1`, `invalid lecturer input 10`. |
| SA-12 | P2 | Query users with invalid role/status or PATCH status to an unsupported enum. | HTTP 500 rather than a validation 400. SQL-like role text also yields 500; this is not evidence of SQL injection. |
| SA-13 | P2 | PATCH user status with `{}`; reject missing required status. | HTTP 200 returns an unchanged user including the credential hash. `status missing`. |
| SA-14 | P2 | Suspend a lecturer and GET `/admin/users?role=LECTURER`. | User status is SUSPENDED but lecturer-profile status remains ACTIVE. `lecturer profile status sync`. |
| SA-15 | P2 | Record dashboard weekly count, add a scheduled session 70 days away, read count again. | `sessionsThisWeek` increases. Query has no upper bound. `weekly stats exclude session 70 days away`. Backend `admin.service.ts:34`. |
| SA-16 | P2 | Seed more than 200 sessions/ratings, 100 audit records, or 50 successful payments/payouts; retrieve the lists. | Responses silently cap at 200/200/100/50/50 without total or server pagination. Earlier records cannot be reached by portal search/export. Financial aggregate still correctly includes all 55 successful payments. |
| SA-17 | P2 | Open owner dashboard at 390 px and find a visible route to every portal area. | Users, Sessions, Finance, Feedback, Audit and Config navigation absent. Dashboard/Requests links remain. `mobile-all-owner-routes-reachable`. |
| SA-18 | P2 | Set `ilm_admin_role` to `staff`, reload as real SUPER_ADMIN. | Finance, Configuration and Audit navigation disappear while owner financial dashboard remains. UI preference is not derived from authenticated role. `stale-staff-preference-owner-navigation`. |
| SA-19 | P2 | Users → Admins filter. | Ordinary ADMIN fixtures appear; SUPER_ADMIN fixture disappears. `admins-filter-includes-super-admin`. |
| SA-20 | P2 | As a STUDENT, or anonymously, navigate directly to `/admin/config`. | Editable configuration controls and admin shell render. Student save is correctly denied with 403; no unauthorized write succeeded. Anonymous config renders because the reads are public. |
| SA-21 | P2 | Return HTTP 503 for sessions/support-list/currency-list reads. | Sessions and requests report empty results instead of service failure. Currency form becomes empty/disabled with no error. Other tested pages show errors and recover after the interception is removed. |
| SA-22 | P2 | Name a student `=HYPERLINK("https://example.test","QA")`; export Sessions CSV. | Downloaded cell has unescaped internal quotes and a leading formula prefix without neutralization. Captured in `sessions-formula-probe.csv`. Finance and enquiry helpers correctly quote/escape their exports. |
| SA-23 | P2 | At 390 or 320 px, open Feedback. | Document width is 463 px; ratings filters cause page overflow. `feedback-390`, `feedback-320-reflow`. |
| SA-24 | P2 | Open Add Lecturer or request conversation, focus a field, press Escape; inspect dialog role. | Dialog remains and no dialog role is exposed. `users-dialog-escape`, `requests-dialog-escape`. Full focus-trap behavior remains untested. |
| SA-25 | P2 | Read a 4-star feedback row via accessibility tree. | Rating cell has no announced score. `feedback-rating-announced`. |
| SA-26 | P2 | Run axe on the initial pages at tested widths. | Sessions course select has no accessible name; overflow tables in Feedback, Audit and Requests lack keyboard-focusable scroll regions; contrast failures appear on dashboard payout figure (2.33), user details (3.18), request badges (4.46). Full affected nodes/widths are in browser JSON. |
| SA-27 | P2 | Focus Notifications → Enter → Escape. | `aria-expanded` stays true and dropdown remains expanded. `notifications-keyboard-escape`. |
| SA-28 | P2 | Collapse desktop sidebar; inspect the remaining expand button. | Accessible snapshot is simply `button`, with no Expand name. `sidebar-collapse-accessible-expand`. |

## Policy-dependent failures and hardening questions

These assertions are included in the 60 API failures but are not counted as additional proven business-policy violations:

- **Logout token revocation:** logout clears the browser cookie; the issued bearer token still works. The browser logout-and-revisit flow passes. Decide whether logout must revoke tokens server-side, including tokens copied before logout.
- **Reactivation:** the pre-suspension owner token becomes valid again after reactivation. Suspension blocks it while suspended and soft deletion blocks it. Decide whether reactivation should require fresh login.
- **PENDING admin:** a token for an administrator changed to PENDING can still read stats. Define allowed administrator lifecycle states.
- **Strict payload handling:** lecturer update ignores unknown `status`/`payoutDetails` rather than returning 400; no mass-assignment succeeded. Some create fields accept/coerce unexpected values or are ignored (`hourlyRate`, `specializations`, language items). Specify the accepted contract before treating all strictness assertions as defects.
- **Reply length:** a 10,001-character support reply is accepted. The test assumes a 10,000-character ceiling, but the repository does not declare one. Define a limit.
- **Private-response caching:** six read endpoints have JSON content type but omit `Cache-Control: no-store`. This does not prove a shared-cache leak; explicitly define the caching contract for privileged data.
- **Staff/owner privileges:** ADMIN is permitted by the server to read finance/config and change other administrator statuses. The requested owner test does not establish whether this distinction is intentional.

## Passing behavior

Anonymous/student/lecturer access is denied on the tested privileged API read/write endpoints. A signed JWT with a STUDENT subject and forged SUPER_ADMIN role claim remains denied because the database role is checked. Expired/malformed tokens, suspended and deleted accounts are rejected; SUPER_ADMIN registration is rejected.

Valid lecturer creation and Unicode names, case-insensitive duplicate-email rejection, valid assignment, notes save, cancellation and terminal-state protection, successful/failed payouts, and concurrent payout processing passed. Concurrent processing allows exactly one successful transition.

Prices and currency rates validate their important numeric/date boundaries and duplicate/missing IDs. Invalid plan bulk updates do not partially write. Browser saves survive reload, failed saves retain input and retry, loading is visible, and a pending price save disables duplicate submission. LKR stays fixed at one.

Monthly revenue excludes failed payments. Revenue by plan includes all 55 successful payments even though the recent-payment list caps at 50. All eleven response schemas and the browser-dataset revenue reconciliation passed.

Support reply/resolve/reopen, role/search filtering, empty states, safe literal rendering of tested markup strings, configuration errors/recovery, payout failure feedback, and finance/enquiry CSV downloads passed. This is scoped evidence, not proof that every possible markup payload is safe.

## Replay

Use fresh disposable local databases; the seed fixtures use stable email addresses, so a rerun against an already-seeded database will conflict. Do not point these runners at a hosted database. The API runner and browser seed reject non-local database hosts.

From `backend`, with PostgreSQL already running on 55441:

```sh
npm run build
createdb -h 127.0.0.1 -p 55441 -U qa_super super_api_replay
DATABASE_URL='postgresql://qa_super@127.0.0.1:55441/super_api_replay' npx prisma db push
QA_DATABASE_URL='postgresql://qa_super@127.0.0.1:55441/super_api_replay' QA_API_PORT=3003 node test/super-admin-portal-qa.cjs
```

For browser testing, first create/push a separate fresh local browser database, then start fixtures/API:

```sh
createdb -h 127.0.0.1 -p 55441 -U qa_super super_browser_replay
DATABASE_URL='postgresql://qa_super@127.0.0.1:55441/super_browser_replay' npx prisma db push
QA_DATABASE_URL='postgresql://qa_super@127.0.0.1:55441/super_browser_replay' node test/super-admin-portal-qa.cjs --serve
```

Start frontend in another terminal using `NEXT_PUBLIC_API_URL='http://localhost:3002/api/v1' npm run dev`. From `backend`, run:

```sh
QA_DATABASE_URL='postgresql://qa_super@127.0.0.1:55441/super_browser_replay' node test/super-admin-browser-qa.cjs
node test/super-admin-contract-qa.cjs
npm test -- --runInBand
```

Browser dependencies currently use installed local Playwright/axe paths. Set `QA_PLAYWRIGHT_PATH` to the Playwright module directory and `QA_AXE_PATH` to `axe.min.js` for another machine. Browser `--only=scenario-name,...` replaces selected results in the accumulated file; use only when the fixture state still supports those cases. The mutation workflows should be replayed against fresh fixtures for a complete run.

QA runners deliberately exit nonzero when assertions fail. They are regression probes for the current defects, not a green release gate. The contract runner imports the frontend's Zod package.

## Explicit limits and next coverage

This run covered every discovered portal area, but it cannot claim every possible case or 100% coverage. Not executed: Firefox/WebKit, real phone hardware, VoiceOver/NVDA, full keyboard traversal/focus trapping, dark-mode matrix, high load/soak, network latency races across multiple tabs, concurrent assignments/account creation, all timezones/DST/month-rollover cases, production deployment behavior, external invitation delivery, real payment settlement, backup/restore, all classroom transport features, broad penetration testing, and policy-specific last-owner/self-suspension protections.

The first follow-up session should retest SA-01 through SA-08 after fixes. Then run a browser matrix and time-boundary/financial-rollover session with agreed owner lifecycle and token policies. Those sessions are documented here as deferred; no scheduled automation was created.

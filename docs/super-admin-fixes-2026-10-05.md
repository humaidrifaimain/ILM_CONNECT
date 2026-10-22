# Super administrator fixes, 5 October 2026

All 28 confirmed findings in `super-admin-portal-qa-2026-10-05.md` have fixes and passing regression evidence. Changes are in the local workspace; no production deployment was performed.

## Fixes against the report

| Finding | Result | Verified behavior |
|---|---|---|
| SA-01 | PASS | Account status responses select public fields and exclude password hashes. |
| SA-02 | PASS | Lecturer absence stores `NO_SHOW_LECTURER`, with the corresponding audit event and notification wording. |
| SA-03 | PASS | Lecturer assignment rejects accounts whose role is not STUDENT. |
| SA-04 | PASS | Assignment requires an active, non-deleted lecturer account and profile. |
| SA-05 | PASS | Attendance cannot be recorded before the session starts. |
| SA-06 | PASS | Status, payout and lecturer-hour changes record the acting administrator in the same database transaction. |
| SA-07 | PASS | Hours require 4 to 24 unique integers between 0 and 23. Malformed and missing values are rejected. |
| SA-08 | PASS | A requester cannot supply an administrator ticket status through a reply; HTTP 403. |
| SA-09 | PASS | Support statuses are restricted to PENDING, IN_REVIEW and RESOLVED. |
| SA-10 | PASS | Missing, numeric, blank and oversized replies are rejected before writes. |
| SA-11 | PASS | Lecturer names are trimmed and cannot be blank. Creation validates availability and list fields. |
| SA-12 | PASS | Unsupported role/status filters and status updates return validation errors. |
| SA-13 | PASS | A status update requires a valid status. |
| SA-14 | PASS | Lecturer profile and account status are updated together. |
| SA-15 | PASS | Weekly session counts use both a start and an exclusive end date. |
| SA-16 | PASS | The former silent list caps are removed; older sessions, feedback, audit records, payments and payouts remain reachable. |
| SA-17 | PASS | All eight existing admin routes are visible in mobile navigation. |
| SA-18 | PASS | Navigation uses the authenticated account, ignoring the stale local staff preference. |
| SA-19 | PASS | The Admins filter includes ADMIN and SUPER_ADMIN. |
| SA-20 | PASS | Anonymous visitors return to sign-in; students return to their dashboard before privileged controls render. Server writes remain forbidden. |
| SA-21 | PASS | Sessions, requests and currencies show service errors and working Retry controls. |
| SA-22 | PASS | Session exports use the existing CSV helper to escape quotes and neutralize formula prefixes. |
| SA-23 | PASS | Feedback filters wrap and the page fits at 320px and 390px. |
| SA-24 | PASS | Dialogs have accessible names, initial focus, Tab trapping, Escape dismissal and focus restoration. |
| SA-25 | PASS | Feedback exposes the numeric rating in its accessible name. |
| SA-26 | PASS | Course filtering is named, table scroll regions accept keyboard focus, and the reported contrast failures are corrected. |
| SA-27 | PASS | Escape closes Notifications and returns focus to the bell. |
| SA-28 | PASS | The collapsed sidebar button is named Expand. |

The additional dialog checks found another low-contrast Pending badge in the request conversation. It is corrected, along with darker reply-action text. Fabricated fallback personal names in the shared navigation were replaced with account or role labels.

## Hardening decisions

- Logout increments the account's token version, revoking existing tokens for that account across sessions.
- Account state changes invalidate existing tokens. Reactivation requires a new login.
- ADMIN and SUPER_ADMIN require ACTIVE status to log in and pass the JWT guard. Lecturer onboarding behavior is preserved.
- Replies are limited to 10,000 characters in the API and textarea.
- Privileged admin reads explicitly return `Cache-Control: no-store`.
- Existing ADMIN access to finance/configuration and administrator account changes is preserved. This report does not introduce a new staff permission model or last-owner protection.

The lists still use their existing array response contracts. Removing the caps fixes missing search/export records, but response size now grows with data volume. Server pagination would be a separate API and frontend change.

## Verification

| Check | Result | Evidence |
|---|---|---|
| API regression | 221/221 | `output/super-admin-qa/api-results.json`, `api-final.log` |
| Browser regression | 87/87 | `output/super-admin-qa/browser-results.json` |
| Response contracts | 12/12 | `output/super-admin-qa/contract-results.json` |
| Dialog keyboard/accessibility | 6/6 | `output/super-admin-qa/dialog-results.json` |
| Backend unit suite | 113/113, 18 suites | `output/super-admin-qa/unit-final.log` |
| Backend build | PASS | Prisma generation and Nest compilation |
| Frontend production build | PASS | `output/super-admin-qa/build-final.log` |
| Frontend TypeScript | PASS | Independent `tsc --noEmit`; build configuration skips type checking |
| Changed admin/layout files ESLint | PASS | Admin pages, shared navigation/shell, enquiry table and dialog hook |
| Diff whitespace | PASS | `git diff --check` |

Tests use disposable local PostgreSQL databases and stub external email/WhatsApp delivery. Original result JSON is retained under `output/super-admin-qa/before-fixes/`. Browser checks cover all eight pages at 1440px, 768px and 390px, selected pages at 320px, failure/empty/loading states, mutations followed by reload, and hostile text/CSV inputs. Dialog checks add keyboard and axe scans at 1440px, 390px and 320px.

A local Node 25 development server crashed and interrupted some checks. Those were rerun using the bundled Node 24 runtime, with final results replacing the interrupted results. Logout tests use a separate administrator account so token revocation does not invalidate later tests. Request-dialog tests await its closing animation before asserting removal. The expected student status-selection response is 403 because it is an authorization rejection.

This verification does not cover real payment settlement, external message delivery, production infrastructure, Firefox/WebKit, physical devices or screen-reader operation. The portal currently forces light mode and exposes no theme toggle; these results cover that shipped mode.

## Anti-slop delivery gate

Scope: the admin fixes and changed shared controls. Direction: retain the existing green operational portal, with dense data tables and task forms. ENERGY 1 / RHYTHM 1 / MOTION 1. The direction was declared before the final UI iteration; no redesign or new visual assets were introduced.

Each item below is a PASS for this change scope, with the evidence stated alongside it.

| Gate | Result and evidence |
|---|---|
| R-02, text punctuation | PASS: changed UI copy has no em dashes; absent values use existing plain labels or None. |
| R-03, mobile fit | PASS: page-width checks and screenshots at 320/390/768/1440px; dialog bounds checked at 320/390/1440px. |
| R-17, statistics | PASS: dashboard values come from tested database aggregates; weekly count has bounded dates. |
| R-18, testimonials | PASS: none added. |
| R-23, assets/navigation | PASS: no generated assets; mobile navigation exposes the same eight existing routes requested in the QA scope. |
| R-24, links | PASS: all eight admin route destinations rendered in browser checks; shared admin notification destinations use admin sessions/requests. |
| R-25, contrast | PASS: 24 page/viewport axe checks and six dialog scans; reported foreground colors and the extra dialog badge corrected. |
| R-26, controls | PASS: mutations, filters, downloads, retries, dialogs, notifications and sidebar controls have working handlers and passing checks. |
| R-27, states | PASS: API outage, empty-result, loading and save-failure checks are recorded. |
| R-28, FAQ | PASS: no FAQ added. |
| R-32, keyboard | PASS: named scroll regions, six dialog Tab/Shift+Tab/Escape/focus-return checks, notification Escape and named Expand button. |
| R-33, source edits | PASS: UI edits were made directly with patches; no external source-rewrite script. |
| R-34, theme | PASS: changes use the shipped light mode; no visible theme toggle or new alternate mode. |
| R-35, execution | PASS: local browser click-through, independent TypeScript check and production build recorded above. |
| R-36, claims | PASS: no security, compliance or customer marketing claims added; test limits stated. |
| R-37, direction | PASS: existing portal identity retained, explicit dials declared for the final UI iteration. |
| R-38, factual content | PASS: production displays database values; synthetic names/data are limited to disposable QA fixtures. |
| R-01, gradients | PASS: none added. |
| R-04, icons | PASS: icons identify existing tasks; In Review now uses a conversation icon instead of sparkles, and feedback stars encode a numeric rating. |
| R-06, typography | PASS: existing portal typography retained; small monospace text remains limited to identifiers. |
| R-07, backgrounds | PASS: no grid, dot or blueprint background added. |
| R-08, arrows | PASS: no decorative arrow CTAs added. |
| R-09, badges | PASS: badges show actual account/session/request state rather than marketing claims. |
| R-10, glass | PASS: opaque navigation; overlay blur remains limited to active dialogs to separate the task from the underlying page. |
| R-12, shadows | PASS: existing dialog elevation separates the active task; no new decorative card shadows. |
| R-13, glows | PASS: none added. |
| R-14, cards | PASS: no feature-card template added; existing data tables/forms retained. |
| R-19, motion | PASS: short existing entry/exit transitions only; focus and assertions wait for completion. |
| R-22, illustrations | PASS: none added. |
| Dials and consistency | PASS: restrained operational interface retains ENERGY 1 / RHYTHM 1 / MOTION 1. |
| Focal points | PASS: each tested screen has its existing task heading and relevant table/form. |
| Whitespace | PASS: rows, filter groups and dialog sections use spacing to separate tasks; mobile filters wrap. |
| Accent | PASS: existing green active navigation and primary actions retained; stronger text colors improve readability. |
| Identity motif | PASS: existing Ilmbit mark, green navigation and course/lecturer terminology retained. |
| Design Read | PASS: existing direction stated before final UI iteration and verification. |
| C-1, intentionality | PASS: changes address specific report findings; no decorative redesign. |
| C-2, completeness | PASS: handlers and mutation/reload/error checks recorded above. |
| C-3, composition | PASS: eight operational areas retained; no template sections added. |
| C-4, resilience | PASS: tested widths, failure states and keyboard behavior recorded above. |
| C-5, evidence | PASS: test counts link to results; statistics remain data-backed. |
| R-05, templates | PASS: no hero, trust strip or marketing layout added. |
| R-11, radius | PASS: existing table, input, status and dialog radius hierarchy preserved. |
| R-15, CTAs | PASS: actions use specific verbs such as Retry, Export CSV, Add Lecturer and Confirm Absent. |
| R-16, buzzwords | PASS: no promotional AI wording added. |
| R-20, specificity | PASS: changes preserve course enquiries, lecturer shifts, attendance, LKR payouts and operational request workflows. |
| R-21, dark default | PASS: no forced dark theme or deferred toggle introduced. |
| R-29, palette | PASS: existing green/neutral palette; semantic amber/red/blue remain tied to state. |
| R-30, cloning | PASS: no borrowed product layout or visual redesign. |
| R-31, reasons | PASS: each visual change serves reported navigation, readability, focus or reflow failures. |

The gate assesses these fixes, not a claim that the entire existing site is free of every design defect.

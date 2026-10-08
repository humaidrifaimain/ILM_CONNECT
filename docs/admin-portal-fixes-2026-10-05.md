# Admin portal fixes — 5 October 2026

The 19 findings in [the original QA report](admin-portal-qa-2026-10-05.md) have corresponding fixes in the working tree. Verification used disposable local PostgreSQL databases; no hosted records, real payouts, or external notifications were changed. Several shared fixes were made by the concurrent portal chats and verified here.

## Changes and evidence

| Findings | Result | Verification |
|---|---|---|
| ADM-01, 03, 08 | Status responses omit password hashes; lecturer/user status stays aligned; status changes and payouts record audit entries. | Real API and database assertions pass. |
| ADM-02, 03 | Assignments require a student target and an active lecturer. | Wrong-role and suspended-account requests are rejected. |
| ADM-04, 10–14 | Names, profile arrays, hours, enum filters, required statuses and support messages are validated. | Boundary requests return controlled errors; valid requests still succeed. |
| ADM-05, 06 | Attendance distinguishes lecturer and student absence; future and terminal sessions reject attendance changes. | API assertions pass. Browser lecturer absence persists as “No-Show (Lecturer)” and the confirmation agrees. |
| ADM-07 | A student cannot select administrative ticket status through a reply. | HTTP 403; database status stays IN_REVIEW. |
| ADM-09 | All eight admin pages expose mobile navigation. | Each page visited through its navigation link at 320 × 780. |
| ADM-15 | Sessions reports an API failure with Retry and disables export. | API stopped deliberately; browser shows “Unable to load sessions.” |
| ADM-16 | Student access to admin pages redirects before admin controls render. | Student direct navigation to admin configuration returns to the student dashboard. |
| ADM-17, 19 | Feedback filters wrap; rating has an accessible name; decorative stars are hidden from assistive technology. | Feedback document width is 320 at a 320-pixel viewport; rating exposes “4 out of 5 stars.” |
| ADM-18 | Admin dialogs expose dialog semantics and handle Escape. Shared hook adds focus trapping and restoration. | User creation, attendance and request dialogs dismiss with Escape. User creation restores focus to Add Lecturer; request restores focus to View & Reply. Full screen-reader behavior was not tested. |

Additional source risks were addressed: sessions export uses the shared CSV quoting/formula-protection helper; pending admin tokens are denied; navigation uses the authenticated role; weekly session totals have an upper date bound; monthly payouts use completion date; hard list caps were removed. New API assertions verify distant sessions are excluded from this week's count and a payment initiated last month but completed this month is included in this month's total. High-volume response performance and timezone/month rollover behavior remain untested.

The feedback fix needed one further correction during verification: absolutely positioned hidden rating text contributed to page overflow inside the scrolling table. The rating now uses an image role with an accessible name. The request conversation close button also has a spoken label.

## Validation

- Admin API regression: **146 / 146 passed**, including role boundaries, malformed data, duplicate processing, database effects and reporting dates.
- Backend Jest: **98 / 98 passed**, across 17 suites. Transactional booking mocks were updated for locking, slot claiming and subscription checks.
- Backend build: passed.
- Frontend TypeScript check: passed after the final UI edits.
- All eight mobile routes: navigation present and document width no greater than 320 pixels. Wide tables scroll within their containers.
- Browser attendance, dialog dismissal, student redirect and sessions outage checks: passed.
- Git whitespace check: passed.

Evidence: `output/admin-fix-final/api-results.json`, `output/admin-fix-browser/mobile320.json`, `feedback320.png`, `lecturer-absence-fixed.png`, `student-redirect.txt`, and `api-outage.txt`. The initial intermediate API results remain separate in `output/admin-fix-qa`; the final results are in `output/admin-fix-final`.

Antislop ran in **during** mode. The portal keeps its existing green design. Changes focus on usable navigation, contained mobile scrolling, clear error messages, keyboard dismissal and accessible labels. No new imagery or generic marketing copy was introduced.

These checks do not establish exhaustive coverage. Real payment and notification delivery, classroom integrations, a full WCAG audit, other browser engines, production deployment and load testing were outside this verification. The original report remains the historical baseline; this document records the fixes and their actual verification scope.

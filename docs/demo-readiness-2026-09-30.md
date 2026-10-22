# Demo readiness — 30 September 2026

## Outcome and scope

Core admin, super admin, lecturer, and student workflows are implemented and pass the automated checks listed below. Payment gateway integration is excluded at the user's request. Live video is considered user-verified and was excluded from further connection testing or changes.

The latest browser visual and interaction pass remains unverified: browser automation could not verify its administrator-enforced security policy. This report does not certify every screen or an end-to-end two-person live class. Use the walkthrough below before the team demonstration.

## Delivered changes

- Shared dashboard layout, role-specific logo destination, top-only page heading, and full-width content. Configuration now has the correct heading and editable saved prices.
- Shared compact calendars for students and lecturers, with matching rounded selected slots, brand colors, visible lock reasons, and only the assigned lecturer's shift hours. Lecturer session calendars also show locked slots.
- Removed fabricated dashboard statistics, finance amounts, charts, students, reviews, and fallback profiles. Missing records show zero or an honest empty state; optional missing student progress does not prevent dashboard loading.
- Three subscription course cards with Standard/Fast Track selection and an additional-price upgrade option. Expired trials block protected dashboard content behind the subscription dialog. Selecting a plan does not activate a subscription.
- Six underlying plan prices persist atomically in the shared database catalog. Configuration, Landing, About, Pricing, the trial dialog, and student billing use that catalog. Editing prices does not reprice existing contracts.
- Configuration supports United States/USD, United Kingdom/GBP, Europe/EUR, and Australia/AUD, plus Sri Lanka/LKR as the base. Rates are LKR per one unit of each currency. A country/currency selector is available on subscription pricing surfaces; a student's profile country supplies the default. Admins can edit conversion rates and their dates. Financial ledgers and lecturer payouts retain their recorded currencies, including LKR.
- The LKR base uses the [CBSL USD/LKR indicative rate](https://www.cbsl.gov.lk/cbsl_custom/charts/usd/oneweek.php), 330.793 on 29 September 2026, combined with the previously saved [ECB cross-rates](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml) from that date. Existing regional price relationships are preserved. Rates are saved and manually editable, not automatically refreshed live rates.
- Student feedback can be entered after leaving a started class and revisited from the course feedback page. A lecturer can save session notes, mark a started session completed, record graded assessments, and advance assigned student progress. Students see the saved results.
- Real authenticated shared-material uploads and downloads for PDF, JPEG, and PNG, up to 10 MB. Local files persist in backend/uploads/materials unless MATERIAL_UPLOAD_DIR is configured; access is restricted to the uploader, the session's student, or administrators. Lesson outlines also download as actual text files.
- Finance and lecturer earnings exports now generate CSV files. Billing displays actual payment history. Empty ledgers remain empty.
- Password recovery and single-use password reset are connected. Resetting a password revokes old login tokens. Public registration cannot create administrator accounts; student registration creates its profile atomically.
- Profile edits persist and reject protected assignment/shift fields. Availability rejects overlaps, booking operations enforce ownership and allowances, and support requests/replies and message reads use actual records.
- Public trial enquiries persist in the backend, appear in Admin Requests, and can be exported. Submitting an enquiry does not activate a trial or subscription.
- Lecturer withdrawal requests use the actual available session-block balance. Duplicate withdrawals are prevented; a failed payout releases the balance for retry, and successful processing records an externally completed payout.

## Verification

| Check | Result |
| --- | --- |
| Backend unit tests | 17 suites, 98 tests passed |
| Isolated API workflow checks | 58 passed |
| Existing account logins | Student, lecturer, admin, super admin passed |
| Live localhost authenticated reads | 40 passed |
| Frontend and backend TypeScript | Passed |
| Targeted frontend lint | Passed |
| Backend production build | Passed |
| Frontend production build | Passed, 38 pages |
| Latest browser visual/interaction checks | Unverified because browser policy verification was unavailable |

Detailed check lists: [API workflows](demo-api-verification-2026-09-30.json) and [live role reads](demo-live-api-verification-2026-09-30.json).

The API checks cover registration, login, assignment, trial claiming and expiration, settings, booking/rescheduling/cancellation, permissions, session notes/completion, feedback, graded assessments, file upload/download, support replies, message reads, payout failure/retry/settlement, currency and price edits, enquiries, password-reset token reuse/revocation, and automatic subscription activation/payment history after an internal verified gateway confirmation (temporary fixtures). Test accounts, bookings, reviews, enquiries, and files were temporary and cleaned up. No real payments or external email/WhatsApp messages were sent.

The reusable workflow runner is backend/test/demo-readiness.e2e.cjs. From backend, run npm run test:demo against a development database branch. It builds the backend, creates temporary fixtures, suppresses booking notifications, and removes its fixtures after the run. The script intentionally writes temporary data to the configured database.

## Explicit limits

- Checkout and payment webhooks are intentionally disabled until a gateway is added. The purchase endpoint returns a clear unsupported response rather than creating fake payment confirmations. An expired trial remains locked unless an actual current paid subscription exists. The provider-neutral internal confirmation handler now records a verified successful payment and activates its recorded subscription atomically, without administrator approval. Failed or mismatched confirmations cannot activate access; repeated successes do not extend it again. It is not exposed as a client-accessible approval endpoint. The future gateway adapter must verify the signature/provider result before calling it; the public webhook remains disabled. The locked student gate rechecks access every five seconds and on returning to the window.
- Live video connectivity is user-verified; no new two-participant audio/video test was performed in this pass.
- Password-reset email sending is integrated with Resend, but actual external delivery was not exercised. Without email credentials, the request reports that delivery is unavailable.
- Material storage is local to this backend. Cloud storage and malware scanning are not implemented; uploads are identified as not scanned.
- Assessments are lecturer-entered graded results, not an automatic quiz engine. Certificates display actual issued records; this work does not add automatic certificate issuance.
- Withdrawal balances use recorded completed session blocks. Automatic earning accrual from newly completed lessons was not added or verified; the payout test used temporary ledger fixtures.

## Team demo walkthrough

1. Sign in to each role. Click the logo from a nested page and confirm it returns to that role's dashboard. Check headings and content widths on desktop and a narrow screen.
2. As admin or super admin, open Configuration. Edit a base price and save; confirm the change on public Pricing and student billing, then restore the intended demo price. Choose GBP/EUR/AUD and confirm the displayed conversion follows the saved rate.
3. Review Users, Requests, Sessions, Feedback, Finance, and Audit. Empty financial figures should reflect actual zero totals. Download the finance CSV and inspect the file.
4. As lecturer, open Availability and Sessions. Confirm only shift hours appear, locked slots are labelled, and selected available slots retain their shape. Save an available slot for an assigned student.
5. As a student with valid access, book, reschedule, and cancel a session within the allowed rules. Confirm the corresponding lecturer view updates. Use the user-verified live classroom for the two-person demonstration.
6. Complete a started lesson as lecturer, save notes, record an assessment, and upload a real PDF. As student, submit feedback, review the assessment, and download the shared file.
7. Create a support request and reply as admin. Verify the student receives the saved reply; inspect message read state and profile settings.
8. With an expired-trial student, confirm the blurred gate and three course choices. The dashboard should remain locked; skip checkout during this demo.
9. Review lecturer earnings and download the CSV. Demonstrate payout processing only when genuine available ledger entries exist; the application does not transfer money.

Do not populate fake activity or revenue to make empty screens appear busy. Use genuine demo interactions and restore any configuration values changed during the walkthrough.

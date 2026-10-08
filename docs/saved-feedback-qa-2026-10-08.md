# Saved feedback appearing again after login

The pending-feedback endpoint included every `IN_PROGRESS` session, even when its shared feedback was already saved with at least 30 trimmed characters. Saving through the existing session notes form does not change the session status, so these records returned to the mandatory queue on the next login.

The queue now checks saved feedback for both completed and in-progress sessions. Missing and short notes still require feedback. The change does not change session status or notification delivery.

## Reproduction and regression

- Before the fix, the new booking unit test failed because a saved in-progress session appeared in the pending queue.
- Before the fix, the real database/API runner also failed after saving notes through `PATCH /bookings/:id` without a status change. The stored note was correct, but the endpoint still requested feedback.
- After the fix, both regressions pass. Browser checks cover logout/login, reload, and a fresh browser login after submitting the mandatory form.

## Verification

- Backend build: PASS.
- Frontend production build and independent TypeScript check: PASS.
- Booking, attendance, meeting clock, controller and booking rules unit tests: 64 passed across five suites.
- Required feedback API/browser runner: 26 checks passed, including persistence, ownership, failed-save recovery, mandatory navigation, minimum length, admin/student views, mobile layout, keyboard focus and axe accessibility.
- Attendance API/browser runner: 17 checks passed, including student arrival, fifteen-minute detection, wait, absence, room-close recovery and admin attendance visibility.
- `git diff --check`: PASS.

Tests used an isolated local PostgreSQL database and local production frontend. Email, WhatsApp and meeting providers were test doubles; no external notifications were sent. Runtime results are in `output/required-lesson-feedback-qa/results.json` and `output/student-attendance-qa/results.json`.

Antislop was active during the fix. This change adds no UI, product copy, layout or code comments. The existing [feedback UI gate](required-lesson-feedback-qa-2026-10-07.md) still applies; its keyboard, mobile, enlarged-text and accessibility checks were rerun successfully.

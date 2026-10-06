Students without an assigned learning path previously saw only a message telling them to contact a lecturer. They can now browse the course catalogue, request a course from their assigned lecturer, and track the review status. The lecturer receives a portal notification, reviews the request on Courses, and accepts or declines it. Acceptance assigns the course at 0% progress and notifies the student.

This PR also includes the existing QA fixes across the student, lecturer, admin, and super-admin portals: account-status enforcement, authenticated logout, booking concurrency checks, attendance rules, role checks, audit records, CSV escaping, and dialog/mobile fixes.

## Course requests and compatibility

- Persist request status and notifications in database transactions. Duplicate requests do not duplicate notifications; concurrent reviews allow one successful decision.
- Restrict review to the student's currently assigned lecturer. Acceptance preserves existing course progress and does not mark lessons complete.
- Keep the catalogue and assigned course visible if the request API is unavailable during rollout. Disable request controls until the API responds.
- Validate the finance response before rendering or exporting it, so an older backend missing `revenueByPlan` produces an error message instead of crashing the page.

## Deployment preparation

- Add the course-request schema migration and repair unsupported PostgreSQL syntax in the September 11 support-ticket migration using guarded constraint creation.
- Add `npm run deploy:prepare` in `backend` to apply pending migrations and then compile. Fix production startup to use `dist/src/main.js`; compile without incremental state so clean builds emit all required files.
- Run preparation against the intended database before releasing the backend, then rebuild the frontend with the matching API URL. Preparation does not deploy the application or change hosting settings.
- A database that previously recorded a failed migration still needs its state inspected before recovery. No automatic migration reset or forced migration resolution is included.

## Validation

- All 18 existing backend suites and 114 tests pass.
- All nine migrations apply to fresh PostgreSQL 16; a repeat preparation reports no pending migrations. Replaying the repaired support-ticket SQL also succeeds.
- Course-request API lifecycle tests pass against the migrated local database, including permissions, validation, duplicate submissions, concurrent review, decline/re-request, and assignment at 0%.
- Browser checks pass for student request, lecturer notification/acceptance, student notification and assigned course, mobile overflow, API-unavailable catalogue fallback, and the older finance-response crash.
- Backend production startup/database-health smoke check, frontend TypeScript/lint checks, and production builds pass.

Deployment instructions and test commands: [`docs/course-request-deployment.md`](docs/course-request-deployment.md).

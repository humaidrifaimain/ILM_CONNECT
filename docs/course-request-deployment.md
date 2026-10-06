# Course requests: deployment and verification

Students browse the existing learning paths and request a course from their assigned lecturer. Requests and both parties' notifications are persisted together. The lecturer reviews the request on Courses and accepts or declines it. Acceptance assigns the path at 0% progress; lesson access remains under the lecturer's existing controls. Acceptance does not overwrite progress on a different course.

## Release order

1. Configure the backend's existing `DATABASE_URL` for the intended database. Keep that value server-side.
2. From `backend`, install dependencies and run `npm run deploy:prepare`. This applies pending Prisma migrations, generates the client, and compiles the backend. A failed migration stops preparation before the build. Ordinary `npm run build` remains a compile-only operation.
3. Deploy the prepared backend. Verify `/api/v1/health` reports the database online, and an authenticated `/api/v1/curriculum/requests` request returns an array.
4. Deploy the frontend with `NEXT_PUBLIC_API_URL` pointing to that backend's `/api/v1`. This value is embedded during the frontend build; changing an environment variable without rebuilding does not update it.
5. Verify a student request, lecturer notification, acceptance, and student notification/course assignment.

No hosting settings, deployment aliases, production database, or running deployments were changed while preparing this PR.

If the frontend arrives before the new request endpoints, the course catalogue and assigned course remain visible, with request controls disabled and a retry message. The finance page also rejects an incompatible API response before reading `revenueByPlan` or exporting an invalid summary. These guards avoid a page crash; they do not replace matching frontend/backend releases.

## Migration history repair

The September 11 support-ticket migration used `ADD CONSTRAINT IF NOT EXISTS`, which PostgreSQL does not support. It now uses constraint existence checks inside `DO` blocks. The foreign keys keep the same names and behavior. The entire migration history, including the new course-request migration, was verified against a fresh PostgreSQL 16 database and rerun to verify there are no pending migrations.

An environment that already recorded that migration as failed requires inspection of its migration state and partially applied objects before using Prisma's migration recovery commands. This PR does not automatically mark failed migrations as applied or reset a database. A successfully applied historical migration is not rerun by `migrate deploy`.

## Local regression checks

Use a disposable local PostgreSQL database. The course-request test rejects non-local database hosts.

```sh
cd backend
# Set DATABASE_URL for a disposable database on localhost.
npm run deploy:prepare
npm test -- --runInBand
npm run test:course-requests
```

The API suite covers login, malformed input, missing courses, assigned-lecturer boundaries, reassignment, duplicate notifications, decline/re-request, concurrent reviews, assignment at 0%, and student notifications.

The browser runner follows the existing repository test convention. Set `QA_PLAYWRIGHT_PATH` to an installed Playwright package if the default local location does not exist. Run the API fixture server with `QA_SERVE=1`, start the frontend on port 3017 with `NEXT_PUBLIC_API_URL=http://127.0.0.1:55440/api/v1`, then run `node test/course-requests.browser.cjs`. Stop the fixture server after the test to clean up its generated accounts and courses. Browser fixture credentials are written only to a temporary local file and are never committed.

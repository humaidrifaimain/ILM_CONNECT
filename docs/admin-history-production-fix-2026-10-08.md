# History endpoint production failure

The reported "History unavailable / Internal server error" was reproduced using the production database. Both student and lecturer histories failed with Prisma P2022 because `sessions.student_joined_at` did not exist. The database also lacked `course_assessments` (P2021). Production had 14 applied migrations; the repository had 16.

The missing migrations were `20261007060000_course_assessments` and `20261007120000_student_attendance`. Both are additive: one creates the assessment table and indexes, and the other adds nullable attendance columns. No existing records were deleted or rewritten.

## Fix

- Tested the migrations on an isolated Neon copy of production before applying them to production.
- Applied both pending migrations through Prisma Migrate over the direct database connection. Production now has all 16 migrations.
- Added `vercel-build` to run `deploy:prepare`, which applies migrations before generating Prisma and compiling the backend. The Node function builder recognizes this script even where the normal project build command is not used. [Vercel Node builder source](https://github.com/vercel/vercel/blob/main/packages/node/src/build.ts).
- Added the same preparation command to `backend/vercel.json`.
- Updated `db:migrate` to prefer `DATABASE_URL_UNPOOLED` or `DIRECT_URL`, and otherwise derive a direct Neon connection from `DATABASE_URL`. The application continues using its existing connection setting. Migration failure stops the build.
- Set the history snapshot transaction's acquisition wait to 10 seconds and execution timeout to 15 seconds. The first remote recovery attempt hit Prisma's default transaction wait limit; the recovered real histories also needed more than the default five-second execution budget from this workstation.

## Evidence

| Check | Result |
| --- | --- |
| Student and lecturer before migration | Both reproduced P2022 for missing attendance columns |
| Course assessment count before migration | Reproduced P2021 for missing table |
| Actual `npm run vercel-build` on isolated production copy | Applied both migrations and built successfully |
| Student and lecturer after migration on isolated copy | Both passed; 11.5 seconds and 8.5 seconds from the workstation |
| Corrected student and lecturer service queries on production | Both passed; 11.8 seconds and 9.3 seconds from the workstation |
| Production migration history | All 16 migrations applied |
| Existing history API scenarios on local Postgres | 13 passed, including role restrictions and payout/payment totals |
| Full backend Jest suite | 25 suites, 211 tests passed |

The repeatable before/after runner is `backend/test/history-migrations.qa.cjs`. It requires `HISTORY_QA_DATABASE_URL` for a disposable pre-migration database copy with student and lecturer accounts. It first asserts the original errors, runs the actual Vercel build hook, then verifies both histories and migration records. Evidence is stored in `output/playwright/admin-history/migration-results.json`, without names, credentials, or account contents.

The configured local database URL was verified to reference the linked Neon production branch. The production checks called the service directly with read-only queries; an authenticated HTTP call through the hosted Vercel deployment and a browser click were not performed in this pass. The transaction-limit and deployment-hook changes require a backend deployment of this correction. There are no frontend changes.

QA charter: Explore the failing history endpoint against the deployed schema and an isolated production copy to distinguish schema drift from transaction timing failures and verify recovery without changing billing records.

The disposable test branch was reset once to reproduce the original failures before rerunning recovery, then removed after verification. The existing history UI and its antislop gate were unchanged.

## Description

This pull request delivers a comprehensive pass of Quality Assurance (QA), security hardening, access control enforcement, and bug fixes across the Super Admin, Admin, Lecturer, and Student portals, along with core backend services.

---

### Key Fixes & Improvements

#### 1. Authentication, Sessions & Security
- **Account Status Enforcement**: Enforced strict `ACTIVE` account checks in the JWT authentication strategy and signin flow to immediately reject suspended or soft-deleted users.
- **Registration Input Validation**: Sanitized and validated all registration inputs (full name, phone number, country, and verified IANA timezone identifiers).
- **Secure Authenticated Logout**: Added authenticated `POST /api/v1/auth/logout` endpoint that increments `tokenVersion` to immediately invalidate active JWTs and records an audit log entry.
- **Sensitive Data Scrubbing**: Stripped password hashes and private credentials from user and lecturer administrative status responses.

#### 2. Booking, Availability & Attendance
- **Slot Locking & Concurrency Protection**: Added transactional locking (`FOR UPDATE`) to prevent race conditions and duplicate bookings for the same time slot.
- **Lecturer Assignment Requirement**: Enforced validation ensuring a student has an assigned lecturer before booking a trial or regular session.
- **Attendance Resolution**: Prohibited attendance updates on future or terminal sessions. Differentiated lecturer absence (`No-Show (Lecturer)`) from student absence (`No-Show (Student)`) with proper audit log tracking.
- **Real-Time Availability**: Enforced strict boundary conditions and schedule validations for slot creation and updates.

#### 3. Super Admin & Admin Portals
- **Audit Trails**: Added automatic audit logging for user status modifications, lecturer assignments, and administrative payout executions.
- **CSV Export Security**: Secured session CSV exports against formula injection (`=`, `@`, `+`, `-`) with formula escaping and standard RFC formatting.
- **Modal Dialog Accessibility**: Integrated `useDialogAccessibility` hook across admin dialogs for keyboard focus trapping, `Escape` key dismissal, and focus restoration to trigger buttons.
- **Mobile Responsiveness**: Fixed navigation and layout overflow across all admin routes, ensuring clean display down to 320px viewports without horizontal scrolling.

#### 4. Lecturer & Student Portals
- **Support & Ticket Role Checks**: Prevented students and lecturers from escalating administrative ticket statuses during discussion replies.
- **Classroom & Video Conferencing**: Improved LiveKit room token generation, verified role permissions, and stabilized classroom controls.
- **Student Portal Polish**: Corrected star rating accessibility labels, improved course materials pagination, and streamlined session rescheduling flows.

#### 5. Tests & QA Documentation
- Added unit tests for `MessageService` (`backend/src/message/message.service.spec.ts`).
- Created automated portal QA test scripts under `backend/test/`.
- Documented comprehensive QA findings and resolution reports under `docs/`.

---

### Verification & Test Results

- **Backend Test Suite**: All 18 suites / 114 unit & integration tests passing (`npm test`).
- **Backend Build**: Successfully compiled with `prisma generate && nest build`.
- **Frontend Typecheck**: TypeScript check passed with 0 errors (`npx tsc --noEmit`).
- **Frontend Build**: Production Turbopack build passed cleanly (`next build`, all 38 routes static/dynamic).

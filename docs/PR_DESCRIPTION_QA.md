## Description

This pull request provides a comprehensive suite of Quality Assurance (QA) bug fixes, security hardening, accessibility enhancements, and new feature implementations across the Super Admin, Admin, Lecturer, and Student portals, along with core backend services.

---

### Part 1: New Features & Architectural Enhancements (6 October 2026)

#### 1. Student Availability & Assignment Requests
- **Mandatory Preferred Hours**: Enforced selection of preferred study time blocks during student signup and within Student Settings (`availability-settings.tsx`, `availability-dialog.tsx`).
- **Normalized Persistence**: Backend validates and sorts hour arrays (0–23), rejecting duplicates, empty arrays, and out-of-range values.
- **Assignment Request Workflow**: Student signups automatically generate an assignment request in the Admin portal (`request-lecturer-assignment.tsx`). Prevents student self-assignment and rejects lecturer assignments with conflicting schedules.
- **Prisma Migrations**: Added migrations `20261006000000_student_preferred_hours` and `20261006120000_student_assignment_requests`.

#### 2. Live Classroom Meeting Clock & Session Lifecycle
- **Authoritative Server Timer**: Implemented `MeetingClockService` to track lesson start times authoritatively, preventing client-side clock tampering.
- **Synchronized Session Timer**: Both participants share the same countdown. At 40 minutes, a 5-minute extension banner is shown; at 45 minutes, the room automatically marks completed and revokes token access.
- **In-Call Collaboration**: Integrated `meeting-chat.tsx` and `meeting-reactions.tsx` for real-time interaction during live classroom calls.
- **Prisma Migration**: Added `20261006170000_meeting_clock_and_session_status`.

#### 3. Lecturer Breaks & 10-Minute Step Availability
- **10-Minute Buffer Rule**: Enforced a mandatory 10-minute break between 40-minute sessions in booking and rescheduling services (`conflictsWithLecturerBreak`).
- **Sub-Hour Schedule Grid**: Updated Lecturer Availability calendar to 10-minute step increments (`cellStepMinutes={10}`, `breakMinutes={10}`) with clear guidance and boundary validation.
- **Sequential Mutation**: Serialized delete-then-create slot operations to prevent transient overlap errors when re-arranging schedule blocks.

#### 4. Regional Pricing & Currency Conversion
- **Independent LKR & USD Pricing**: Super admins can configure distinct pricing structures for Sri Lankan Rupees (LKR) and US Dollars (USD).
- **Exchange Rate Engine**: Added `ExchangeRateService` for automated conversions to GBP, EUR, and AUD with fallback caching.
- **Finance Panel & Billing**: Added `exchange-rates-panel.tsx` to Admin Finance and currency switcher (`pricing-currency.tsx`) in student billing.
- **Prisma Migration**: Added `20261006190000_regional_pricing`.

#### 5. Signup Demographics
- **Demographics Collection**: Collected and validated gender and date of birth during student registration with age and formatting checks.
- **Prisma Migration**: Added `20261006200000_signup_demographics`.

---

### Part 2: Core QA Bug Fixes & Security Hardening (5 October 2026)

#### 1. Authentication, Sessions & Security
- **Active Account Enforcement**: Enforced strict `ACTIVE` account checks in the JWT authentication strategy and signin flow, rejecting suspended or soft-deleted accounts immediately.
- **Registration Input Validation**: Sanitized and validated all registration inputs (full name, phone number, country, and verified IANA timezone identifiers).
- **Secure Authenticated Logout**: Added authenticated `POST /api/v1/auth/logout` endpoint that increments `tokenVersion` to invalidate active JWT tokens and logs an audit trail event.
- **Sensitive Data Scrubbing**: Stripped password hashes and private credentials from administrative user and lecturer response payloads.

#### 2. Booking, Availability & Attendance
- **Slot Locking & Concurrency Protection**: Added transactional locking (`FOR UPDATE`) to prevent race conditions and duplicate bookings for identical time slots.
- **Assigned Lecturer Validation**: Enforced verification ensuring students have an assigned active lecturer before booking a trial or regular session.
- **Attendance Resolution**: Prohibited attendance modifications on future or terminal sessions. Differentiated lecturer absence (`No-Show (Lecturer)`) from student absence (`No-Show (Student)`) with full audit tracking.

#### 3. Admin & Super Admin Portals
- **Audit Trails**: Added automatic audit logging for user status modifications, lecturer assignments, and administrative payout executions.
- **CSV Export Security**: Secured session CSV exports against formula injection (`=`, `@`, `+`, `-`) with formula escaping and standard RFC formatting.
- **Modal Dialog Accessibility**: Integrated `useDialogAccessibility` hook across admin dialogs for keyboard focus trapping, `Escape` key dismissal, and focus restoration to trigger buttons.
- **Mobile Responsiveness**: Fixed navigation and layout overflow across all admin routes, ensuring clean display down to 320px viewports without horizontal scrolling.

#### 4. Lecturer & Student Portals
- **Support & Ticket Role Checks**: Prevented students and lecturers from escalating administrative ticket statuses during discussion replies.
- **Classroom & Video Conferencing**: Improved LiveKit room token generation, verified role permissions, and stabilized classroom controls.
- **Student Portal Polish**: Corrected star rating accessibility labels, improved course materials pagination, and streamlined session rescheduling flows.

---

### Verification & Test Results

- **Backend Test Suites**: All **24 suites / 189 unit & integration tests passing** (`npm test`).
- **Backend Build**: Successfully compiled with `prisma generate && tsc -p tsconfig.build.json`.
- **Frontend Typecheck**: TypeScript check passed with **0 errors** (`npx tsc --noEmit`).
- **Frontend Production Build**: Optimized Turbopack build passed cleanly (`next build`, **all 38 static and dynamic routes**).
- **Database Migrations**: All 14 Prisma database migrations tested and applied cleanly.

# Student and lecturer calendar date window

The shared calendar now excludes dates and events older than yesterday, using midnight in the calendar's existing device timezone. Day, week and month navigation cannot open an entirely older period. Yesterday remains reachable when it falls in the preceding week or month. Month cells retain their weekday columns, leaving blank space before the first permitted date.

The date cutoff refreshes at the next minute boundary, including midnight. The student dashboard calendar now receives all bookings instead of just four upcoming bookings, so yesterday's sessions can appear. Session records and session list views remain available for history.

## QA

- Six date-range unit tests passed: ordinary weeks, day cutoff, Monday/Sunday boundary, year/month boundary, future navigation, midnight advancement and daylight-saving transitions.
- Twelve Playwright scenarios passed: student and lecturer portals, 1440px and 390px widths, a Thursday, a Monday and January 1. Each exercises day/week/month views, hidden older dates and sessions, yesterday/today/future events, disabled navigation, weekday alignment, overflow and runtime errors. Student scenarios also verify yesterday in the dashboard calendar.
- Production frontend build, independent TypeScript check, targeted calendar ESLint and `git diff --check` passed.
- Browser tests use mocked local API responses and a fixed clock. No database records or external services are changed. Results and screenshots are in `output/calendar-date-window-qa`.

Antislop was active during implementation. Existing calendar palette, typography and controls are retained. The disabled Previous button communicates the date boundary, month date buttons have full accessible date labels, and the dashboard copy describes the actual date window. Phone layouts were checked for page overflow and a rendered month screenshot was inspected. No decorative assets, animation, marketing claims or code comments were added.

Run the unit checks with `node --test test/calendar-range.test.mjs` from `frontend`. Build the frontend with `NEXT_PUBLIC_API_URL=http://localhost:3017/api/v1`, start it on port 3007, and run `node test/calendar-date-window.browser.cjs` from `backend` for browser QA. The browser runner mocks that API origin.

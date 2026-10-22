# People & History UX update

The previous page kept the directory beside one long column containing every record category. The new flow is a full-width directory followed by a full-width individual profile. Only the selected record section is displayed.

- Directory rows show name/email, account status, and the student's assigned lecturer/plan. Search covers all returned people. The whole row opens the record.
- A profile starts with the person's name, status and four important totals.
- Students have Overview, Sessions, Payments, Assessments and Activity tabs.
- Lecturers have Overview, Sessions, Students, Earnings, Assessments and Activity tabs.
- The section tabs remain below the 72px application topbar while scrolling. On phones, they form a two-row grid without horizontal scrolling.
- Back to students/lecturers restores the directory search. The selected person and originating search are in the URL, so reload and browser Back work.
- Account IDs and payment/payout/block references use expandable controls. Every original record category remains available.
- The mobile admin navigation is now a collapsible Menu, matching the application's existing student menu pattern, so navigation does not occupy most of the first screen. Selecting a link closes it; Escape closes it and returns focus to its summary.

## Record locations

| Section | Student | Lecturer |
| --- | --- | --- |
| Overview | Account, preferences, assigned lecturer, current course progress | Account, qualifications, languages, shifts, payout details, average rating |
| Sessions | All session statuses, notes, materials and session feedback | All sessions, notes, materials and student feedback |
| Payments / Earnings | All payment statuses, successful-payment count, refunds and subscription periods | Available earnings, pending/successful/failed payouts and session blocks |
| Assessments | Scores, progress reports and certificates | Student scores, authored assessments and progress reports |
| Students | Not applicable | Current assignments, distinct students in session history and student drill-down |
| Activity | Course requests, support/assignment conversations and account events | Support requests and account events |

The financial calculations and backend endpoint are unchanged. The explanation of "Months with payment" is available in Payments; the summary still identifies LKR and Asia/Colombo time.

## QA

Charter: Explore the new directory-to-profile flow with real local API fixtures, both roles, browser navigation, keyboard input, delayed and failed responses, and small viewports to discover missing records, confusing navigation, stale profiles and layout failures.

| Check | Result |
| --- | --- |
| Updated Chromium browser runner | 22 scenarios passed |
| Existing live history API runner | 13 scenarios passed |
| Frontend type checking | `npx tsc --noEmit` passed |
| Changed frontend lint | Page, history types and sidebar passed ESLint |
| Production frontend build | `/admin/history` compiled and generated successfully |
| New count-background contrast | 5.25:1 for muted text on `#e5ece8` |
| Other feature text contrast | Existing checked text pairs remain 6.30:1, 7.67:1 and 13.57:1 |
| Whitespace | `git diff --check` passed |

The browser suite tests full-width layout, search/clear-search, profile focus, all student and lecturer sections, identifier disclosures, keyboard tabs, search preservation, reloading profile URLs, browser Back, student drill-down, empty profiles and directories, canceling a slow load, request failures and working retries, Finance navigation, and mobile menu open/close/Escape behavior. At 320px and 375px, the document did not overflow. Sticky section navigation was measured at y=72px below the topbar during scrolling. There were no browser runtime errors.

Browser evidence: `output/playwright/admin-history/browser-results.json`. API evidence: `api-results.json` in the same folder. Screenshots include `directory-desktop.png`, `directory-mobile.png`, `student-desktop.png`, `student-payments-desktop.png`, `student-mobile.png`, `lecturer-desktop.png`, `lecturer-earnings-desktop.png`, and `lecturer-mobile.png`. All screenshot accounts are QA fixtures. The existing `backend/test/admin-history.browser.cjs` was updated to test this flow rather than leaving the previous split-view assertions behind.

Session notes, 8 October 2026, Asia/Colombo:

| Time | Tag | Observation |
| --- | --- | --- |
| 10:28:38 | NOTE | All 13 API scenarios passed before the browser session. |
| 10:37:18 | NOTE | Directory and profile widths exceeded 1000px at the 1440px desktop viewport; the directory was absent while viewing a profile. |
| 10:37:26 | NOTE | All 22 browser scenarios passed, including sticky tabs and collapsible menu behavior at narrow widths. |
| 10:37:26 | NOTE | Screenshots confirmed a compact profile summary and one visible record category at a time. |

Debrief: Both roles and all record categories were covered. Keyboard tab/menu controls, desktop/mobile layouts, errors, loading and navigation were covered. Full screen-reader certification and Firefox/WebKit were not part of this pass. No unresolved application defect was found in the tested flow.

## Design decisions

Reading this as an ILM Connect administrative directory and individual-record workflow. ENERGY 1 / RHYTHM 1 / MOTION 1.

- Layout: separate directory and profile views remove the user's competing left/right navigation and scrolling.
- Hierarchy: four summary totals expose the important attendance or money figures; secondary breakdowns belong in Payments, Earnings or Students.
- Sections: tabs organize existing records by the administrative task, with counts for sessions, students and assessments.
- Density: compact facts and ledger rows keep the overview inside a normal desktop viewport; the phone layout retains readable text and 44px controls.
- Disclosure: long technical references remain accessible without occupying every row by default.
- Color/type: the existing green selection color, neutral surfaces and application font preserve ILM Connect's identity and tested contrast.
- Motion: only ordinary hover/focus feedback is used; section changes do not add decorative animation.
- Mobile navigation: a familiar menu glyph identifies a collapsible application menu; reducing its initial height brings profile controls into view sooner.

## Antislop delivery gate

This gate applies to the redesigned history feature and mobile admin menu.

- R-02 PASS: no em dashes in new product copy.
- R-03 PASS: 320px/375px browser checks found no document overflow; desktop/mobile screenshots were inspected.
- R-17 PASS: all summary and count values still come from API records; 13 API scenarios validate the business totals.
- R-18 PASS: no testimonials or endorsements were added.
- R-23 PASS: the requested redesign uses existing navigation and no invented images or user identities.
- R-24 PASS: directory/profile query URLs, browser Back, Finance and sidebar navigation were exercised.
- R-25 PASS: new badge contrast is 5.25:1; the remaining feature text retains previously verified AA contrast pairs.
- R-26 PASS: selection, both tab sets, search/clear, Back, disclosures, retries, menu and links all have working browser evidence.
- R-27 PASS: loading, directory/profile error, empty profile, empty directory and no-match states were tested.
- R-28 PASS: no FAQ was introduced.
- R-32 PASS: Arrow/Home/End tab navigation, keyboard account disclosure, focus on the opened profile and menu Escape behavior were tested; controls have focus styles.
- R-33 PASS: changes are authored in source; no runtime source/CSS patching was introduced.
- R-34 PASS: no theme toggle was added; the existing admin shell remains the direction.
- R-35 PASS: production build and 22 browser scenarios passed.
- R-36 PASS: no security/compliance/performance/customer claims were added to product copy.
- R-37 PASS: existing brand direction, Design Read and calm dials are stated above.
- R-38 PASS: actual API records drive the UI; screenshots use explicitly named QA accounts.
- R-01 PASS: no gradients or glows were added.
- R-04 PASS: the existing menu glyph identifies the mobile navigation disclosure; its purpose is recorded above.
- R-06 PASS: existing application typography is retained; no wide-tracked uppercase or oversized monospace treatment is added.
- R-07 PASS: no background patterns were introduced.
- R-08 PASS: no decorative arrows were introduced.
- R-09 PASS: count/status markers communicate actual record counts or account status; no promotional badges were added.
- R-10 PASS: no glassmorphism was introduced.
- R-12 PASS: borders group records; no decorative elevation was added.
- R-13 PASS: no glow effects were added.
- R-14 PASS: repeated directory/ledger rows serve comparisons; the four summary values serve attendance and financial decisions.
- R-19 PASS: ordinary hover/focus behavior matches MOTION 1; no template animation was added.
- R-22 PASS: no illustrations were introduced.
- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 1 were declared before the redesign.
- Dial consistency PASS: predictable list, summary and selected section layouts support the administrative reading task.
- Focal point PASS: the selected person's name and four summary totals lead the profile.
- Structural whitespace PASS: identity, summary, section navigation and record content have distinct grouping.
- Deliberate accent PASS: existing green marks current tabs and record/navigation actions.
- Identity motif PASS: the existing ILM Connect sidebar, palette and course/session-block terminology remain visible.
- Design Read PASS: product, audience, language and dials are documented above.
- C-1 PASS: reasons for layout, hierarchy, density, disclosure, typography, palette and motion are recorded above.
- C-2 PASS: all newly introduced control types were exercised.
- C-3 PASS: every section maps to existing account, teaching, learning, billing, payout or activity records.
- C-4 PASS: tested keyboard, desktop/mobile, loading, empty/error and delayed-response states remained usable.
- C-5 PASS: no fictional product claims were introduced; the API evidence checks the displayed financial calculations.
- R-05 PASS: the page follows a directory-to-record task rather than a marketing template.
- R-11 PASS: existing section/button radii are retained; indicators use small corners rather than a uniform pill treatment.
- R-15 PASS: actions use specific labels such as View record, Back to students and Payment references.
- R-16 PASS: no AI marketing buzzwords were added.
- R-20 PASS: course assessments, historical lecturers, attendance notes and session-block earnings are specific to this application.
- R-21 PASS: the existing admin theme was retained.
- R-29 PASS: neutral surfaces/text and the existing green accent form the palette.
- R-30 PASS: the application design was extended rather than cloning another product.
- R-31 PASS: major visual decisions have one-line reasons above.

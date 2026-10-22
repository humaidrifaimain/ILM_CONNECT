# Pricing FAQ audit

12 October 2026. Local guest view of `/pricing`. Focused functional and typography review using the visual-testing and exploratory-testing workflows.

Charter: Explore the pricing FAQ with mouse and keyboard interaction, rendered font measurements, and phone/tablet/desktop widths to discover simultaneous answers, typography discontinuities, and responsive defects.

## Findings fixed

- The array of open indices allowed multiple answers. Replaced it with one nullable index. Clicking a different question closes the previous answer; clicking the current question closes all answers.
- Exit animations could briefly leave the previous answer visible during switching. Native `hidden` panels now enforce exclusivity immediately.
- Questions and answers were 14px, and questions used tight, bold display-like styling. Both now use 16px Helvetica Neue body typography, with weight 600 and line-height 1.5 for questions; answers use line-height 1.7. The section heading retains the established 30/36/42px heading scale.
- Added explicit question/panel IDs, `aria-controls`, labelled regions, and a visible keyboard focus outline. Removed decorative icon circles, hover lift, rings, and shadows from FAQ rows; kept a directional chevron for expanded state.

## Checks

| Width | All seven questions switch exclusively | Question / answer font | Minimum button height | Horizontal overflow |
| --- | --- | --- | --- | --- |
| 320px | PASS | 16px / 16px | 84px | None |
| 640px | PASS | 16px / 16px | 64px | None |
| 768px | PASS | 16px / 16px | 64px | None |
| 900px | PASS | 16px / 16px | 64px | None |
| 1024px | PASS | 16px / 16px | 64px | None |
| 1280px | PASS | 16px / 16px | 64px | None |

Click-through: each question 1 through 7 -> exactly one expanded button and one visible answer. Click the seventh question again -> zero expanded answers. Keyboard Enter opens the first answer; Space opens the second and closes the first. Focus stays on the activated question with a 2px green outline. Browser console reported no errors.

Elapsed checkpoints: 00:00 NOTE, inspected original array state and typography; 00:01 FIX, implemented exclusive state and scoped FAQ styles; 00:02 NOTE, exercised all seven questions and keyboard controls; 00:03 NOTE, completed 42 question switches across six widths and checked geometry/fonts.

Coverage is limited to this FAQ in the Codex in-app browser. No separate Safari/Firefox or screen-reader run, and no CI screenshot-baseline pipeline was added.

## Delivery checks

Hard Gate PASS: one visible answer, no overflow, large touch targets, labelled panels, visible focus, existing high-contrast text colors, and no new product claims or assets.

Purpose PASS: body typography improves readability; one chevron indicates disclosure state; borders separate questions without visual elevation.

Liveliness PASS: the existing Ilmbit heading family and green remain consistent; state changes are functional and chevron motion respects reduced motion.

Craftsmanship PASS: all seven controls exercised, exclusivity checked at six widths, keyboard controls verified, no console errors, and ESLint/TypeScript/whitespace checks passed.

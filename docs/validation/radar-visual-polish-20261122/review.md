# Radar: visual follow-up to PR #371

Base: `main` at `9ed56b16327d6f42f8ae152d49b787546d42db89`.
The stylesheet from #371 remains unchanged on this base (blob `106d38deda79c818e9e5de14ec0811a3eb13d7b7`), including the fix for the Pulse button overflowing into the map. This PR keeps that fix and changes only the visual stylesheet; the other files are browser screenshots and this review.

## Findings and changes

| Before | After | Why |
| --- | --- | --- |
| `radar.css`'s `.section-heading>#addButton` overrode the newer green rule and rendered a silver gradient. | `radar-visual-v1.css:11` uses matching specificity and a flat green fill. | Restore the single primary action already intended by #371. |
| Silver buttons inherited vertical movement, moving shine (`left .65s`) and heavy hover shadows. | `radar-visual-v1.css:14` removes the shine and movement; brief color/border feedback remains. | Frequent map controls need immediate feedback without decorative movement or layout-property animation. |
| Cards shifted or tilted on hover, including touch-generated hover. | `radar-visual-v1.css:70` keeps cards still and restores their normal touch colors. | Remove unnecessary motion and sticky touch hover effects. |
| Country text was 12px on mobile; map controls were 40px. | `radar-visual-v1.css:54` uses 16px country text; map controls and exploration disclosure are at least 44px high. | Avoid iOS input focus zoom and improve touch targets without disabling browser zoom. |
| The mobile CTA had an extra 13px inset; narrow search/country columns compressed the text field. | `radar-visual-v1.css:50` aligns the CTA with the map; widths up to 360px use one toolbar column. | Preserve one lateral margin and usable narrow-screen search. |

Motion verdict for the changed styles: **Approve**. No new spatial animation, keyframes, library, JS loop, `will-change` or layout-property transition is introduced. Existing reduced-motion handling remains intact. The viewport allows browser zoom; map gestures and pin styles are unchanged.

## Official references consulted, without installation

- [emil-design-eng](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md)
- [mobile-native](https://github.com/emilkowalski/skills/blob/main/skills/mobile-native/SKILL.md)
- [animation-performance](https://github.com/emilkowalski/skills/blob/main/skills/animation-performance/SKILL.md)
- [review-animations](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md) and its [standards](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)

## Validation performed

Read-only local preview with synthetic establishments, rendered in Chrome at 320x740, 390x844, 820x1180 and 1440x1000 CSS-pixel viewports. No horizontal overflow at those sizes. Mobile measurements: country font 16px, map controls 44px, exploration disclosure 44.8px, CTA and map-shell left edges aligned. Primary button is `rgb(32, 184, 109)` with no background image.

Real locator/pointer interactions passed: search and reset, category filter and reset, nearby dialog open/close, Pulse dialog showing its one synthetic live promotion, establishment detail and its disclosure open/close, map expand/collapse. Pulse also opened successfully at 320px. No forced clicks or timeouts were changed. `git diff --check` passed. No dependencies installed and no manual Actions dispatches or reruns.

Screenshots are actual browser captures of the isolated preview, not generated mockups. They show synthetic records and the preview banner. Mobile and desktop images are stored next to this review.

- [Mobile 390x844](mobile.jpg)
- [Desktop 1440x1000](desktop.jpg)

Limit: these are browser viewports, not physical devices. Safari keyboard zoom, hardware touch feel, browser chrome and safe-area behavior still require a physical phone. Reduced-motion rules were inspected in code; this session did not emulate an OS reduced-motion setting or measure FPS on a midrange phone.

No authentication, API, payments, pin/report logic, data, workflows or production configuration changed. No merge or deployment is authorized.

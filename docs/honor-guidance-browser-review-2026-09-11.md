# Honor-inspired guidance — isolated browser review

## Method and boundary

Actual new CalmBubble, PronunciationWalkthrough, PracticeDialog, GuidedPracticeTools and modified PronunciationAudioStudio components were transpiled using TypeScript and rendered with the project's React/ReactDOM runtime in Chromium. Account/progress boundaries and device media were synthetic. HTML, JS and CSS were injected as local inline content, with no external navigation. This was NOT the production site, a real microphone test, a physical Honor/iPhone/iPad, a screen-reader audit or a clinical evaluation.

The source blob hashes matched the committed feature at 9cf311a before the following narrow CSS correction. The correction retains the same component behavior and only changes short-viewport layout.

## Observed and corrected

Initial phone review exposed controls leaving the viewport when all settings scrolled. The implementation moved Close and Start/Pause/Stop outside the middle scrolling region before its first feature commit.

Additional review at 640 x 500 with root text size 32px exposed the Stop button wrapping below the visible panel. This follow-up keeps the short-screen header compact, removes only the decorative eyebrow at short heights, and gives the three footer controls an equal-width grid row. It does not reduce text-size preferences, remove Stop, or hide functional instructions. The middle content stays scrollable.

## Rechecked matrix

| CSS viewport | Root text size | Pause / Stop / Close bounds | Bubble horizontal overflow |
| --- | --- | --- | --- |
| 320 x 568 | 16px | all inside viewport | none |
| 844 x 390 | 16px | all inside viewport | none |
| 768 x 1024 | 16px | all inside viewport | none |
| 390 x 844 | 24px | all inside viewport | none |
| 640 x 500 | 32px | all inside viewport | none |

Each matrix entry also completed all six walkthrough steps and Finish through the rendered controls. No JavaScript page errors were observed. Root-font enlargement is a layout stress check, not proof of every browser zoom/text-scaling combination.

Separate 1280 x 1000 and 390 x 844 renders covered bubble start/pause/close, valid focus return, all six tour targets, dark mode and OS reduced-motion emulation. In reduced motion the actual bubble computed transform stayed matrix(0.9, 0, 0, 0.9, 0, 0) across active ticks. The tour deliberately falls back to text-only guidance for short (<520px) viewports or missing targets, rather than cover an essential control with a misleading spotlight.

## Automated source gate

The first feature head 9cf311a passed full Actions run 34642134247, job 103404187853: strict install, unchanged dependency files, TypeScript, application regression, safeguarding/privacy and build. Downloaded artifact 10279829122 matched SHA-256 eb7b389f64446f28ae44b980578397ce0b7852aed73cd55231a201d32627e5a2 and reports 80 suites / 768 tests passing with zero failures/pending/todo/runtime-error suites. Exact assertion-name comparison with 6a0d391 showed zero removed and 48 added assertions: 18 bubble, 17 model/voice/boundary and 13 actual-page integration.

The CSS correction still requires its own full exact-head rerun; the result belongs on Issue #18 / PR #21 and is not assumed from the earlier green run. No existing tests or scoring changed. Physical-device, real voice, screen-reader and intended-user acceptance remain outstanding.

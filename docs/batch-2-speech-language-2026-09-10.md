# Batch 2 — Speech & Language / DLD

Status: implemented on the Batch 2 development branch; validation evidence is recorded with the exact commit/run on issue #18 and draft PR #20. Not a production release, clinical assessment or child/school pilot approval.

## Scope

Activate `speech-language` only with three dedicated, usable dashboard tools. Executive Function remains inactive. Keep the existing Visual Stress implementation and other profiles unchanged, apart from adding Speech & Language to the Bigger Text and Calm Motion controls.

- **Helpful Phrase Cards:** three situations and nine fixed phrases. Choose a phrase, explore it by pointing, reading or speaking, then explicitly record practice. Changing a phrase resets acknowledgement; changing its situation clears the card. Showing a card does not contact an adult or send a message.
- **Sentence Builder:** choose who, an action and a place. Display an optional example without filling the child's choices. Confirm exploration before recording; changing a choice clears confirmation. Clear resets all choices and the example.
- **Story Steps:** three original stories, three cards each, deterministic shuffled order, large up/down controls, optional one-step view, and optional example comparison. Exploration of an alternative order counts; no correctness score or forced speaking. Changing the story clears the old order/confirmation.

These are fixed-content educational practice tools, not speech therapy, diagnosis, speech recognition, a complete AAC system or an emergency communication service. No claim of improved language outcomes is made. A trusted adult may help read the prompts; independent use must not be assumed for all reading/language levels.

## Completion and privacy contract

Opening, waiting, closing, viewing an example alone, or using the generic modal footer cannot award completion. Every tool requires a concrete choice/exploration plus acknowledgement. All communication methods receive identical catalogue rewards. One completion callback is permitted per launch.

Each launch binds to its original child and activity. The real authentication/progress stores must agree on a ready owner, and Speech & Language must still be selected. Account/profile changes and even a transient loading-to-ready cycle invalidate the old practice. A closed or invalidated launch cannot resurrect old choices.

Choices remain in component memory only. No microphone, new speech synthesis, AI endpoint, free-text input, child-speech storage, automatic adult notification, new database field or migration is introduced. Only the existing completion record (activity/profile IDs, stars, timestamp and measured visible duration) reaches the progress store. Phrase content, sentence choices, story order and communication method are not stored or sent by these tools. Existing application-level persistence policies still apply; guest scope must remain unbound to persistent child storage.

Pause keeps the current choices in memory and hides/disables interaction with practice content. Paused and hidden-tab time are excluded from measured visible duration. No countdown or minimum-speed target is imposed. On close the choices are discarded. The modal's focus loop excludes hidden and disabled controls and retains Escape/close focus restoration.

## Automated checks added

Component tests cover selection/completion gates, equally valid non-speaking practice, changed-choice resets, keyboard control, sentence example/reset, shuffled-story exploration, one-step navigation, alternative-order completion, pause/visibility timing, duplicates, unknown IDs, profile removal, owner switching and transient hydration invalidation.

Catalogue tests cover activation, three known trackable tools, daily rotation, comfort controls and non-clinical metrics. Dashboard tests exercise all three real modal completions, measured time, minimal metadata, guest no-persistence behavior, cancellation/reopening, paused focus trapping, account changes and stale-owner launch rejection.

Run full `npm ci`, TypeScript, all Jest suites, safeguarding/privacy checks and the production build on the actual final commit. A successful preparation job or Vercel preview alone is not evidence that these tests passed.

## Manual release gates — outstanding

- Review with the owner and a qualified speech/language practitioner or relevant accessibility reviewer before a child/school pilot. These examples have not been clinically validated.
- Test actual phone/tablet layouts, zoom, dark/light presentation, touch targets and long-label wrapping.
- Check VoiceOver/TalkBack/screen-reader behaviour, phrase/sentence feedback, pause focus, Escape/close return and one-step navigation.
- Test both registered and guest selection through onboarding/settings into the real dashboard, including account switching.
- Review wording and symbols with intended users; do not assume the emoji cues are universally understood.
- Confirm PR #20 remains draft until remaining Batch 2 work and the separate grant/pilot gates are satisfied.

Production, Changers, Worry Diary, Teacher AI PR #16, live database/migrations and other contributors' branches are out of scope. No branch cleanup is part of this feature commit.

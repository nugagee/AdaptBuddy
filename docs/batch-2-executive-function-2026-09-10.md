# Batch 2 — Executive Function

Status: implementation on the Batch 2 development branch, not a production release. Exact CI evidence is recorded on issue #18 and draft PR #20 after execution. No clinical or child/school pilot approval is implied.

## Three usable pathways

- **First Step Planner:** three original everyday examples, each with three small starting steps. Choose a step and preferred support, then explicitly review the plan. Working alone, asking for help and pausing receive the same completion reward. This records planning practice, not completion of a real task.
- **Ready-to-Go Checklist:** three examples with three items each. Review each item as Ready, Not needed or Ask for help; every status counts equally. An optional one-item view retains choices while navigating. Record only after every item is considered and the child confirms review. No claim that items were packed or independently verified.
- **Change of Plan:** choose distinct now/next activities and a helpful bridge, then confirm exploration. Quiet pause, more time and explanation are equally valid. There is no countdown, compulsory transition, clinical assessment or compliance/productivity score.

The profile is activated with three known in-place modal routes, zone/daily rotation, Bigger Text and Calm Motion controls, and a count of planning practices. Twelve defined profiles are now active on this branch, but this does NOT mean every planned activity in every profile is finished. The five remaining Batch 2 areas are Dysgraphia, Dyscalculia, Dyspraxia/DCD, Auditory Processing and Tourette/Tics.

## Session and privacy contract

No free-text entry, microphone, AI call, notification delivery, new database storage or live migration. Fixed choices remain in component memory. No reminder is scheduled; choosing help or more time does not notify anyone. The UI tells the child to communicate with someone directly in their own way.

Completion records only the existing activity/profile IDs, catalogue stars, timestamp and measured visible/unpaused session duration. It never includes the chosen task, first step, checklist statuses, transition choices or support preference. Closing discards the plan; this slice deliberately does not provide a saved planner across visits. Existing registered-account completion persistence still applies; guest activity does not bind persistent child storage.

Each launch binds to the original ready child and profile. Owner/profile/hydration changes invalidate the launch permanently, even if a loading-to-ready transition occurs inside a single React batch. The synchronous invalidation guard rejects an event before React rerenders. An unknown or changed activity ID cannot borrow another launch. Paused/hidden time does not accrue; completion while paused or while the document is hidden is rejected. A completion callback is allowed only once per launch.

Each tool requires concrete choices and review. Waiting, opening, closing or resetting cannot award progress. A changed choice clears review. The generic modal completion button is unavailable for these tools.

## Automated validation

Component tests cover completion gates, support equality, all first-step examples, keyboard selection, checklist navigation/reset, transition change/reset, duplicate events, visible time, hidden/paused completion, owner changes, profile removal/restoration and synchronous readiness races.

Catalogue tests cover all twelve profiles having usable daily pathways, the three exact Executive Function activities, known-ID checks, daily rotation, comfort controls and non-clinical practice counts. Speech & Language tests retain their coverage but no longer assume Executive Function is inactive; unknown-profile rejection remains tested.

Real-dashboard integration tests cover each modal-to-progress flow, catalogue rewards with measured duration, minimal metadata, guest storage isolation, Escape/cancel/focus restoration, paused focus loop, owner-switch closure, stale-owner launch rejection and discarded checklist drafts.

Before declaring CI success, verify the exact feature commit's locked installation, TypeScript, full Jest suite, safeguarding/privacy fixtures and production build. Preparation jobs and preview deployments alone are not that evidence.

## Outstanding release review

- Real phone/tablet browsers, zoom, light/dark layouts and long-label wrapping.
- Keyboard and VoiceOver/TalkBack checks, selected-state announcements, one-item navigation, pause and focus return.
- Registered and guest onboarding/settings to dashboard flows; account switching during use.
- Owner and intended-user/accessibility review of wording, examples and usefulness before a child/school pilot. No claim of clinically validated effectiveness is made.
- Complete the five remaining Batch 2 profile areas and separate grant/pilot gates. PR #20 stays draft until review; production merging and branch cleanup are not part of this slice.

Production, Changers, Worry Diary, Teacher AI PR #16, live database/migrations and other contributors' branches remain out of scope. The one-off preparation workflow is removed in the feature commit, and ordinary CI remains read-only. Every commit has an explanatory GitHub record on issue #18.

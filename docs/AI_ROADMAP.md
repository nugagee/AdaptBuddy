# AdaptBuddy AI roadmap

## Current, evidence-based description

AdaptBuddy has a live OpenAI-powered Buddy and deterministic personalisation and pattern rules. The keyword emotion helper is not a trained NLP model. Fixed catalog weights are not confidence probabilities. Predictive safeguarding, verified proactive notifications and a privacy-preserving classroom heatmap remain development plans.

The Assignment AI Assistant is implemented on `codex/assignment-ai-assistant`, pending a provider-connected preview review and release. It has not been enabled on the live site. The supplied “Code Proof of AI Automation” screenshot is not evidence of the deployed implementation.

## Build order and completion criteria

| Stage | Deliverable | Human decision and boundary | Status |
| --- | --- | --- | --- |
| 1. Assignment AI Assistant | On-demand selection of up to three existing support tools from teacher-reviewed assignment text | Teacher adds each desired tool to the draft; the normal Publish action remains separate. No student records are retrieved for AI. | Implementation and automated checks complete; preview/provider review and release pending. |
| 2. Check-in suggestions | Explainable rules using explicitly shared support requests and task signals, with a visible reason and time window | Responsible adult reviews the suggestion. A missing signal never means a child is safe. No automated emotion/diagnosis or risk prediction. | Planned. Define consent, response ownership, notification delivery, acknowledgements, retries and escalation first. |
| 3. Classroom support overview | Aggregated trends from authorised, purpose-specific classroom data | No private diary/chat text or individual diagnostic labels. Agree minimum group size, suppress small groups and prevent filters/differences from revealing individuals. | Planned. Complete school access, withdrawal, retention and DPIA work first. |
| 4. Predictive Support Signals | A separately evaluated research model, initially in shadow mode | Define measurable outcomes, collect suitable authorised history, assess bias, calibrate results and compare with simple rules. Human review remains required. Never decide that a child is safe, unsafe or lying. | Research stage; not enabled or presented as working. |

These are engineering release criteria, not a claim that school safeguarding or data-protection obligations have been completed. The existing safeguarding completion checklist remains open for wider school/guardian access.

## Stage 1 implementation

- Live assignment workflow entry point: `/teacher/assignments` (`Assignments.tsx`), rather than the unused legacy `AssignmentCreator.tsx` component.
- New server route: `POST /api/assignment-support`.
- Server verifies the Supabase session, confirmed email, active/authorised teacher or admin profile, and ownership of the selected class, using the caller's token and public key with RLS. It never uses a service-role key.
- Only a teacher-entered title, instructions and task type go to OpenAI. The class ID is used for access checks only. Unexpected request fields are rejected. No roster, student profile, diagnosis, diary, mood, safeguarding record or previous conversation is read for generation.
- The teacher confirms that names and private details have been removed before requesting suggestions. Basic server redaction removes contact details and links; it is not a general anonymisation system and does not reliably remove names.
- Input moderation must succeed and be unflagged. The model is restricted to a small JSON schema of allowed tool IDs, with server and client validation. Untrusted prose, invented tools, duplicate IDs, refusals, incomplete responses and malformed JSON are not displayed.
- Visible tool explanations come from the reviewed local catalog. AI selects options; it does not write advice, diagnoses, safety decisions or notifications. This design follows [OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs), including explicit refusal/incomplete handling and local validation.
- Suggestions are temporary UI state. Changing the task/class or leaving the form cancels the pending browser request and discards stale suggestions. It does not guarantee that an already-started provider request incurs no cost.
- Each Add button updates only the support-tool choices in the draft. Publishing still uses the existing assignment service and access policies. There are no new database migrations and no AI-created records or messages.
- Guests cannot request AI. An unavailable service leaves manual assignment creation available and never substitutes a mock “AI” response.

## Cost and rollout controls

`ASSIGNMENT_AI_ENABLED` must equal `true` in the target server environment. It is disabled by default. `ASSIGNMENT_AI_MODEL` defaults to `gpt-4o-mini`, independently of Buddy's model. `OPENAI_API_KEY` remains server-only. Environment examples are in `.env.example`.

Requests occur only after a button click. Limits are 160 title characters, 1,600 instruction characters (also enforced after Unicode normalisation), three suggestions and 180 output tokens. Each fetch has a timeout. A per-account, per-instance limit allows five requests per minute and does not trust a caller-supplied IP as the identity.

The in-memory limiter is **not a distributed quota or spending ceiling**; instances can each accept requests and counters reset on restart. Before wider rollout, configure/check provider-side spending controls and add a shared durable quota if a firm application-wide limit is needed. No paid provider test, plan upgrade or production environment change was performed during implementation.

`store: false` is sent to the Responses API. This is not a blanket promise about provider retention; review the selected organisation/project data controls before enabling the feature.

## Review before enabling

1. Use an isolated preview with a confirmed active teacher and a class they own. The preview needs its own approved server-side OpenAI configuration and the rollout switch; do not expose a server key with a `REACT_APP_` prefix. `npm start` alone does not execute Vercel API routes.
2. Try non-identifying sample tasks across reading, maths, writing, pronunciation, routines and general tasks. Confirm tool choices are useful and respect learner choice. Include an irrelevant prompt and embedded instructions attempting to change the model's task. Do not use real child records for evaluation.
3. Verify the real provider's schema acceptance, refusal behaviour and latency. Automated tests mock the provider and cannot establish recommendation quality.
4. Confirm generating makes no change to the draft, Add changes only the selected tool, and Publish is still required. Check failed requests, signing out, switching class, and editing instructions while a request is pending.
5. Review the preview with the owner/teacher, then release the reviewed branch. Enable only the intended environment. Roll back AI calls by setting `ASSIGNMENT_AI_ENABLED=false`; manual assignments remain available.

## Truthful labels included in this change

- Activity suggestions now describe rule-based personalisation. Fixed percentage “fit” badges are removed; the internal static ranking field is named `baseWeight`.
- The keyword helper card no longer claims an AI/NLP model, confidence percentages or “low risk” reassurance. It presents a tentative feeling-word suggestion and states its limits.
- Landing-page claims of classroom heatmaps and reliable safeguarding alerts are replaced with the actual supported assignment and in-app request behaviour.

## Validation

- All 29 API tests passed, exercising access denial, ownership, input minimisation, privacy boundaries, moderation failure, malformed/unsafe output, rate limiting, Unicode bounds and the disabled rollout switch.
- All 22 app suites / 91 tests passed, including component/service checks for privacy confirmation, explicit teacher selection, normal publishing, stale-result cancellation, guest denial, payload allowlisting and failure handling.
- TypeScript and production build completed successfully. The full app suite initially had one timeout in the existing dashboard offline-sync test while running alongside the build; its isolated rerun and the complete suite rerun both passed without test changes.
- Existing Buddy and authentication/safeguarding prebuild checks remain enabled; the new API suite is also required by prebuild.

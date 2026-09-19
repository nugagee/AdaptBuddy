# AdaptBuddy Upgrade And Testing Rehearsal Pack

Use this document to practise the product demo one feature at a time before funding, ASEP, Citizens Advice, school, parent, or investor conversations.

## Core Demo Story

AdaptBuddy is a joined-up SEN support platform for neurodivergent children, parents, teachers, and administrators. It connects daily child support tools, parent visibility, teacher classroom workflows, privacy-aware support signals, assignment progress, evidence packs, weekly digests, and AI-assisted learning support around the same child profile.

The strongest demo journey is:

1. Child signs up and completes neuro profile onboarding.
2. Child lands on a personalised dashboard.
3. Teacher creates a classroom.
4. Teacher requests access to the child by Buddy ID.
5. Parent approves the school connection and visibility settings.
6. Child sees the classroom on the dashboard, even while approval is pending.
7. Teacher creates a supported assignment.
8. Child sees and completes the teacher task.
9. Child uses Pronunciation Buddy, Writing Pad, Music, Now / Next / Later, or AI Companion.
10. Parent sees progress, teacher access, support summaries, and review material.
11. Teacher sees assignment progress, support signals, reports, messages, and action queues.
12. Admin can monitor users, audit evidence, platform feedback, and risk signals.

## Pre-Demo Readiness Checklist

- Run `npm run build` and confirm it compiles.
- Confirm latest GitHub branch is `upload/adaptbuddy-web`.
- Confirm Vercel has deployed the latest commit.
- Confirm Supabase SQL migrations through `034_child_classroom_dashboard_rpc.sql` have been applied.
- Prepare one test child account, one parent account, one teacher account, and one admin account.
- Keep the child Buddy ID visible somewhere for teacher connection testing.
- Test in a fresh browser session or incognito window for each role.
- Have a backup guest/demo route ready in case live auth slows down.

## Route Map

- Landing: `/`
- Login: `/login`
- Signup: `/signup`
- Guest entry: `/guest`
- Forgot password: `/forgot-password`
- Child neuro selector: `/neuro-selector`
- Child companion onboarding: `/companion-onboarding`
- Child dashboard: `/dashboard`
- Child AI companion: `/companion-buddy`
- Autism space: `/autism-space`
- Writing pad: `/writing-pad`
- Pronunciation Buddy: `/pronunciation-buddy`
- Music: `/music`
- Child settings: `/settings`
- Parent hub: `/parent-hub`
- Teacher login: `/teacher`
- Teacher dashboard: `/teacher/dashboard`
- Teacher classes: `/teacher/classes`
- Teacher students: `/teacher/students`
- Teacher assignments: `/teacher/assignments`
- Teacher signals: `/teacher/signals`
- Teacher messages: `/teacher/messages`
- Teacher reports: `/teacher/reports`
- Teacher settings: `/teacher/settings`
- Admin login: `/admin/login`
- Admin dashboard: `/admin`
- Admin users: `/admin/users`
- Admin audit: `/admin/audit`
- Admin settings: `/admin/settings`

## Upgrade Inventory And How To Test

### 1. Signup, Login, OTP, And Role Routing

What changed:

- Signup flow added with role selection.
- Login flow routes users by role.
- OTP verification modal and email template support.
- Forgot password flow added.
- Route boundaries stop parents, teachers, children, and admins landing in the wrong areas.
- Admin login path added separately.

Why it matters:

- Funders need to see this is not a single-user toy; it is a multi-role platform with controlled access.

How to test:

1. Open `/signup`.
2. Create or use test accounts for child, parent, teacher, and admin.
3. Confirm child routes to neuro onboarding/dashboard.
4. Confirm parent routes to `/parent-hub`.
5. Confirm teacher routes to `/teacher/dashboard`.
6. Confirm admin routes to `/admin`.
7. Try opening a teacher page while logged in as child; confirm redirect or blocked access.
8. Try forgot password from `/forgot-password`.

Pass criteria:

- Each role lands in the correct area.
- No role can casually access another role's private dashboard.

### 2. Neuro Profile Selection

What changed:

- Child neuro selector supports multiple neurotypes.
- Dashboard content adapts based on selected profile.
- Profile onboarding persists selected needs.

Why it matters:

- This proves AdaptBuddy personalises support rather than treating every child the same.

How to test:

1. Log in as a child.
2. Open `/neuro-selector`.
3. Select profiles such as autism, ADHD, dyslexia, dysgraphia, auditory, visual stress, sensory processing, or Tourette's.
4. Continue to dashboard.
5. Confirm dashboard missions and accessibility tools change by profile.

Pass criteria:

- Dashboard shows tailored Neuro Zones and daily activities for selected profiles.

### 3. Child Dashboard

What changed:

- Child dashboard implemented with hero, daily progress, neuro zones, metrics, recommendations, accessibility dock, teacher tasks, classroom panel, Pronunciation Buddy card, and AI companion card.
- Dashboard now includes classroom visibility and pending classroom request status.

Why it matters:

- This is the main child-facing product surface. It must feel joined up.

How to test:

1. Log in as a child.
2. Open `/dashboard`.
3. Confirm the hero greets the child.
4. Confirm Daily Orbit Progress appears.
5. Confirm Neuro Zones appear.
6. Confirm AI companion card appears.
7. Confirm Pronunciation Buddy card appears.
8. Confirm My classroom appears when the child has an active or pending school connection.
9. Confirm Teacher tasks appears when assignments exist.
10. Use Refresh on classroom/task cards.

Pass criteria:

- The dashboard shows a coherent child journey, not isolated tools.

### 4. My Classroom Panel

What changed:

- Added child classroom service.
- Added My classroom dashboard panel.
- Active classroom memberships show on child dashboard.
- Pending teacher requests also show with status labels.
- Supabase RPC `child_classroom_dashboard` added for safe dashboard summary.

Why it matters:

- A teacher-created or requested classroom no longer feels invisible to the child.

How to test active classroom:

1. Log in as teacher.
2. Create a class.
3. Request child by Buddy ID.
4. Log in as parent and approve.
5. Log in as child.
6. Open `/dashboard`.
7. Confirm My classroom shows class name, school, teacher, subject, year group, class code, and Connected label.

How to test pending classroom:

1. Log in as teacher.
2. Create a class.
3. Request child by Buddy ID.
4. Do not approve as parent yet.
5. Log in as child.
6. Open `/dashboard`.
7. Confirm My classroom shows the class with Parent approval status.

Pass criteria:

- Child sees the classroom as soon as there is a relevant pending or active school connection.

Required SQL:

- `033_child_classroom_dashboard_access.sql`
- `034_child_classroom_dashboard_rpc.sql`

### 5. Autism Space

What changed:

- Autism-specific support space added.
- Includes Now / Next / Later, calm corner, social story support, AAC and speech support.
- Communication area links to Pronunciation Buddy.

Why it matters:

- Shows practical support for routines, transitions, communication, and regulation.

How to test:

1. Log in as child with autism profile selected.
2. Open `/autism-space`.
3. Test each tab: transitions, calm, social story, communication.
4. In communication tab, open Pronunciation Buddy link.
5. Confirm navigation returns smoothly.

Pass criteria:

- Autism Space feels like a practical support environment, not just information.

### 6. Now / Next / Later Schedule Board

What changed:

- Now / Next / Later board added.
- Weekly planner support added.
- Child can complete activities.
- Support signals can be sent from the schedule flow.

Why it matters:

- This supports transitions, routine anxiety, executive function, and daily planning.

How to test:

1. Open child dashboard with autism profile selected.
2. Find Now / Next / Later board.
3. Change day or schedule items if available.
4. Mark an activity complete.
5. Trigger a support signal/check-in.
6. Confirm confirmation message appears.

Pass criteria:

- Child can understand current/next/later activities and send support needs.

### 7. Child Support Signal Loop

What changed:

- Child can raise support signals.
- Signals are stored and visible to approved adults.
- Notification loop and support response tracking were added.
- Child notification response loop closes the feedback path.

Why it matters:

- This is a real-life safeguarding and support coordination feature.

How to test:

1. Log in as child.
2. Use Now / Next / Later or support check-in area.
3. Send a need-help or worry-style signal.
4. Log in as teacher or parent with approved access.
5. Confirm signal appears in relevant support/teacher area.
6. Mark or respond to signal if available.

Pass criteria:

- A child need becomes visible to the right adult without exposing private text unnecessarily.

### 8. AI Companion

What changed:

- Child AI companion route and dashboard card added.
- Companion onboarding added.
- Companion includes mood check-in, social story generation, and language simplification.
- AI context service and recommendation engine added.

Why it matters:

- This is the AI incorporation story: AdaptBuddy uses AI for support, simplification, and confidence, not gimmicks.

How to test:

1. Log in as child.
2. Open `/companion-onboarding` if not completed.
3. Open `/companion-buddy`.
4. Test mood check-in.
5. Test language simplifier with a difficult sentence.
6. Test social story generator.
7. Confirm responses are child-friendly and safe.

Pass criteria:

- AI gives supportive, accessible output without diagnosing or making unsafe claims.

### 9. Pronunciation Buddy

What changed:

- New Pronunciation Buddy page added.
- Route `/pronunciation-buddy` added.
- Child dashboard card added.
- Navbar link added.
- Neuro dashboard activities link to it.
- Autism communication tab links to it.
- Teacher pronunciation assignments can open directly into Pronunciation Buddy.
- Safety and consent messaging added.
- Microphone consent state added.
- Private practice without microphone added.
- Custom word bank added.
- Practice history added.
- Weekly downloadable summary added.
- Teacher task completion support added.

Why it matters:

- This is a clear, funder-friendly example of practical AI/accessibility support for speech confidence, phonics, names, and school communication.

How to test standalone:

1. Log in as child.
2. Open `/dashboard`.
3. Click Pronunciation Buddy.
4. Confirm safety/consent section appears.
5. Choose a category: letters, words, names, sentences, or school.
6. Click listen/read-aloud.
7. Try microphone practice if browser permission allows.
8. Try private/self-check practice without microphone.
9. Add a custom word or name.
10. Confirm it appears in the practice bank.
11. Complete practice and confirm history updates.
12. Download weekly summary.

How to test teacher-linked pronunciation assignment:

1. Log in as teacher.
2. Open `/teacher/assignments`.
3. Create assignment type Pronunciation.
4. Add description like `Words: AdaptBuddy, I need help`.
5. Log in as child.
6. Open `/dashboard`.
7. Click Practise on the teacher task.
8. Confirm Pronunciation Buddy loads the assignment phrase.
9. Complete practice and mark linked task complete.
10. Log back in as teacher and confirm progress changed.

Pass criteria:

- Child can practise safely, teacher task links correctly, and progress is recorded.

Required SQL:

- `032_pronunciation_assignments.sql`

### 10. Music And Soundscape Tools

What changed:

- Music page redesigned.
- Playable music tools and soundscapes added.
- Global music player added.
- Music route and dashboard/navigation integration added.

Why it matters:

- Supports sensory regulation, calm breaks, focus, and emotional regulation.

How to test:

1. Log in as child.
2. Open `/music`.
3. Start a track.
4. Confirm global player appears.
5. Change track or pause.
6. Navigate away and confirm player state behaves as expected.

Pass criteria:

- Music can be used as a calming support without breaking navigation.

### 11. Writing Pad

What changed:

- Writing page redesigned.
- Writing pad route added.
- Dashboard/accessibility tools can navigate to writing support.

Why it matters:

- Supports dysgraphia, dyslexia, executive function, and writing anxiety.

How to test:

1. Log in as child.
2. Open `/writing-pad`.
3. Type or use available writing support features.
4. Test toolbar and layout on desktop and mobile width.
5. Navigate back to dashboard.

Pass criteria:

- Writing Pad is easy to find and usable for low-pressure writing.

### 12. Accessibility Dock And Adaptive Tools

What changed:

- Accessibility dock added to child dashboard.
- Tools include text support, visual support, calm sounds, writing support, pronunciation, and reduced-motion style actions depending on profile.

Why it matters:

- This is central to the neuro-inclusive claim.

How to test:

1. Log in as child with different neuro profiles.
2. Open `/dashboard`.
3. Try accessibility dock actions.
4. Confirm music opens for calm sounds.
5. Confirm writing opens for voice/writing support.
6. Confirm pronunciation opens Pronunciation Buddy.

Pass criteria:

- Tools are profile-aware and actually navigate to useful support.

### 13. Parent Hub

What changed:

- Parent dashboard/hub added.
- Parent multi-child connection improved.
- Parent-child linking by Buddy ID added.
- Parent route guarded by role.
- Parent can see linked child profiles.
- Parent support review tab added.
- Printable parent support review added.
- Parent assignment summaries added.
- Parent-teacher school access requests and audit trail added.
- Parent approval gate for teacher access added.

Why it matters:

- Parents are often the people carrying the burden of school communication, evidence, and support coordination.

How to test:

1. Log in as parent.
2. Open `/parent-hub`.
3. Link a child by Buddy ID.
4. Confirm linked child appears.
5. Confirm school access requests appear when teacher requests child.
6. Approve or decline request.
7. Confirm visibility settings/audit trail.
8. Check assignment summaries after teacher creates task.
9. Open support review/printable review if available.

Pass criteria:

- Parent can connect child, control school visibility, see useful summaries, and prepare for meetings.

### 14. Buddy ID Linking

What changed:

- Buddy ID generation/linking flow added.
- Automatic parent-child linking support added.
- Buddy ID SQL ambiguity fixed.

Why it matters:

- Buddy ID gives a practical way to connect parent, teacher, and child without exposing unnecessary personal data.

How to test:

1. Log in as child or parent and locate Buddy ID.
2. Log in as parent and link child by Buddy ID.
3. Log in as teacher and request student by Buddy ID.
4. Confirm invalid Buddy ID gives a useful error.

Pass criteria:

- Buddy ID works for both family linking and teacher request flow.

### 15. Teacher Support Centre Foundation

What changed:

- Teacher support centre added.
- Teacher dashboard added.
- Teacher classes, students, assignments, signals, messages, reports, and settings routes added.
- Teacher navigation menu added.
- Guest write guards added.
- Teacher RLS recursion fixed.

Why it matters:

- This turns AdaptBuddy from a child app into a school support platform.

How to test:

1. Log in as teacher.
2. Open `/teacher/dashboard`.
3. Confirm teacher dashboard stats and panels load.
4. Use nav menu to visit Classes, Students, Assignments, Signals, Messages, Reports, Settings.
5. Confirm no blank screens.

Pass criteria:

- Teacher area feels like a complete workspace.

### 16. Teacher Classes

What changed:

- Teachers can create classes.
- Class codes are generated.
- Classes display counts for students, pending requests, and assignments due.
- Teacher settings shows class setup information.

Why it matters:

- Classroom is the anchor for school workflows.

How to test:

1. Log in as teacher.
2. Open `/teacher/classes` or `/teacher/dashboard`.
3. Create a class with school name, class name, subject, and year group.
4. Confirm class code appears.
5. Refresh page and confirm class persists.

Pass criteria:

- Class creation is reliable and understandable.

### 17. Teacher Student Requests And Parent Approval

What changed:

- Teacher can request student access by Buddy ID.
- Teacher approval is separated from parent approval.
- Parent approval creates active class membership.
- Pending, approved, declined, and cancelled statuses are supported.
- Audit trail tracks teacher and parent approval metadata.

Why it matters:

- This proves privacy by design. Teachers cannot just see a child without parent approval.

How to test:

1. Teacher creates class.
2. Teacher opens Students.
3. Teacher enters child Buddy ID.
4. Confirm request status says waiting for parent approval.
5. Parent opens Parent Hub.
6. Parent reviews request and approves visibility settings.
7. Teacher refreshes Students and sees connected learner.
8. Child dashboard shows My classroom as Connected.

Pass criteria:

- No active classroom membership appears until approval is complete.
- Pending states are clear.

### 18. Teacher Assignments

What changed:

- Teachers can create class assignments.
- Assignment types include reading, maths, writing, pronunciation, calm break, visual routine, social story, and task.
- Support tools can be attached.
- Pronunciation assignment auto-adds pronunciation practice/read-aloud support.
- Assignment lifecycle includes archived state.
- Child dashboard shows teacher tasks.
- Parent assignment summaries added.
- Teacher assignment progress and reports added.

Why it matters:

- This is the educational workflow: teacher sets supported work, child completes, parent/teacher see progress.

How to test:

1. Log in as teacher.
2. Open `/teacher/assignments`.
3. Create assignment for a class with at least one connected child.
4. Add support tools.
5. Log in as child.
6. Confirm Teacher tasks panel appears on dashboard.
7. Click Start.
8. Mark Need help.
9. Mark Done.
10. Add mood after task.
11. Log in as teacher and confirm progress updates.
12. Log in as parent and confirm assignment summary appears.

Pass criteria:

- Assignment status moves across child, teacher, and parent surfaces.

### 19. Teacher Signals Monitor

What changed:

- Teacher support signals monitor added.
- Signals can be filtered by class, risk, and category.
- Teacher can review signal, message family, or request meeting.
- Suggested classroom response generated from signal category.
- Privacy note added: private journal text remains hidden unless shared.

Why it matters:

- This demonstrates safeguarding-aware support escalation.

How to test:

1. Child sends support signal.
2. Teacher opens `/teacher/signals`.
3. Filter by class/risk/category.
4. Review suggested response.
5. Send family message.
6. Create meeting request.
7. Mark or review signal.

Pass criteria:

- Teacher can turn a child support signal into action without overexposing private data.

### 20. Parent-Teacher Messages

What changed:

- Teacher messages workspace added.
- Teacher family coordination loop added.
- Parent-teacher messages are tied to approved class memberships.
- Meeting requests can be created from support actions.

Why it matters:

- Reduces fragmented communication between home and school.

How to test:

1. Ensure child has approved teacher/class membership.
2. Teacher opens `/teacher/messages`.
3. Send a message to family from a signal or message workspace.
4. Parent opens Parent Hub.
5. Confirm message appears.
6. Reply if supported by current UI.

Pass criteria:

- Communication is connected to the child support context.

### 21. Teacher Reports

What changed:

- Teacher reports workspace added.
- Assignment progress reports added.
- Printable/exportable teacher report scope added.
- Printable learner support plans added.
- Teacher support plan drafts added.

Why it matters:

- Turns daily platform data into meeting-ready evidence.

How to test:

1. Log in as teacher.
2. Open `/teacher/reports`.
3. Select class/learner where possible.
4. Generate or preview report/support plan.
5. Use print/export action.
6. Confirm private information boundaries are mentioned.

Pass criteria:

- Teacher can produce a useful SEN support artefact from platform activity.

### 22. Support Action Queue

What changed:

- Shared support action queue added.
- Support actions can be created from signals.
- Support response time metrics added.
- Support response timeline added.
- Support plan export actions added.

Why it matters:

- Shows that AdaptBuddy does not just collect concerns; it helps adults respond.

How to test:

1. Create child support signal.
2. Open Teacher Signals or relevant parent support area.
3. Confirm action queue appears.
4. Add or complete support actions where available.
5. Confirm timeline/response status updates.

Pass criteria:

- Support work can be tracked from concern to response.

### 23. Evidence Pack Exports

What changed:

- Evidence pack export support added.
- Admin audit evidence export added.
- Parent/teacher printable reviews and reports added.

Why it matters:

- This is a funding-level feature: families need evidence for school meetings, SEN reviews, EHCP conversations, and support planning.

How to test:

1. Generate child activity: assignment, support signal, pronunciation practice, or mood check.
2. Open parent/teacher/admin evidence/report area.
3. Export or print evidence pack/review.
4. Confirm export contains useful summary and avoids private hidden data.

Pass criteria:

- Evidence can be produced without manually stitching screenshots together.

### 24. Buddy Digest And Weekly Digest Pipeline

What changed:

- Buddy Digest insight panels added.
- Weekly digest database pipeline added.
- Weekly digest email worker added.
- Weekly digest cron deployment documentation added.
- Weekly Digest scheduler panel added.

Why it matters:

- Creates regular, low-effort summaries for adults.

How to test:

1. Generate activity across child/parent/teacher flows.
2. Open dashboard pages with Buddy Digest panels.
3. Confirm digest summaries appear.
4. Review weekly digest scheduler panel if available.
5. For backend testing, confirm Supabase weekly digest worker/cron settings are deployed.

Pass criteria:

- Adults can get summary insight without manually checking every screen.

### 25. Notification Centre

What changed:

- Persistent notification receipts added.
- Notification events added.
- Notification centre UI added.
- Child support notification loop closed.
- Parent/teacher/admin notification flows added through service layer.

Why it matters:

- Makes support signals and requests harder to miss.

How to test:

1. Trigger a teacher access request.
2. Trigger a support signal.
3. Trigger an assignment update.
4. Open notification centre for relevant role.
5. Acknowledge or respond if UI allows.

Pass criteria:

- Important cross-role events are visible and trackable.

### 26. Product Feedback Loop

What changed:

- Cross-role product feedback loop added.
- Feedback pulse panel added.
- Admin feedback monitoring dashboard added.

Why it matters:

- Useful for pilots: parents, children, teachers, and admins can report what works and what does not.

How to test:

1. Find feedback panel in parent/teacher/admin surfaces.
2. Submit feedback as a user.
3. Log in as admin.
4. Open admin dashboard/settings/feedback monitor.
5. Confirm feedback appears.

Pass criteria:

- Product team can collect pilot feedback directly from users.

### 27. Admin Platform

What changed:

- Admin login added.
- Admin dashboard added.
- Admin users page added.
- Admin audit page added.
- Admin settings page added.
- Admin platform analytics added.
- Admin audit monitoring console added.
- Product feedback monitor added.
- Admin route guard added.

Why it matters:

- Shows governance, oversight, and operational readiness.

How to test:

1. Log in as admin.
2. Open `/admin`.
3. Visit Users, Audit, Settings.
4. Confirm user lists or platform metrics load.
5. Confirm audit views and feedback monitor work.
6. Try admin route as non-admin and confirm blocked.

Pass criteria:

- Admin can monitor platform health and risk without exposing admin screens to normal users.

### 28. Landing Page And Marketing Readiness

What changed:

- Landing page with hero, features, analytics, roles, navbar, and footer.
- Role-specific calls to action.
- Guest entry support.

Why it matters:

- Funders and partners need to understand the platform before logging in.

How to test:

1. Open `/`.
2. Review hero and value proposition.
3. Click signup/login/guest role actions.
4. Test mobile layout.

Pass criteria:

- Landing page clearly explains AdaptBuddy and routes people into the right role.

### 29. Parent AI Coordination And Resources

What changed:

- Parent dashboard service includes resource recommendations.
- Parent support content includes reading level/resource metadata.
- Parent support review and planning surfaces added.

Why it matters:

- Helps families prepare practical next steps rather than only seeing data.

How to test:

1. Log in as parent with linked child.
2. Open Parent Hub.
3. Review support recommendations/resources.
4. Open support review tab.
5. Print/export if available.

Pass criteria:

- Parent gets practical, understandable guidance.

### 30. Security, Privacy, And Data Boundaries

What changed:

- Supabase RLS policies added across profiles, classes, memberships, assignments, support notifications, feedback, admin monitoring, and parent-teacher access.
- Teacher visibility is parent-approved.
- Private child journal text remains protected unless explicitly shared.
- Admin and teacher route guards added.
- Guest write guards added.

Why it matters:

- This is essential for children, SEN, schools, and funding credibility.

How to test:

1. Try viewing teacher pages as child.
2. Try viewing parent hub as teacher.
3. Try viewing admin pages as parent/teacher.
4. Try teacher access before parent approval.
5. Confirm teacher cannot see private child journal text unless designed/approved.

Pass criteria:

- Users see only what their role and approval status permits.

## End-To-End Rehearsal Script

### Demo Flow A: Child Personalisation

1. Open landing page.
2. Log in as child.
3. Show neuro profile/dashboard.
4. Show Daily Orbit Progress.
5. Show Neuro Zones.
6. Open Pronunciation Buddy.
7. Practise a word.
8. Download weekly pronunciation summary.
9. Open Music.
10. Open Writing Pad.
11. Open AI Companion and simplify a difficult sentence.

Message to say:

"This is the child experience: predictable, accessible, personalised, and low-pressure."

### Demo Flow B: Classroom Connection

1. Log in as teacher.
2. Create class.
3. Request child by Buddy ID.
4. Show request status waiting for parent approval.
5. Log in as child.
6. Show My classroom with pending approval.
7. Log in as parent.
8. Approve school access and visibility.
9. Log in as child.
10. Show My classroom as Connected.

Message to say:

"Teachers can request access, but family approval controls the connection."

### Demo Flow C: Assignment And Progress

1. Teacher creates assignment.
2. Child opens dashboard.
3. Child sees Teacher tasks.
4. Child starts task.
5. Child marks Need help.
6. Teacher sees support/progress signal.
7. Child marks Done with mood after task.
8. Parent sees assignment summary.
9. Teacher sees class progress/report.

Message to say:

"A classroom task becomes a measurable support journey, not just homework."

### Demo Flow D: Support Signal To Adult Response

1. Child sends support signal.
2. Teacher opens Signals.
3. Teacher sees risk/category.
4. Teacher messages family or creates meeting.
5. Support action queue/timeline tracks response.
6. Parent reviews support information.

Message to say:

"AdaptBuddy helps adults respond, not just observe."

### Demo Flow E: Evidence And Funding Story

1. Show parent support review.
2. Show teacher report.
3. Show evidence pack/export.
4. Show weekly digest.
5. Show admin audit/feedback monitoring.

Message to say:

"The platform turns everyday support into evidence for school meetings, SEN planning, and service coordination."

## PowerPoint Slide Outline

1. Title: AdaptBuddy
2. The Problem: fragmented SEN support across home and school
3. Who Suffers: child, parent, teacher, support services
4. The Solution: one joined-up neuro-inclusive support platform
5. Child Experience: dashboard, neuro zones, AI companion, pronunciation, writing, music
6. Parent Experience: linked child, school access approval, summaries, evidence
7. Teacher Experience: classroom, students, assignments, signals, messages, reports
8. Safety And Privacy: parent approval, role boundaries, protected data
9. AI Incorporation: companion, language simplification, social stories, recommendations, pronunciation support
10. Real-Life Use Case: teacher request to parent approval to child task completion
11. Evidence Packs: meeting-ready support records
12. Market/Pilot Plan: families, schools, SENCOs, advice organisations
13. Funding Need: patent/IP, AI safety, pilots, marketing, infrastructure, accessibility testing
14. What We Need From BREE/ASEP: prototype support, pitch coaching, investor access
15. Closing: AdaptBuddy helps children be understood earlier and supported better

## Funding And Partner Talking Points

- Patent/IP: protect novel workflow around child-centred adaptive support, cross-role approval, and evidence generation.
- AI incorporation: safe child AI companion, language simplification, pronunciation support, recommendations, adult summaries.
- Pilot testing: validate with families, SENCOs, teachers, and community advice organisations.
- Marketing: reach parents, schools, charities, local authorities, and SEN support networks.
- Infrastructure: secure hosting, Supabase, email, notifications, digest workers.
- Accessibility testing: neurodivergent user testing, mobile/tablet refinement, reading age and sensory load checks.
- Compliance: data protection, safeguarding language, privacy boundaries, consent and visibility settings.

## Citizen Advice Discovery Questions

Use these to prove AdaptBuddy solves real problems:

1. What SEN-related problems do parents most often bring to you?
2. Where do families struggle most: school communication, EHCP evidence, exclusions, diagnosis delays, benefits, or support plans?
3. What documents or evidence do families usually wish they had?
4. What language is hardest for parents to understand in school or council processes?
5. Would a parent-friendly evidence pack help families prepare for meetings?
6. What privacy or safeguarding concerns would you have about a child support app?
7. Which families are most likely to be excluded by digital tools?
8. What would make AdaptBuddy genuinely useful rather than another unused platform?

## Known Things To Watch During Testing

- Classroom panel requires SQL migration `034_child_classroom_dashboard_rpc.sql` for pending requests.
- Pronunciation assignment creation requires SQL migration `032_pronunciation_assignments.sql`.
- Teacher assignment archiving requires migration `023_teacher_assignment_lifecycle.sql`.
- Weekly digest email worker needs Supabase function/cron setup, not just frontend code.
- Browser microphone permission can block Pronunciation Buddy; use private practice as fallback.
- Some features depend on having real linked child/parent/teacher data.
- Guest mode may show demo-safe messaging instead of saving writes.

## Final Meeting Readiness Scorecard

Use this before the meeting:

- Child dashboard complete and understandable.
- Pronunciation Buddy works with and without microphone.
- Teacher can create class.
- Teacher can request child by Buddy ID.
- Pending classroom appears on child dashboard.
- Parent can approve teacher request.
- Active classroom appears on child dashboard.
- Teacher can create assignment.
- Child can complete assignment.
- Parent can see summary/progress.
- Teacher can see progress/report.
- Support signal flow works.
- Evidence/report export works.
- Admin monitoring works.
- Landing page clearly explains the product.
- Funding ask is clear and specific.

## Current Highest-Value Improvements Still Worth Doing

These are not required to prove the current product, but they would strengthen the funding demo:

1. Add a clear child dashboard empty state for no classroom/no assignments.
2. Make parent approval requests visually louder in Parent Hub.
3. Add a one-click "Demo Mode" guide or checklist inside the app.
4. Add a landing page section for "How AdaptBuddy works across child, parent, teacher".
5. Add sample/test data seed script for rehearsals.
6. Add a dedicated "Impact/Evidence" page for funders.
7. Add accessibility QA pass for mobile text wrapping and sensory load.
8. Add a pitch deck generated from this document.

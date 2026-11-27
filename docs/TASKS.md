# Task decomposition: Secure Examination Management System

Requirement IDs (A1, Q10, T4 …) refer to [REQUIREMENTS.md](REQUIREMENTS.md). Theme and visual design are out of scope here.

<!-- progress:start -->
## Progress

**Steps finished: 7 of 16** · required subtasks ticked: 113 of 245 · **next: step 8, Exam screen: autosave, resume, submit**

| Step | Work | Tasks | Subtasks | Status |
|---:|---|---|---:|---|
| 1 | Remove template content | FND-1 | 4/4 | ✅ Done |
| 2 | Project structure and database | FND-2, FND-3, DB-1, DB-2 | 22/22 | ✅ Done |
| 3 | Sign-in and permissions | AUTH-1, AUTH-2, AUTH-3 | 17/19 | ✅ Done (2 carried over) |
| 4 | User management and sample data | USR-1, USR-2, DB-3 | 12/12 | ✅ Done |
| 5 | Question bank | QB-1, QB-2, QB-3 | 13/13 | ✅ Done |
| 6 | Examinations and enrolment | EXM-1, EXM-2, EXM-3, ENR-1, ENR-2, ENR-3 | 24/25 | ✅ Done (1 carried over) |
| 7 | Attempt engine and server timing | ATT-1, ATT-2, ATT-3, ATT-4 | 13/13 | ✅ Done |
| 8 | Exam screen: autosave, resume, submit | WS-1, WS-2, WS-3, WS-4 | 3/17 | ▶️ Next |
| 9 | Grading and results | GRD-1, GRD-2, GRD-3, RES-1, RES-2, RES-3, RES-4 | 4/22 | 🟡 Started early |
| 10 | Monitoring and announcements | MON-1, MON-2, MON-3, MON-4 | 0/13 | ⬜ Not started |
| 11 | Innovation: fair randomized papers | FAIR-1, FAIR-2, FAIR-3 | 0/10 | ⬜ Not started |
| 12 | Network status, preferences, scratchpad | NET-1, PREF-1, PAD-1 | 0/12 | ⬜ Not started |
| 13 | Sandbox and bulk import | SBX-1, SBX-2, IMP-1, IMP-2 | 0/12 | ⬜ Not started |
| 14 | Question analytics, PDF, verification | QAN-1, PDF-1, PDF-2, VER-1, VER-2 | 0/10 | ⬜ Not started |
| 15 | Security and reliability pass | SEC-1, SEC-2, SEC-3, REL-1, REL-2, REL-3 | 0/20 | ⬜ Not started |
| 16 | Testing, hosting, submission | TST-1, TST-2, SHIP-1, SHIP-2, SHIP-3, SHIP-4 | 1/21 | 🟡 Started early |

### Carried over from finished steps

- **AUTH-3** (step 3): Examiner: monitoring, grading, results (arrive in steps 9 and 10)
- **AUTH-3** (step 3): Candidate: results (arrives in step 9)
- **ENR-1** (step 6): Bulk enrol from import results

### Already done ahead of its step

- **WS-2** (step 8): Idempotent per-answer save with a revision number; older revisions ignored
- **WS-4** (step 8): Repeat submit returns the same successful result
- **WS-4** (step 8): ★ Submission receipt: time and a hash of the submitted answers
- **GRD-1** (step 9): Pure function per type and rule; unanswered = 0
- **GRD-1** (step 9): Grades against the attempt's frozen question versions
- **GRD-1** (step 9): Exact decimal handling with one rounding rule
- **GRD-1** (step 9): Re-running gives the same result
- **TST-1** (step 16): Permission script from AUTH-2

Steps are the working order. Detailed subtasks are below, grouped by feature.

<!-- progress:end -->

## How to read this

| Tag | Meaning |
|---|---|
| **P0** | Core workflow or security. Nothing ships without it |
| **P1** | Secondary feature (all 8 are expected) |
| **P2** | Innovation challenge |
| **★** | Extra that can raise marks. Only after P0–P2 work |
| **S / M / L** | Relative effort |
| **Sec** | Security rule that must hold for that task |
| **Done when** | The check that closes the task |

## Working assumptions (change here if the team decides otherwise)

- Keep the template's foundation (Next.js, Prisma, JWT cookie, Docker), if the competition guide allows it.
- Roles: `ADMIN`, `EXAMINER`, `CANDIDATE`. No public sign-up; admins create or import accounts.
- One real attempt per candidate per exam.
- Attempt deadline = the earlier of (start + duration + extra time) and (exam end + extra time). Late starters get the time left.
- Multiple-select: examiner picks `ALL_OR_NOTHING` or `PARTIAL` = marks × max(0, right − wrong) ÷ number of correct options. Negative marking off.
- Live updates by polling (5–10 s). No outside real-time service required.
- **Decided:** build and test on the Dockerized app and Postgres. Hosting is done later, before the deadline.
- Innovation: 5.2 fair randomized papers (not yet confirmed).

## Build order and dependencies

Dependencies only; the working order is the step table under Progress.

```
FND → DB → AUTH → USR ─┐
                 QB → EXM → ENR → ATT → WS → GRD → RES
                                         └→ MON
Secondary: NET (needs WS) · SBX (needs ATT) · IMP (needs USR, QB) · PDF → VER (need RES)
           QAN (needs GRD) · PREF, PAD (need WS)
Innovation: FAIR (needs QB, ATT; reads QAN)
SEC and REL apply to every task. TST and SHIP run throughout.
```

| Milestone | Contains | Proof |
|---|---|---|
| M0 Skeleton | FND, DB, AUTH | Three roles sign in on the Docker setup |
| M1 Thin loop | Minimal QB, EXM, ENR, ATT, WS, GRD, RES | One MCQ exam goes from creation to published result |
| M2 Core complete | Rest of P0 | All §3 requirements pass |
| M3 Secondary | All P1 | Eight features demonstrable |
| M4 Innovation | P2 | Fairness comparison works |
| M5 Ship | TST, SHIP | Test list passes on Docker, hosted and rechecked, README done, no further pushes |

---

## FND. Foundation and cleanup

### FND-1 Strip template content, keep services · P0 · M — ✅ Done (step 1)
Covers: T13, U1
- [x] Delete real-estate content (property pages, APIs, components, models, copy)
- [x] **Keep every service** (Calendar, ElevenLabs, Supabase, Pusher, 100ms, Stripe, email, moderation, chat, support), untied from property data
- [x] Secure restored services and make each optional
- [x] Replace landing page with a simple entry to sign-in
- **Rule:** ask the user before removing anything.
- **Done when:** type check, lint and production build pass with no dead routes.

### FND-2 Project structure and conventions · P0 · S — ✅ Done (step 2)
Covers: T13, T14
- [x] Layers: route handler (auth → validate → call service → respond), `lib/services/*`, `lib/policies/*`, `lib/validation/*`
- [x] Shared API error shape `{ error: { code, message, fields? } }` and wrapper that handles it
- [x] `.env.example` with every variable; fail at start-up if a required one is missing
- [x] Time helper: the server clock is the only source of "now"

### FND-3 No paid dependency · P0 · S — ✅ Done (step 2)
Covers: T15
- [x] Every required feature runs with only Postgres and the app
- [x] Email is optional: credentials can be shown or downloaded instead
- [x] Google sign-in is optional
- **Done when:** the full demo works with all third-party keys blank.

---

## DB. Data model

### DB-1 Schema · P0 · M — ✅ Done (step 2)
Covers: T12, Q1, Q10, T7
- [x] `User` (email unique, lowercase; role enum; status; passwordHash; sessionVersion; mustChangePassword; failedLogins; lockedUntil)
- [x] `Topic`; `Question` (type, topic, difficulty, owner, archived)
- [x] `QuestionVersion` (**immutable**: text, options with correct flags, marks, scoring rule, marking notes)
- [x] `Exam` (owner, title, instructions, startsAt, endsAt, durationMinutes, totalMarks, passMark, status, randomization settings, resultsPublishedAt)
- [x] `ExamQuestion` (exam, questionVersion, position, marks)
- [x] `Enrollment` (exam, candidate, extraMinutes)
- [x] `Attempt` (exam, candidate, isSandbox, status, startedAt, deadlineAt, submittedAt, submitReason, seed, activeSessionId, lastSeenAt)
- [x] `AttemptQuestion` (attempt, questionVersion, position, optionOrder, marks): the frozen paper
- [x] `Answer` (attemptQuestion, response, markedForReview, revision, savedAt, autoMarks, manualMarks, feedback, gradedBy, gradedAt)
- [x] `Incident`, `Announcement`, `AnnouncementRead`
- [x] `ResultReport` (attempt, verificationCode, payloadHash, issuedAt, revokedAt)
- [x] `AuditLog`, `Preference`, `Scratchpad`

### DB-2 Constraints and indexes · P0 · S — ✅ Done (step 2)
Covers: T5, T6, T12
- [x] Unique: `Enrollment(exam, candidate)`, one non-sandbox `Attempt(exam, candidate)` (partial index), `Answer(attemptQuestion)`, `ResultReport.verificationCode`
- [x] Foreign keys with deliberate delete rules; never cascade-delete attempts or results
- [x] Indexes for exam lists, attempts by exam and status, incidents by exam, audit by date

### DB-3 Seed data · P0 · S — ✅ Done (step 4)
Covers: D4, D7
- [x] Admin, 2 examiners, ~30 fictional candidates with documented passwords
- [x] Question bank of 60+ across 4 topics and 3 difficulties, all 3 types
- [x] One completed and published exam with attempts (feeds analytics), one live, one upcoming, one draft
- [x] Safe to re-run
- [x] Reset command for the demo (`reset:demo`; deletes demo data, written but never run: ask the user first)

---

## AUTH. Authentication and authorization

### AUTH-1 Sign-in and sessions · P0 · M — ✅ Done (step 3)
Covers: A1, T2
- [x] Email and password; bcrypt hashes; emails normalised to lowercase
- [x] Signed session in an `httpOnly`, `SameSite=Lax` cookie, `Secure` on HTTPS, with expiry
- [x] Sign out; change password; forced change on first sign-in
- [x] **Sec:** no fallback JWT secret; identical error for unknown email and wrong password
- [x] **Sec:** lock after repeated failures, counted in the database
- [x] **Sec:** disabling a user or changing role or password ends existing sessions (`sessionVersion`)
- [x] **Sec:** close public sign-up and "first user becomes admin"; Google sign-in only for existing accounts

### AUTH-2 Central permission layer · P0 · M — ✅ Done (step 3)
Covers: A5, A6, T1
- [x] `requireUser(roles)` reading role and status from the database on every request
- [x] Policy functions: `canManageExam`, `canAttemptExam`, `canViewAttempt`, `canGrade`, `canViewResult`, `canManageQuestion`
- [x] Apply to every API route **and** every server page
- [x] **Sec:** examiners see only their own exams, questions, attempts; candidates only their own records
- [x] **Sec:** another user's resource returns 404; role is never read from the request body
- [x] **Sec:** one permission table listing each route and its allowed roles
- **Done when:** a script calling every route as each role and anonymously matches the table.

### AUTH-3 Role-specific experience · P0 · S — 🟡 Partly done (step 3)
Covers: A2
- [x] Redirect to the right dashboard after sign-in
- [x] Admin: users, system overview, audit log
- [x] Examiner: exams, question bank, candidates
- [ ] Examiner: monitoring, grading, results (arrive in steps 9 and 10)
- [x] Candidate: upcoming, available, completed exams
- [ ] Candidate: results (arrives in step 9)

---

## USR. Administration

### USR-1 Account management · P0 · M — ✅ Done (step 4)
Covers: A3, A4
- [x] List with search, role and status filter, pagination
- [x] Create, edit, disable, re-enable; assign and change role
- [x] Reset password with a one-time temporary password shown once
- [x] **Sec:** admin cannot demote or disable themselves or the last admin
- [x] **Sec:** every change written to the audit log; password hashes never returned

### USR-2 Platform operations · P0 · S — ✅ Done (step 4)
Covers: A3, A6
- [x] Overview: counts of users, exams by state, active attempts, open incidents
- [x] Audit log viewer with filters (actor, action, date)
- [ ] ★ Admin view of any exam's status (read only) for support

---

## QB. Question bank

### QB-1 Topics and questions · P0 · M — ✅ Done (step 5)
Covers: Q1, Q2, Q3
- [x] Create and rename topics
- [x] Create, edit, duplicate, archive questions; difficulty `EASY` / `MEDIUM` / `HARD`
- [x] Search and filter by topic, difficulty, type; pagination
- [x] Editing creates a new `QuestionVersion`; old versions stay for existing papers
- [x] **Sec:** question text rendered as plain text (no raw HTML)

### QB-2 Types and marking schemes · P0 · M — ✅ Done (step 5)
Covers: Q5, Q6, Q7, Q8
- [x] Single MCQ: 2–8 options, exactly one correct
- [x] Multiple-select: at least one correct; scoring rule chosen
- [x] Written: maximum marks, marking notes, optional length limit
- [x] Server validation: non-empty text, unique options, positive marks
- [x] **Sec:** correct flags and marking notes only in examiner responses

### QB-3 Assign to exams · P0 · S — ✅ Done (step 5)
Covers: Q4
- [x] Pick from bank with filters; reorder; remove; override marks per exam
- [x] Running total against the exam's total marks
- [ ] ★ Add by recipe ("5 easy from Topic X")
- [x] ★ Version history and "used in N exams"

---

## EXM. Examination management

### EXM-1 Create and configure · P0 · M — ✅ Done (step 6)
Covers: E1, E5
- [x] Title, instructions, start, end, duration, total marks, pass mark
- [x] Settings: shuffle questions, shuffle options, allow backward navigation
- [x] Validate end > start, duration > 0 and fitting the window, marks > 0
- [x] Store UTC; show local time with zone
- [x] Examiner list with state filter; edit; delete drafts only
- [x] ★ Duplicate an exam

### EXM-2 Lifecycle · P0 · M — ✅ Done (step 6)
Covers: E2, E3
- [x] Stored `DRAFT` / `PUBLISHED`; `ONGOING` and `COMPLETED` derived from server time (no scheduler needed)
- [x] One state function used by every page and API
- [x] Allowed edits per state: draft all; published-before-start limited, or unpublish; ongoing and completed locked
- [x] Unpublish only while no attempt exists
- [x] **Sec:** candidate responses never include drafts, or questions before start

### EXM-3 Review and publish · P0 · S — ✅ Done (step 6)
Covers: E4
- [x] Preview of all settings, questions, marks, enrolled count
- [x] Publish blocked with a clear checklist: no questions, marks mismatch, past schedule, no candidates (warn)
- [x] Publishing is idempotent and audited

---

## ENR. Candidate management

### ENR-1 Enrolment · P0 · M — 🟡 Partly done (step 6)
Covers: C1, C2
- [x] Search candidates; enrol one or many; remove before they start
- [x] List with status: not started, in progress, submitted, graded
- [ ] Bulk enrol from import results
- [x] **Sec:** only the exam owner; only active candidate accounts
- [x] ★ Extra time per candidate with a reason (accessibility accommodation), audited

### ENR-2 Candidate dashboard · P0 · M — ✅ Done (step 6)
Covers: C3, C4
- [x] Sections: available, upcoming, completed
- [x] Instructions, schedule, duration, marks, access status and why ("opens in 2 h", "closed", "submitted")
- [x] Server-synced countdown to opening

### ENR-3 Entry gate · P0 · S — ✅ Done (step 6)
Covers: C5, C6, E3
- [x] Server check: signed in, active, enrolled, published, inside window, not already submitted
- [x] Instructions screen with explicit "Start"
- [x] **Sec:** the same gate guards fetching, saving and submitting, not only the page

---

## ATT. Attempt engine

### ATT-1 Start and freeze the paper · P0 · M — ✅ Done (step 7)
Covers: Q9, Q10, T7, T5
- [x] In one transaction: create attempt, compute `deadlineAt`, write `AttemptQuestion` rows
- [x] Shuffle question and option order with a stored seed; options keep stable IDs so marking is unaffected
- [x] Repeated or parallel "start" returns the same attempt
- **Done when:** editing the bank mid-attempt changes nothing for that attempt.

### ATT-2 Server-authoritative timing · P0 · M — ✅ Done (step 7)
Covers: I7, T4, E3
- [x] API returns `serverNow` and `deadlineAt`
- [x] Client counts down from a monotonic timer plus offset; re-syncs on focus and reconnect
- [x] Every write rejected after deadline + fixed network grace (e.g. 5 s)
- [x] **Sec:** client timestamps are never trusted

### ATT-3 Finalization · P0 · M — ✅ Done (step 7)
Covers: I8, T5, T6
- [x] `finalize(attempt, reason)`: `MANUAL`, `TIME_EXPIRED`, `EXAMINER`
- [x] Atomic status change from `IN_PROGRESS` only; then auto-grade once
- [x] Triggered by client at zero, and lazily whenever anyone reads an attempt (or its exam) past deadline + grace
- [x] ★ Scheduled sweep endpoint protected by a secret
- **Done when:** a candidate who closes the browser is still finalized with accepted answers only.

### ATT-4 Candidate-safe paper API · P0 · S — ✅ Done (step 7)
Covers: T2, T3, A6
- [x] Serializer that whitelists fields: text, option IDs and text, marks, own answers
- [x] **Sec:** no correct flags, marking notes, difficulty or other candidates' data in any response or page payload
- **Done when:** searching network responses during an attempt finds no answer data.

---

## WS. Examination workspace

### WS-1 Layout and navigation (functional) · P0 · M — ⬜ Not started (step 8)
Covers: I1, I2
- [ ] Question, marks, remaining time, previous and next, question grid
- [ ] States: unanswered, answered, marked for review (and both), shown by text or icon, not colour only
- [ ] Inputs per type; clear selection
- [ ] Keyboard operable, labelled controls, time warnings announced to screen readers
- [ ] ★ Keyboard shortcuts for next, previous, mark

### WS-2 Autosave · P0 · L — 🟡 Partly done (step 8)
Covers: I3, T10, T11
- [ ] Save on change; debounce typing; flush on question change and tab hide
- [x] Idempotent per-answer save with a revision number; older revisions ignored
- [ ] Local pending queue; retry with back-off
- [ ] Visible state: saving, saved at time, not saved
- [ ] **Sec:** answer must belong to this attempt; option IDs validated; length capped; rate limited

### WS-3 Resume · P0 · M — ⬜ Not started (step 8)
Covers: I4, I5
- [ ] Reload restores answers, marks, current question and server time
- [ ] Merge unsent local answers if still within time
- [ ] Single active session: a new device takes over, the old one becomes read only, event recorded
- [ ] Clear local data after submission and on sign-out (shared computers)

### WS-4 Review and submit · P0 · S — 🟡 Partly done (step 8)
Covers: I6, T5
- [ ] Summary of answered, unanswered, marked; jump to any
- [ ] Flush pending saves, then confirm and submit; button disabled while working
- [x] Repeat submit returns the same successful result
- [x] ★ Submission receipt: time and a hash of the submitted answers

---

## MON. Monitoring

### MON-1 Live attempt board · P0 · M — ⬜ Not started (step 10)
Covers: M1, M2, M4
- [ ] Per candidate: status, answered count, current time left, last seen, incident count
- [ ] Exam totals: not started, active, disconnected, submitted
- [ ] Polling; filter and search; paginated for large cohorts
- [ ] **Sec:** exam owner only; no answer content needed on this board

### MON-2 Events and incidents · P0 · M — ⬜ Not started (step 10)
Covers: M3, M6, T2
- [ ] Heartbeat; record tab hidden, window blur, offline and reconnect, session takeover, late save rejected, fullscreen exit if used
- [ ] Group repeats and record durations to limit noise
- [ ] Per-attempt timeline; examiner marks reviewed and adds a note
- [ ] **Sec:** server timestamps; rate limit and size cap on event intake; candidate cannot delete events
- [ ] Tell candidates beforehand what is recorded

### MON-3 Fair wording · P0 · S — ⬜ Not started (step 10)
Covers: M7
- [ ] Label as "indicators", with neutral explanations and possible innocent causes
- [ ] No automatic penalty, score change or "cheating" label

### MON-4 Announcements · P0 · S — ⬜ Not started (step 10)
Covers: M5
- [ ] Send to all candidates of an exam; show inside the workspace without losing input
- [ ] Late joiners see earlier ones; history kept
- [ ] ★ Message one candidate; "read by N"
- [ ] ★ Examiner actions with mandatory reason and audit: add time, force submit

---

## GRD. Evaluation and grading

### GRD-1 Auto-grading · P0 · M — 🟡 Partly done (step 9)
Covers: G1, T6
- [x] Pure function per type and rule; unanswered = 0
- [x] Grades against the attempt's frozen question versions
- [x] Exact decimal handling with one rounding rule
- [x] Re-running gives the same result
- [ ] Unit tests: all-correct, partial, over-selection, none, invalid option

### GRD-2 Manual grading · P0 · M — ⬜ Not started (step 9)
Covers: G2, G3
- [ ] Queue by exam, by question or by candidate; pending count
- [ ] Marks between 0 and the question's maximum, validated on server; feedback
- [ ] Concurrent edits detected by version
- [ ] ★ Anonymous grading (names hidden until done)
- [ ] ★ Rubric criteria per written question

### GRD-3 Totals and state · P0 · M — ⬜ Not started (step 9)
Covers: G4, G5, G6
- [ ] State: `PENDING_MANUAL` → `GRADED` → `PUBLISHED`
- [ ] Total always derived from answer marks in one transaction
- [ ] Review table before publishing, flagging ungraded items
- [ ] Mark changes audited with old and new values
- [ ] ★ Void a faulty question and regrade everyone affected, with reason

---

## RES. Results and analytics

### RES-1 Publication · P0 · S — ⬜ Not started (step 9)
Covers: R1, R2
- [ ] Publish only when the exam is completed, no attempt is still in progress (extra time included) and nothing is pending
- [ ] Confirm step; audited; candidates notified in app
- [ ] Correction path: unpublish → fix → republish, with history
- [ ] **Sec:** candidates get only their own result, only after publication

### RES-2 Candidate result view · P0 · S — ⬜ Not started (step 9)
Covers: R2, R4
- [ ] Score, maximum, pass or fail, per-question marks and feedback
- [ ] ★ Examiner setting for whether correct answers are revealed after the exam closes

### RES-3 Examiner analytics · P0 · M — ⬜ Not started (step 9)
Covers: R3, R4
- [ ] Enrolled, attempted, absent, average, median, high, low, pass rate
- [ ] Score distribution; per-topic performance; candidate score table
- [ ] Real non-sandbox data only, through one shared query
- [ ] ★ CSV export (escape cells starting `= + - @`)

### RES-4 History · P0 · S — ⬜ Not started (step 9)
Covers: R5
- [ ] Past attempts readable by the owner examiner and admin; candidate sees own published
- [ ] Disabled users' records retained; no hard delete

---

## NET. Network-aware interface

### NET-1 Connectivity and sync status · P1 · M — ⬜ Not started (step 12)
Covers: S1a, S1b, S1c, T11
- [ ] Combine browser online events with heartbeat success and latency
- [ ] States: online, unstable, offline, reconnecting
- [ ] Count of unsaved answers; "retry now"; warning before leaving with unsaved work
- [ ] State what happens: timer continues, answers send when reconnected if still in time
- [ ] Block submit while offline, with explanation

## PDF. Reports

### PDF-1 Generation · P1 · M — ⬜ Not started (step 14)
Covers: S2a, S2b
- [ ] Candidate result report and exam summary report, built on the server
- [ ] Real data; page numbers, long text wrapping, non-Latin characters checked
- [ ] ★ Bulk download for an exam

### PDF-2 Access control · P1 · S — ⬜ Not started (step 14)
Covers: S2c, T3
- [ ] **Sec:** candidate: own published report; examiner: own exams; no public or guessable file URLs

## SBX. Examination sandbox

### SBX-1 Preview as candidate · P1 · M — ⬜ Not started (step 13)
Covers: S3a
- [ ] Same workspace and engine with `isSandbox`; works for drafts; ignores schedule
- [ ] Persistent "sandbox" marker; restart and discard; ★ shortened timer to demonstrate expiry

### SBX-2 Isolation · P1 · S — ⬜ Not started (step 13)
Covers: S3b
- [ ] Excluded from results, analytics, question stats, monitoring, reports, enrolment status
- [ ] **Sec:** exam owner only; cannot be converted into a real attempt
- **Done when:** statistics are identical before and after a sandbox run.

## IMP. Bulk import

### IMP-1 Candidate import · P1 · M — ⬜ Not started (step 13)
Covers: S4a, S4c, S4d
- [ ] CSV and JSON; downloadable templates
- [ ] Preview with row and field errors; duplicates in file and database
- [ ] All-or-nothing transaction after confirmation; summary
- [ ] Temporary passwords in a one-time download; optional enrol into an exam
- [ ] **Sec:** role forced to candidate; existing accounts never overwritten; file size and row limits

### IMP-2 Question import · P1 · M — ⬜ Not started (step 13)
Covers: S4b, S4c, S4d
- [ ] All three types, topics, difficulty, marks, correct answers
- [ ] Same validation as manual entry; preview; downloadable error report
- [ ] **Sec:** imported into the importer's bank only

## QAN. Question analytics

### QAN-1 Per-question insight · P1 · M — ⬜ Not started (step 14)
Covers: S5
- [ ] Attempts, skip rate, correct rate (observed difficulty), average marks
- [ ] Option selection counts to expose common wrong answers
- [ ] Declared against observed difficulty; show sample size
- [ ] ★ Discrimination index (top against bottom group) flagging possibly ambiguous questions

## VER. Verifiable reports

### VER-1 Issue · P1 · S — ⬜ Not started (step 14)
Covers: S6a
- [ ] Random unguessable code and signed hash of the result data, printed with a QR code

### VER-2 Public verification page · P1 · S — ⬜ Not started (step 14)
Covers: S6a, S6b, T3
- [ ] Enter or scan code: valid, superseded, revoked or unknown
- [ ] Reports older than a mark correction show "superseded"
- [ ] **Sec:** only exam title, masked name, score, issue date; rate limited; no listing or search

## PREF. Workspace customization

### PREF-1 Preferences · P1 · M — ⬜ Not started (step 12)
Covers: S7a, S7b, U3
- [ ] Question navigator position or hidden; one question or list view
- [ ] Text size, line spacing, high contrast, timer compact or full
- [ ] Saved per user on the server, restored on any device; reset to default
- [ ] **Sec:** validated against an allowed list

## PAD. Digital scratchpad

### PAD-1 Rough work · P1 · M — ⬜ Not started (step 12)
Covers: S8
- [ ] Text notes and a drawing area, openable beside the question
- [ ] Saved per attempt, survives refresh; clearly "not graded"
- [ ] ★ Basic calculator
- [ ] **Sec:** private to the candidate; capped size; never affects the save of real answers

---

## FAIR. Innovation 5.2: fair randomized papers · P2

### FAIR-1 Exam blueprint · M — ⬜ Not started (step 11)
Covers: N2
- [ ] Rules per topic × difficulty: count and marks
- [ ] Feasibility check with clear shortfall messages

### FAIR-2 Balanced generator · L — ⬜ Not started (step 11)
Covers: N1, Q9
- [ ] Difficulty score per question: declared level, blended with observed correct rate when enough data
- [ ] Select per cell so every paper has equal marks and a total difficulty within a tolerance
- [ ] Limit overuse of any question; stored seed for reproduction
- [ ] Plugs into ATT-1; paper frozen as usual
- [ ] Unit tests: constraints always met

### FAIR-3 Evidence and explanation · M — ⬜ Not started (step 11)
Covers: N3, N4
- [ ] Simulate e.g. 200 papers: plain random against balanced (spread, min, max, overlap)
- [ ] Per-candidate paper difficulty after the exam, against score
- [ ] Short written trade-offs: bank size, variety against fairness, cold-start difficulty

### Optional second challenge ★ (5.4 disputes)
- [ ] Candidate raises a dispute on a published question within a time limit
- [ ] Examiner replies, accepts or rejects with reason; accepting triggers GRD-3 regrade and new report version
- [ ] Full timeline visible to both; incidents attached as context

---

## SEC. Security hardening (applies everywhere)

### SEC-1 Input and request safety · P0 · M — ⬜ Not started (step 15)
Covers: T1, T8, T9
- [ ] Schema validation for every body, query and path parameter; reject unknown fields
- [ ] Size limits; pagination caps
- [ ] Origin check on state-changing requests (CSRF)
- [ ] ORM queries only; no raw string SQL; no raw HTML rendering
- [ ] Rate limits on sign-in, save, events, verification, import

### SEC-2 Data protection · P0 · M — ⬜ Not started (step 15)
Covers: T2, T3
- [ ] Explicit response serializers; never return whole database rows
- [ ] No-store caching on private responses
- [ ] Security headers: CSP, frame denial, no-sniff, referrer policy
- [ ] Generic errors to clients; no secrets, passwords or answers in logs
- [ ] No debug, seed or test endpoints in production; secrets only in environment
- [ ] Dependency audit

### SEC-3 Audit trail · P0 · S — ⬜ Not started (step 15)
Covers: T2, T14
- [ ] Record sign-ins, user and role changes, publish, enrolment, mark changes, time changes, result publication
- [ ] Append only; visible to admin
- [ ] ★ Chain each entry's hash to the previous one to show tampering

## REL. Validation and reliability (applies everywhere)

### REL-1 Frontend and backend validation · P0 · S — ⬜ Not started (step 15)
Covers: T8, T9
- [ ] One shared schema used by form and API; field-level messages

### REL-2 Failure handling · P0 · M — ⬜ Not started (step 15)
Covers: T10, T11
- [ ] Loading, empty, error and retry states on every screen
- [ ] Timeouts; disabled buttons while pending; safe repeats for create, publish, submit
- [ ] Expired session during an exam: sign in again and resume with pending answers
- [ ] Database errors never leave half-written records (transactions)

### REL-3 Scale · P0 · S — ⬜ Not started (step 15)
Covers: T12, T14
- [ ] Pagination and no per-row queries on lists and monitoring
- [ ] Connection pooling
- [ ] ★ Small load script: 100 simulated candidates saving answers; keep the numbers for the demo

---

## TST. Testing

All testing runs against the Dockerized app and Dockerized Postgres (`docker-compose.dev.yml`).

### TST-1 Automated checks · P0 · M — 🟡 Partly done (step 16)
Covers: T6, T14
- [ ] Unit tests: grading, exam state, deadline, balanced generator
- [x] Permission script from AUTH-2
- [ ] Type check, lint, build
- [ ] Clean-start check: wipe the Docker volume, create the schema, seed, run the tests

### TST-2 Scenario run · P0 · M — ⬜ Not started (step 16)
Covers: D7, T10
- [ ] Refresh and reopen mid-exam · wrong device clock · offline and reconnect
- [ ] Double submit and two tabs · save after expiry · entry before window or unenrolled
- [ ] Changed IDs in URLs and APIs · answer keys absent from responses
- [ ] Bank edit during attempt · marks above maximum · early result access
- [ ] Broken import file · sandbox leaves statistics unchanged

## SHIP. Deployment and submission

### SHIP-1 Host (later, before the deadline) · P0 · M — ⬜ Not started (step 16)
Covers: D2
- [ ] Choose host and a **new, empty** database; set environment; migrations; HTTPS; health check
- [ ] Fix or disable the failing deploy workflow
- [ ] Production image builds and runs locally in Docker beforehand (`docker-compose.yml`)
- [ ] Reserve time before the deadline; run the scenario list again on the hosted app

### SHIP-2 Repository · P0 · S — ⬜ Not started (step 16)
Covers: D1, D9
- [ ] Confirm guide rules and deadline; small, regular commits
- [ ] No secrets in history; give judges access

### SHIP-3 README · P0 · S — ⬜ Not started (step 16)
Covers: D3, D4, D5, D6
- [ ] Setup, environment, dependencies, seed command
- [ ] Test credentials for admin, examiner, candidate
- [ ] Innovation: problem, approach, trade-offs; feature-to-requirement table

### SHIP-4 Demo and freeze · P0 · S — ⬜ Not started (step 16)
Covers: D8, D10, N3
- [ ] 15-minute script: setup (2) · take exam with refresh and offline (4) · monitor and grade (3) · results, PDF, verify (2) · secondary and innovation (3) · security proof (1)
- [ ] Reset demo data; rehearse on the deployed app; keep a local fallback
- [ ] Final push and deploy **before** the deadline, then nothing

---

## Deferred: design pass

Covers: U1, U2, U3, U4, U5, U6
- [ ] Consistent accessible interface, navigation and hierarchy, responsive layouts, discoverability, purposeful visuals, distinct non-generic look. Planned separately (20 marks).

## Extras ranked by value for effort

| Rank | Extra | Task | Helps |
|---|---|---|---|
| 1 | Extra time per candidate with reason | ENR-1 | Core, UX, fairness |
| 2 | Void faulty question and regrade | GRD-3 | Core, technical |
| 3 | Examiner add-time and force-submit with audit | MON-4 | Core |
| 4 | Submission receipt hash | WS-4 | Trust |
| 5 | Discrimination index | QAN-1 | Secondary, innovation depth |
| 6 | Anonymous grading | GRD-2 | Fairness |
| 7 | Load test numbers | REL-3 | Technical |
| 8 | Tamper-evident audit log | SEC-3 | Security |
| 9 | Dispute workflow | 5.4 | Innovation |

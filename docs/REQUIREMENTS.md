# Web-e-Thon: Secure Examination Management System

Requirements breakdown of the 7-page problem statement (Technoverse 5.0, COMSATS University Lahore,
ACM CUI Lahore student chapter, 27–28 November 2026).

Parts 1–9 come from the problem statement, reworded and split into checkable items.
Parts 10–13 are **our own analysis** and are not requirements.

## 1. At a glance

| | |
|---|---|
| Product | Full-stack web app to create, conduct, monitor and evaluate online exams, for institutions and competition organisers |
| Build time | 10 hours |
| Team | 1–3 people |
| Evaluation | 15-minute live demo plus judge questions and testing |
| Marks | 100 |
| Must have | All core requirements (§3), all 8 secondary features (§4), at least 1 innovation challenge (§5) |

**Problem being solved:** online exams struggle with academic integrity, fairness, network
reliability and large candidate numbers. Workflows must be reliable and accessible.

### Marking scheme

| Category | Marks | What is judged |
|---|---:|---|
| Core functionality | 30 | Completeness, correctness and integration of the exam workflow |
| Technical quality and reliability | 20 | Architecture, database design, security, validation, data integrity, failure handling |
| UI/UX and product design | 20 | Intuitive workflows, discoverability, visual hierarchy, accessibility, responsiveness, interaction quality |
| Secondary features | 15 | Working, useful and integrated (all eight) |
| Open innovation | 15 | Problem understanding, originality, practicality, effectiveness, implementation |

## 2. Roles

| Role | Responsibilities |
|---|---|
| Administrator | Users, roles, access permissions, overall platform operations |
| Examiner | Create and configure exams, manage questions and candidates, monitor attempts, grade, publish results |
| Candidate | Open assigned exams, answer and submit, view published results |

## 3. Core requirements (all expected; design and data model are our choice)

The whole workflow must work end to end, from candidate entry to result publication.

### 3.1 Authentication and authorization
- [ ] A1 Secure sign-in for administrators, examiners and candidates
- [ ] A2 A suitable experience for each role
- [ ] A3 Admins manage user accounts
- [ ] A4 Admins manage role assignments
- [ ] A5 Permissions enforced on the **backend**, not just by hiding UI
- [ ] A6 Examiners and candidates reach only the exams, records and actions they are authorized for

### 3.2 Examination management
- [ ] E1 Examiner creates and configures an exam: title, instructions, schedule, duration, total marks, other relevant settings
- [ ] E2 Lifecycle states: **draft → published → ongoing → completed**
- [ ] E3 Candidates cannot access an exam before it is available to them
- [ ] E4 Examiner can review exam details before publishing
- [ ] E5 Examiner has a proper interface to manage their exams

### 3.3 Question management
- [ ] Q1 Reusable question bank with categories or topics
- [ ] Q2 Difficulty levels
- [ ] Q3 Create and edit questions
- [ ] Q4 Assign questions to exams
- [ ] Q5 Single-answer MCQ
- [ ] Q6 Multiple-select
- [ ] Q7 Written response
- [ ] Q8 A suitable marking scheme for each type
- [ ] Q9 Randomize objective questions or answer choices where applicable
- [ ] Q10 An active attempt keeps its assigned questions and correct marking scheme

### 3.4 Candidate management
- [ ] C1 Examiner enrols candidates
- [ ] C2 Examiner views enrolment information
- [ ] C3 Candidate sees available, upcoming and completed exams
- [ ] C4 …with instructions and access status
- [ ] C5 Only eligible candidates can enter
- [ ] C6 The availability window is enforced

### 3.5 Examination interface
- [ ] I1 Accessible workspace showing questions, marks, remaining time and navigation
- [ ] I2 Clearly distinct states: answered, unanswered, marked for review
- [ ] I3 Answers save automatically during the attempt
- [ ] I4 Saved progress survives refresh or leaving and returning
- [ ] I5 Remaining time survives refresh or returning
- [ ] I6 Candidate can review progress, then submit
- [ ] I7 Time limit is enforced
- [ ] I8 At expiry the attempt is finalized using the answers accepted within the allowed time

### 3.6 Examination monitoring
- [ ] M1 Examiner sees active attempts
- [ ] M2 …their progress
- [ ] M3 …relevant events and incidents
- [ ] M4 Examiner monitors exam status
- [ ] M5 Examiner sends announcements to candidates during the exam
- [ ] M6 Incidents are recorded and shown for review
- [ ] M7 Monitoring indicators are **not** presented as proof of misconduct

### 3.7 Evaluation and grading
- [ ] G1 Objective answers auto-graded by the configured scheme, including multiple-select rules
- [ ] G2 Examiner reviews and manually grades written answers
- [ ] G3 Manual marks validated against the question's assigned marks
- [ ] G4 Totals calculated accurately
- [ ] G5 Grading state stays consistent
- [ ] G6 Examiner reviews results before publishing

### 3.8 Results and analytics
- [ ] R1 Controlled publication of results
- [ ] R2 Candidates see only their own published results (unless authorized otherwise)
- [ ] R3 Exam-level performance summary from real submission data
- [ ] R4 Candidate-level scores from real submission data
- [ ] R5 Completed attempts and results are retained for later review by authorized users

## 4. Secondary features (all 8 expected)

### 4.1 Network-aware interface
- [ ] S1a Detect connectivity problems and tell the user
- [ ] S1b Show answer save / sync status
- [ ] S1c Clear feedback when the connection is unstable or gone

### 4.2 PDF reports
- [ ] S2a Downloadable and readable
- [ ] S2b Built from real exam and candidate performance data
- [ ] S2c Access restricted appropriately

### 4.3 Examination sandbox
- [ ] S3a Examiner previews and takes the exam as a candidate would
- [ ] S3b Sandbox attempts never affect real submissions, results or statistics

### 4.4 Bulk import
- [ ] S4a Import **candidates** from a structured file (e.g. CSV or JSON)
- [ ] S4b Import **questions** the same way
- [ ] S4c Validate the data
- [ ] S4d Report import errors clearly

### 4.5 Question analytics
- [ ] S5 Per-question insight, e.g. often skipped, commonly wrong answers, observed difficulty

### 4.6 Verifiable reports
- [ ] S6a Verify that an issued result report is genuine (unique verification ID or QR code)
- [ ] S6b Verification exposes no unnecessary candidate information

### 4.7 Customizable workspace
- [ ] S7a Candidate customizes meaningful aspects, including layout or viewing preferences
- [ ] S7b Preferences are retained

### 4.8 Digital scratchpad
- [ ] S8 A dedicated rough-work space, usable inside the exam workflow (form is up to us)

## 5. Open innovation challenges (at least one)

| # | Challenge | Goal |
|---|---|---|
| 5.1 | Integrity in the AI era | Improve exam integrity against AI tools, outside resources and messaging, without needlessly harming privacy or usability |
| 5.2 | Fairness of randomized exams | Random papers can differ in difficulty; make them fairer while keeping real variation |
| 5.3 | Failure-resilient exams | Reduce harm from internet, device or power failures **without** giving extra time or unfair advantage |
| 5.4 | Trust and dispute resolution | Fair, transparent, accountable handling of disputes (grading errors, ambiguous questions, technical incidents) while protecting result integrity |
| 5.5 | Our own challenge | Another significant, original, practical problem; explain why it matters, who it affects and how we solve it |

Rules for the innovation:
- [ ] N1 Functional
- [ ] N2 Relevant to the application
- [ ] N3 Demonstrable
- [ ] N4 We can explain design decisions and trade-offs
- Several challenges are allowed, but quality and effectiveness count, not quantity.
- Our own approach and technologies are allowed.

## 6. Technical requirements and constraints

Must be a functional full-stack web app; any stack the competition rules permit.

### Security and privacy
- [ ] T1 Server-side authorization
- [ ] T2 Protect credentials, **answer keys**, personal information and exam records
- [ ] T3 No private data through public endpoints or reports

### Data integrity
- [ ] T4 Exam timing enforced independently of the candidate's device clock
- [ ] T5 No duplicate submissions
- [ ] T6 No inconsistent grading
- [ ] T7 Assigned questions and marking scheme preserved for active attempts

### Validation and reliability
- [ ] T8 Validate input on frontend **and** backend
- [ ] T9 Handle invalid data gracefully
- [ ] T10 Handle interrupted requests, refreshes and repeated actions gracefully
- [ ] T11 Show failures and saving status clearly

### Architecture and maintainability
- [ ] T12 Sensible database design
- [ ] T13 Clear separation of responsibilities, maintainable code
- [ ] T14 Ready to explain technology choices and how they meet requirements

### Freedom and fairness
- AI-assisted coding is allowed. AI features are optional.
- [ ] T15 No required feature depends on paid APIs, paid keys, proprietary data, special hardware
  or services that need billing details. Simulated or local alternatives are acceptable.

## 7. Submission requirements

- [ ] D1 Git repository with source code and version history
- [ ] D2 Deployed, working web application
- [ ] D3 README: setup instructions
- [ ] D4 README: test credentials for **each role**
- [ ] D5 README: required dependencies
- [ ] D6 README: description of the innovation challenge(s) implemented
- [ ] D7 Demo works with fictional or test data
- [ ] D8 Ready to present the **deployed** app in 15 minutes
- [ ] D9 Follow the official competition guide, including the deadline
- [ ] D10 **No commits, pushes, builds or deployments after the deadline. No timestamp manipulation.**

## 8. UI/UX expectations (20 marks)

- [ ] U1 Features integrated into one consistent, accessible interface
- [ ] U2 Clear navigation and information hierarchy
- [ ] U3 Responsive layouts
- [ ] U4 Intuitive workflows and discoverable features
- [ ] U5 Visual elements only where they help usability and clarity
- [ ] U6 Not generic, template-like or unrefined "AI-generated" looking (using AI itself costs nothing)

## 9. How judging works

- Incomplete requirements can earn partial marks; non-working placeholders get no full credit.
- No bonus for using AI, paid services or a particular technology.
- Judges may test common scenarios and ask us to explain design decisions.
- Innovation is judged on merit, not count, and **one implementation is not rewarded twice**.
- Detailed score sheets and test cases are private to the judges.

---

# Our analysis (not part of the problem statement)

## 10. Not stated in the document: confirm early

1. **Deadline and start time.** The statement defers to the "official competition guide", which we don't have.
2. **Starting from a template.** Check the guide allows pre-existing code. The repo history includes the template author's commits.
3. **Repo access.** `AhmedNasir7/Technoverse26SG` is private; judges need access or it must be made public.
4. **Hosting.** Done later, before the deadline; target not chosen. Testing uses Dockerized app and Postgres.
5. **Marking rules we must define:** multiple-select scoring (all-or-nothing, partial, penalty), negative marking.
6. **Exam rules we must define:** how total marks relate to question marks, late entry, attempts per candidate,
   whether candidates self-register or are only created or imported.

## 11. Likely judge tests (inferred from the requirements)

- Refresh or close the tab mid-exam, then return: answers and time intact
- Change the device clock: timer unaffected
- Go offline, answer, reconnect: status shown, answers handled predictably
- Double-click submit, or submit from two tabs: one submission only
- Save an answer after expiry through the API: rejected
- Open an exam before its window, or without enrolment: blocked by the server
- Candidate calls examiner or admin APIs, or changes an ID in the URL: refused
- Inspect network responses during an exam: no answer keys
- Edit a question while an attempt is active: that attempt is unaffected
- Examiner opens another examiner's exam: refused
- Enter marks above the maximum or negative: rejected
- Candidate views results before publication: hidden
- Import a broken CSV: clear row-level errors, no silent partial import
- Take a sandbox attempt: statistics unchanged

## 12. What the current template gives us

| Area | Template today | Action |
|---|---|---|
| Sign-in | JWT cookie, bcrypt, Google via Firebase | Reuse; remove the fallback JWT secret; lowercase emails at login |
| Roles | `admin`, `teacher`, `student`; `requireAdmin` / `requireStaff` | Map to Administrator / Examiner / Candidate; add ownership checks |
| Role bugs | Google sign-up and admin-created users get `user`, not a real role | Fix (A4) |
| User management | Admin can only add users; creation rolls back if the credentials email fails | Add edit and role change; don't depend on email (the `onboarding@resend.dev` test sender reaches only our own address) |
| Server protection | `/admin` server pages, room-code APIs and narration need no sign-in; any signed-in user can email anyone | Fix or delete: directly affects T1–T3 |
| Audit log, notifications | Present | Reuse for incidents, announcements, disputes |
| Charts | Recharts | Reuse for analytics |
| Real-time | Pusher | Confirm no billing needed; keep a polling fallback |
| Docker, CI | Local Docker works; deploy workflow fails on every push (no secrets) | Fix or disable before the deadline |
| Not relevant | Properties, Stripe, video meetings, calendar, ElevenLabs, landing placeholders | Remove |
| Design | Real-estate template look | Redesign (U6) |
| README | `create-next-app` boilerplate | Rewrite (D3–D6) |
| Missing entirely | Exams, question bank, enrolment, attempts, grading, results, PDF, import, sandbox, scratchpad | Build |

## 13. Suggested approach

**Innovation:** 5.2 (fair randomized papers). Build balanced paper generation from the question bank
(fixed mix per topic and difficulty) and show the examiner a fairness comparison between papers.
It is self-contained, easy to demonstrate and distinct from the core and secondary items.
5.3 overlaps with autosave (I3–I5) and network awareness (4.1); the same contribution isn't rewarded
twice, so it would have to go well beyond them.

**10-hour order** (shift to the official clock):

| Hour | Work |
|---|---|
| 0–1 | Data model, strip the template, roles and server authorization, on local Docker |
| 1–2.5 | Question bank, exam management, enrolment |
| 2.5–4.5 | Attempt engine: server timer, autosave, resume, submit, expiry |
| 4.5–5.5 | Grading, review, publication, results |
| 5.5–6.25 | Monitoring and announcements |
| 6.25–8 | Eight secondary features |
| 8–9 | Innovation |
| 9–10 | Test list in §11 on Docker, seed data, README, **host and recheck**, stop pushing before the deadline |

UI quality is part of every block, not a last-hour job.

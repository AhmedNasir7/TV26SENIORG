# Claude context saver

The handover file for any new Claude session or account. Read it fully before doing anything.
**Keep it current** (rules in the last section). No secrets belong here.

_Last updated: 2026-11-27 (later session)_

## 1. Right now

### Update (2026-11-27, later session) - UNCOMMITTED on branch `live-exams-wip`
Written, tsc/eslint clean, unit tests 14/14, access check 296/296 (local, port 3000): per-exam chat
(`/api/exams/[id]/chat`, pages under candidate and examiner exam routes; global `/chat` and its API removed;
candidates locked out while sitting), nav links for Community/Meetings removed (help call announces `/meeting`),
Back during a running exam asks, then cancels (`SubmitReason.LEFT`, `/api/attempts/[id]/leave`), reminders
(`REMINDER_MINUTES`, `CRON_INTERVAL_MINUTES`, candidate-chosen time in `Enrollment.reminderMinutes`, examiner
"Send reminders now"), credential emails (admin-created users, bulk import) and enrolment email, integrity ranking
(`lib/integrity.ts`, `/api/exams/[id]/integrity`, one batched AI explanation), AI instruction drafting and question
check, new sign-in card with parallax, profile page redesign. Migration `8_exam_chat_reminders` (applied locally only).
Browser-checked: sign-in page, profile, chat send. Real 100ms: room created and examiner token issued for exam 3.
NOT tested: candidate join with camera, recording, presence check, real email delivery, AI (no Groq key locally),
leave prompt in a browser. Still to do: README, docs/TASKS ticks, PERMISSIONS.md, HMS env names in example files,
commit, merge to main, push (deploys). Port 3000 had a stale dev server once: kill it, delete `.next`.

### Handover (2026-11-27, session ended on a usage limit)

**On `main` (pushed, commit fd275c7, deploy run 45998693789 was still running: CHECK with `gh run list`,
then curl https://seniorgrade.site/api/health, /, /login, a PDF route):** bulk import, question insights, signed
PDF reports and verification (`/verify` lets anyone check a report's code or QR is genuine), fair papers, disputes,
popups, scratchpad + calculator, AI (attempt review, suggested mark, question drafts; Groq), voice, reminder emails
+ systemd timer (`deploy/cron.sh`, every 5 min, 24 h and 1 h), calendar links/.ics, 100ms help call, origin check
and headers, name Invigil, landing page, new sign-in pages, admin-only sign-up with `ADMIN_SIGNUP_CODE`, usernames,
dark default, collapsible side panel, themed dropdowns (`public/select.css`), display settings hidden from
candidates (user asked; this was secondary feature PREF, tell the user it costs that item).
Checks before that push: tsc, eslint (2 old warnings), unit tests 11/11, access check 279/280 (the one failure
was leftover test data, since archived).

**In progress on branch `live-exams-wip` (NOT merged, NOT tested): 100ms live camera examinations.**
Written: migration `7_live_proctoring` (already applied to the local DB), `lib/server/hms-api.ts`,
`lib/services/live-exam.ts`, routes `api/exams/[id]/live(/token,/recording)` and `api/me/exams/[id]/live`,
`components/live/{LiveRoom,CameraGate,LivePanel}.tsx`, candidate exam layout + camera gate, presence check and
auto-recording in `attempts.openAttempt`, recorded-notice text, panel on the monitor page.
Left: run tsc/eslint again; test join with a fake camera (Chrome `--use-fake-device-for-media-stream`); check the
template's role names (`HMS_STAFF_ROLE`, `HMS_CANDIDATE_ROLE` override; the candidate role should not see other
candidates), recording start without `meeting_url` (`HMS_RECORDING_URL` if refused); the active-room peers
endpoint used for the presence check is unverified; add those env names to the example files, PERMISSIONS.md and
the access check; then merge to main and push (deploys).

**Still to build (user's last requests):**
1. Calendar: candidate picks reminder time (event/.ics with alarms), visible on exam page and cards.
2. Reminder timer: make interval short/configurable for testing (e.g. every minute, `REMINDER_MINUTES=1440,60,10`),
   plus an examiner "send reminders now" button. Emails need real addresses and the verified Resend domain.
3. AI integrity score: deterministic score from every candidate's logged events + similarity, ranked per exam,
   one batched AI explanation on button press (cached).
4. AI help while writing exams/questions (instructions writer, question checker, editable drafts, count and focus).
5. Tell the user which AI features exist and how to test them.
6. README (required for submission), tick `docs/TASKS.md` + `scripts/task-progress.py`, `docs/PERMISSIONS.md`.

**User must do:** server Groq key: `ssh` in, `cd ~/secureexam && bash set-groq.sh` (local: `bash scripts/set-groq.sh`).
Server setup code for admin sign-up: `grep ADMIN_SIGNUP_CODE ~/secureexam/.env`. Add seniorgrade.site to Firebase
authorized domains; register `/api/calendar/callback` in Google Cloud; turn off HTTP/3 in Cloudflare.
Claude does not write secret keys into `.env` files.

**Tools:** local app = preview `app-local`; if styles look stale, stop it, delete `.next`, restart. Screenshots:
`node scripts/landing-shots.mjs`. Do not push after the competition deadline.

- **RULE: never remove services (Calendar, ElevenLabs, Supabase, Pusher, 100ms, Stripe, email, moderation,
  chat, support...). Only template content may go. ASK before removing anything.**
- **RULE: no Claude co-author line in commits or pull requests.**
- **Phase:** building. **Steps 1–11 done: all core features and 5 of 8 secondary features.** Everything through step 9 was **pushed** to `origin/main` on
  2026-11-27 at the user's request. Later commits stay local until the user asks again.
- **Live since 2026-11-27: https://seniorgrade.site** (Cloudflare, nginx and Certbot on EC2 `32.194.175.137`,
  user `ec2-user`, key outside the repo). CI/CD on push to `main`: build and test, images to Docker Hub
  (`<user>/secureexam`), `deploy/deploy.sh` on the server. First full run passed and was verified through the
  domain. Settings live only in the server's `~/secureexam/.env`. Guide: `docs/DEPLOY.md`.
  **Every push to `main` deploys to production.** Push nothing after the competition deadline.
- Production has one administrator (from the server `.env`) and **no demo data yet**. `TURNSTILE_SECRET_KEY` is
  empty there, so the bot check is off.
- Local C: drive filled during image builds. npm/pnpm caches cleared, page file moved to P: (needs restart);
  Docker's disk is still on C:.
- **Next build step:** 12 = IMP-1, IMP-2, QAN-1. The user said "for now it is enough" about added complexity:
  **no new features unless asked**; keep the flow easy to follow.
- **Navigation rules (user, 2026-11-27):** nothing removed, buttons clearly visible, breadcrumbs on nested pages,
  every exam page shows the numbered step bar and next step (`lib/exam-flow.ts`, `components/exams/ExamNav.tsx`).
- **Progress view:** top of `docs/TASKS.md`. After each step: tick subtasks, raise `FINISHED_STEP` in
  `scripts/task-progress.py`, run it. The user relies on this to follow the work.
- **Waiting for the user:** whether to bring back non-service items removed in step 1: admin analytics,
  settings and reports pages, profile Settings tab, meeting-request booking, admin notification bell variant
  and API, admin activity API, "Forgot password" link, terms checkbox, default `public/*.svg` icons.
- **Functionality only for now** (user, 2026-11-27): how it looks and is polished comes later.
- **How to build:** one step per user prompt, following `docs/TASKS.md`. Report, then wait.
- **Priorities:** functionality with a good baseline interface; security and innovation; light testing.
- **Docker checks:** bulk checks at intermediate points, not after every step.
- **Packages approved:** `zod` (installed), `pdfkit` and `qrcode` later. Ask before adding anything else.
- **Step order** (reordered 2026-11-27 at the user's request: core first, then straightforward ones; ticks
  unchanged): 1–11 done · 12 IMP, QAN ·
  13 PDF, VER · 14 FAIR (innovation) · 15 SEC, REL pass · 16 TST, SHIP
- **UI/UX (20 marks): design pass applied 2026-11-27** at teammate Slothdemon22's request, **pushed to `origin/main`
  the same day**: Attio design system + Linear highlighter colours, class-based light/dark with an animated toggle on
  every page. Rules are in `GUIDELINES.md` → Styling. Not a numbered step; later screens should follow it.
- **Decided:** testing on Dockerized app and Postgres; hosting later, before the deadline; public sign-up closed.
- **Still unanswered:** deadline, team size, template rule, explicit confirmation of innovation 5.2.

## 2. The competition

- Technoverse 5.0 **Web-e-Thon**, COMSATS University Lahore, **27–28 November 2026**
- Build a **Secure Examination Management System**; 10 hours; 1–3 people; 15-minute live demo; 100 marks
- Marks: core 30 · technical 20 · UI/UX 20 · secondary 15 · innovation 15
- **No commits, pushes, builds or deployments after the deadline.** Deadline is in a guide we don't have.
- Source PDF (outside the repo): `C:\Users\ashbl\Downloads\Web-e-Thon Problem Statement.pdf`

## 3. Documents

| File | Content |
|---|---|
| `docs/REQUIREMENTS.md` | 106 checklist items from the statement, plus our analysis |
| `docs/TASKS.md` | Tasks and subtasks with progress ticks; all requirements mapped |
| `docs/PERMISSIONS.md` | Who may call each route and open each page; record rules; known gaps |
| `CREDENTIALS.md` | All logins by user type, for the local Docker database |
| `docs/TEST-ACCOUNTS.md` | Demo accounts for the local Docker database only |
| `GUIDELINES.md` | House rules (file size, API shape, styling, TypeScript, env) |
| `W:\WebHackathon\Tecnoverse26\DESIGN-PIPELINE.md` | Design playbook for the later design pass |

## 4. Repository

- Local: `W:\WebHackathon\Tecnoverse26\tecnoverse-competition-dev\template`
- `origin`: https://github.com/AhmedNasir7/TV26SENIORG (**private**), branch `main`
- The user deleted the old local `.git` on 2026-11-27 and gave this new repo. The older repo
  `AhmedNasir7/Technoverse26SG` still holds the earlier history (template and our first two commits).
- Commit per finished step (version history is a submission requirement). **No Claude co-author.**
  Push when the user asks.

## 5. Environment and commands

**Run locally (user's choice, 2026-11-27): app on Windows, only the database in Docker.**
`pnpm dev:local` or `node scripts/dev-local.mjs` (preview name `app-local` in the workspace
`.claude/launch.json`). It starts the `postgres` container, overrides the `.env` database address with the local
one and turns on the demo buttons. Edits show at once; no container rebuild. The `app` container stays stopped.
The container-based notes below apply only if that container is used.

- Windows 11, PowerShell and Git Bash, Node 25, Docker Desktop
- Install: `npx -y pnpm@10.32.1 install --ignore-scripts` (global pnpm 12 can't load the pinned version; the
  `postinstall` browserslist step always fails, still in package.json: ask before removing)
- Prisma client: `npx prisma generate` (output `src/generated/prisma`)
- Checks: `npx tsc --noEmit` · `npx eslint .` · `DATABASE_URL=postgresql://x:x@localhost:5432/x npx next build`
  (pass after step 2; one known lint warning in chat page). Standalone output is skipped on Windows.
- Start: `docker compose -f docker-compose.dev.yml up -d --build` → http://localhost:3000
- **First start:** `docker compose -f docker-compose.dev.yml exec -T app pnpm run db:migrate`, then
  `... exec -T app pnpm run seed:admin` (and `seed:roles`)
- Stop: `... down` (`-v` also wipes the local database) · after `.env` change: `... up -d --force-recreate app` ·
  after dependency change: `... up -d --build -V`
- Containers `secureexam-app-dev`, `secureexam-db-dev`; database `secureexam`
- **State:** containers running; migration applied; demo accounts seeded (see `docs/TEST-ACCOUNTS.md`)
- Sign-in page has Admin / Examiner / Candidate fill buttons when `SHOW_DEMO_LOGINS=true` (set only in
  `docker-compose.dev.yml`). Never enable it with real data.
- Access check: `python scripts/access-check.py` (280/280 passed after step 11; it creates and removes its own attempt test data)
- Unit tests: `node --test "tests/*.test.mjs"` (grading, totals, statistics, monitoring settings)
- The built-in browser pane once stalled on large dev scripts; it worked in step 9. Use Playwright if it stalls.
- In Git Bash, very long commands fail on Windows: write large files with the Write tool or in small pieces
- The built-in browser pane never marks a page hidden or fires focus changes, so test those indicators by
  dispatching the events, or by hand in a normal browser
- New migration for schema changes (never wipe data without asking): `prisma/migrations/<n>_name`,
  then `... exec -T app pnpm run db:migrate`
- **The Docker app doesn't see file changes from Windows.** After editing code:
  `docker compose -f docker-compose.dev.yml restart app`
- The dev container clears `.next` on every start: reusing it made nested API routes answer 404 after a
  restart. The first request to each page is therefore slow again after a restart.
- Demo data: `pnpm run seed:demo` in the app container with `DEMO_PASSWORD` (see `docs/TEST-ACCOUNTS.md`):
  37 users, 64 questions, 4 exams (completed, open, upcoming, draft), 25 graded attempts

## 6. Services and configuration

- `.env` exists, gitignored, filled in by the user. **The user asked Claude not to read it.**
  `.env.example` lists every variable. Server start fails without `DATABASE_URL` and `JWT_SECRET`.
- All services are optional and return "not configured" without keys: Resend, Supabase, Pusher, 100ms,
  ElevenLabs, Google Calendar, Stripe, moderation
- Both compose files default to the local Postgres (`APP_DATABASE_URL` overrides in production compose)
- The `.env` database is a separate remote one with old template data. Don't touch it without asking.
- Firebase project `technoverse26sg`, hard-coded in `src/lib/firebase/client.ts` and
  `src/app/api/auth/google/route.ts` (the user's choice)
- GitHub CLI signed in as `AhmedNasir7`
- Deploy workflow kept by the user's choice: **fails on every push** (being replaced by the CI/CD work)
- Cloudflare Turnstile: widget created by the team. Needs `TURNSTILE_SECRET_KEY` (never commit it; it was
  shared over chat, so rotate it before the event) and the domain listed on the widget. Off while empty.
  With a real secret the access check can't sign in; use Cloudflare's published test secret for it.
- **Second machine (teammate Slothdemon22, Kali Linux), 2026-11-27:** clone at
  `/home/bacillus/University/FYP-Cerberus-Vanguard/TV26SENIORG`, own `.env` (gitignored). Port 3000 there
  is taken by another project, so the app runs natively with `next dev -p 3300` against only the compose
  `postgres` service (`docker compose -f docker-compose.dev.yml up -d postgres`), with `DATABASE_URL`
  overridden to `localhost:5432/secureexam`. Migrated and seeded (admin, roles, demo); access check
  223/223, unit tests 4/4, `tsc` clean. Keys checked read-only against each provider: Supabase (bucket
  exists), Resend (domain `seniorgrade.site` verified), Stripe test, ElevenLabs (free tier), Pusher, 100ms
  (key + secret + template) and Google OAuth client are valid; `GEMINI_API_KEY` and `API_KEY` (Groq) are
  rejected but unused by the code. The remote `.env` database (Neon) still holds the old real-estate schema
  with no Prisma migrations: untouched. `RESEND_FROM_EMAIL` must be `@seniorgrade.site` (not `.site.com`).
- Hosting target prepared: AWS EC2 (Amazon Linux 2023) behind `https://seniorgrade.site` with Docker,
  Compose, nginx and a Let's Encrypt certificate (auto-renew). Nothing deployed yet.

## 7. History

1. Cloned the template, installed it, read it; fixed Firebase ID, home redirect, dark mode, narration;
   created the private repo; ran it in Docker
2. Problem statement → requirements → task decomposition → context saver
3. **Step 1:** removed real-estate content; renamed app to `SecureExam` (working name, `src/lib/config.ts`);
   renamed compose resources; wiped Docker. It also removed services; the user objected.
4. **Step 2:** restored all services and made them safe: sign-in required for room APIs and chat; room
   creation staff only; email sending admin only; calendar no longer property-based, verifies OAuth state;
   narration is now `/api/speech` + `components/audio/ListenButton.tsx` (generic, not yet placed on a page);
   Pusher sends content-free pings (chat reloads via API; payload insertion replaced); Supabase, Stripe,
   Resend load lazily; avatar capped at 2 MB; Stripe redirects use the configured address; support email
   HTML escaped; new accounts work without email (temporary password shown once).
   Database redesigned (roles `ADMIN`/`EXAMINER`/`CANDIDATE`, `passwordHash`, full exam model, migration
   with CHECK constraints). Added `lib/server/{api,env,time,email}.ts`, `.env.example`, startup env check.

5. **Step 3:** sessions re-read from the database each request (role, status, `sessionVersion`), 12 h
   expiry, no fallback secret, lockout after 5 failures, change/forced password, Google only for existing
   accounts, sign-up closed (`ALLOW_PUBLIC_SIGNUP`), server-side page guards, policy layer, role home pages.
   Verified in Docker: `python scripts/access-check.py` passed 59/59 on 2026-11-27.
6. New repo: old `.git` removed by the user; project pushed to TV26SENIORG.

7. **Step 4:** admin user management (search, filters, paging, create, edit, disable, role change, unlock,
   password reset; no self-demotion or self-reset; last-admin guard; audited in the same transaction), platform
   overview, validated audit-log API, `lib/grading.ts` (objective marking), demo seed (`scripts/seed-demo.ts`).

8. Added `CREDENTIALS.md` (logins per user type, local only).
9. **Step 5:** question bank (topics, versioned questions, three types with marking rules, search, filters,
   paging, duplicate, archive, version history, usage count), draft exam question selection with ordering and
   marks, basic screens under `/examiner`. Migration `1_question_bank` (`currentText`, `maxLength`).

10. **Step 6:** examination create, review, publish checklist, unpublish, duplicate, draft delete, state-based
    editing; enrolment with candidate search, removal and audited extra time; candidate dashboard sections,
    server-synced countdown and instructions page; `reset:demo` script (never run).

11. **Step 7:** attempt engine. Start freezes the paper (seeded shuffle, versions, marks) and is safe against
    parallel requests; server deadline with 5 s grace; save with revisions; takeover by a new session;
    submit and lazy expiry finalization with objective auto-grading and a receipt hash; candidate-safe paper
    with opaque option keys `c1..`; optional `POST /api/cron/finalize` (`CRON_SECRET`).
12. **Step 8:** exam screen (inputs per type, question grid with symbols, mark for review, shortcuts, autosave
    queue with offline retry and local copy, resume, takeover turns the old window read only, review and
    submit). No-back exams are enforced on the server (one question sent at a time,
    `POST /api/attempts/{id}/progress`; migration `2_attempt_progress`). Per-account save rate limit.
    Checked once in Playwright Chromium: autosave, offline retry, reload, submit, narrow-screen width.
13. **Step 9:** marking queue for written answers (by question or candidate, version check, 0 to maximum,
    audited), totals re-derived in one place (`services/scoring.ts`), results page (summary, distribution,
    topics, candidates, history), publication checks and withdrawal with a reason, candidate result page,
    staff paper view. Migration `3_grading` (`Answer.gradeVersion`). Tried once in the browser pane:
    mark, publish, candidate view.

14. **Design pass (2026-11-27, Linux clone, pushed):** `globals.css` rebuilt on the Attio system (Inter/Inter
    Display, Newsreader, JetBrains Mono; Attio neutrals, strokes, shadows, buttons, eyebrow pills) with Linear
    highlighters (lime `#e4f222`, sky → lavender gradient) via `.highlight-card`, `.glow-card`, `.badge-highlight`,
    `.mark-highlight`, lime active-nav marker and dark-mode lime primary buttons. Token names unchanged, so every
    page re-themed itself. Dark mode is now a `.dark` class (no-flash script in `app/layout.tsx`,
    `lib/theme.ts`, `hooks/useTheme.ts`, `components/theme/ThemeToggle.tsx`): circular View Transition reveal
    from the toggle with a lime ring, cross-fade fallback, instant with reduced motion; stored in localStorage,
    OS setting until chosen. Component CSS moved into `@layer components` (base rules into `@layer base`), which
    also fixed utilities like `hidden md:inline-flex` being overridden (mobile header overflow). New sign-in
    layout with highlighter showcase. Verified with Playwright: 62 page loads (every route, both themes, all
    roles, live exam screen) with 0 contrast failures, no overflow at 1440 and 390 px, toggle behaviour tests;
    access check 223/223, unit tests, `tsc` and ESLint (0 errors) pass.

15. **UI/UX pass across every page (2026-11-27, pushed, no behaviour changes):** shared `StatusPill`,
    `Checklist`, `EmptyState`, upgraded `PageHeader`; sidebar icons and user card; Ctrl/⌘+K command menu in
    both shells; header links with icons and current-page state; exam list with status column and segmented
    filter with counts; exam settings as a facts grid; icon publication checklists; gradient score bars, data
    tables and pass/fail chips on results; answer papers with styled option rows (correctness only shown when
    the server sends it, i.e. staff); candidate home summary tiles, status pill and highlighted start card;
    exam timer turns amber under 5 min and red under 1 min (display only); answered/flagged grid states;
    tokens re-scoped inside highlighter cards so text stays readable in dark mode; Stripe labels sentence case.
    Playwright: 62 page loads, 0 contrast failures, command menu and toggle tests; access check 223/223.
    Dev note: on the Linux box the dev server's file watcher can miss edits when several dev servers run
    (inotify limit 65536); restart `next dev` with `.next` cleared if a change doesn't show.

16. **Step 10:** monitoring. Per-exam settings (`lib/monitoring.ts`, `Exam.monitoring`, migration `4_monitoring`):
    eight indicators on/off plus minimum away time, disconnect threshold and highlight limit; recording choices
    lock once someone starts; candidates see the list before and during the exam. Events from the screen
    (`useMonitoring`) and server (contact gaps, takeover, late save), grouped with durations. Board at
    `/examiner/exams/{id}/monitor` (5 s polling), timeline with review notes, announcements delivered by the
    15 s clock check. Defaults: disconnected after 75 s, highlight after 3.

17. **Step 11:** connection state and notices, submit blocked offline; sandbox trials
    (`/examiner/exams/{id}/sandbox`, excluded everywhere); scratchpad (notes and drawing, private);
    display preferences saved per account. Then navigation: breadcrumbs, exam step bar and next step, candidate
    progress steps, sticky action bars, visible button edges, dev badge off. Turnstile on sign-in, sign-up,
    password, support and email forms (`lib/server/turnstile.ts`).

Earlier, separate work in the parent folder (not the competition): the `obol` site, `DESIGN-PIPELINE.md`
and the skills `design-pipeline`, `scroll-video-hero`, `kinetic-details`. The user said to forget Obol.

## 8. Known template problems

- No per-address rate limiting yet (sign-in lockout and answer saving are limited per account) (SEC)
- Video room codes are issued with the host role to any signed-in user (SEC)
- Google refresh tokens are stored unencrypted (SEC)
- Several older routes still use the `{ error: string }` shape; move to `lib/server/api.ts` when rewritten
- README is boilerplate (SHIP-3)

## 9. How the user likes to work

- Short, direct messages; expects Claude to do the work and verify it in the browser
- Ask before downloading, spending credits or creating accounts
- **Ask before removing anything**
- Don't commit or push unless asked
- When updating shared documents like the design pipeline, add to them without changing existing content
- "Discuss first" before large builds
- Treat missing requirements as unacceptable: check coverage and say what wasn't verified

## 10. Update rules (for Claude)

Update this file in the same turn whenever any of these happen:
a decision is made or reverted · a milestone or task is finished · a commit, push or deploy ·
an environment, service or command change · a new problem or fix · a new user preference.

- Refresh "Right now" and the date; tick finished items in `docs/TASKS.md`
- Add facts, remove stale ones; never write passwords, keys, tokens or `.env` values
- Before ending a long session, re-read "Right now" and make sure a stranger could continue from it

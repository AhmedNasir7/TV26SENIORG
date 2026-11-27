# Claude context saver

The handover file for any new Claude session or account. Read it fully before doing anything.
**Keep it current** (rules in the last section). No secrets belong here.

_Last updated: 2026-11-27_

## 1. Right now

- **RULE: never remove services (Calendar, ElevenLabs, Supabase, Pusher, 100ms, Stripe, email, moderation,
  chat, support...). Only template content may go. ASK before removing anything.**
- **RULE: no Claude co-author line in commits or pull requests.**
- **Phase:** building. **Steps 1–9 done.** Commits since step 3 are local, **not pushed**.
- **Next:** step 10 = MON-1..4 (live attempt board, events and incidents, fair wording, announcements). It
  completes the core requirements. Incidents are already recorded for takeover and late saves. Wait for the user.
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
  unchanged): 1–9 done · 10 MON (core) · 11 NET, SBX, PAD, PREF · 12 IMP, QAN ·
  13 PDF, VER · 14 FAIR (innovation) · 15 SEC, REL pass · 16 TST, SHIP
- UI/UX (20 marks) is not a numbered step yet: the user deferred the design pass; raise it again.
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
- Access check: `python scripts/access-check.py` (223/223 passed after step 9; it creates and removes its own attempt test data)
- Unit tests: `node --test tests/` (grading, totals, statistics)
- The built-in browser pane once stalled on large dev scripts; it worked in step 9. Use Playwright if it stalls.
- In Git Bash, very long commands fail on Windows: write large files with the Write tool or in small pieces
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
- Deploy workflow kept by the user's choice: **fails on every push**

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

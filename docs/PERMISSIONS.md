# Permissions

Every check runs on the server. Sessions are re-read from the database on each request, so a disabled
account, a role change or a password change takes effect immediately. An account with a temporary
password can reach only `/change-password`, "who am I", password change and sign-out.

Y = allowed · own = only the caller's own records · — = refused

## API routes

| Route | Anonymous | Candidate | Examiner | Admin |
|---|:-:|:-:|:-:|:-:|
| `GET /api/health` | Y | Y | Y | Y |
| `POST /api/auth/login`, `google`, `logout` | Y | Y | Y | Y |
| `POST /api/auth/signup` (closed unless `ALLOW_PUBLIC_SIGNUP=true`) | closed | closed | closed | closed |
| `GET /api/auth/me`, `POST /api/auth/password` | — | own | own | own |
| `PATCH /api/auth/me` (name only) | — | own | own | own |
| `GET/PATCH /api/notifications` | — | own | own | own |
| `POST /api/profile/avatar` | — | own | own | own |
| `GET/POST /api/chat/messages` | — | Y | Y | Y |
| `GET/POST /api/support`, `POST /api/support/transcribe` | — | own | own | own |
| `GET/POST /api/admin/support` | — | — | Y | Y |
| `GET/POST /api/admin/users` | — | — | — | Y |
| `PATCH /api/admin/users/{id}`, `POST .../reset-password` | — | — | — | Y (not own role, status or reset) |
| `GET /api/admin/audit-logs` | — | — | — | Y |
| `GET/POST /api/topics`, `PATCH /api/topics/{id}` | — | — | own | Y |
| `GET/POST /api/questions`, `GET/PATCH /api/questions/{id}`, `.../duplicate`, `.../archive` | — | — | own | Y |
| `GET/PUT /api/exams/{id}/questions` (change drafts only) | — | — | own | Y |
| `GET/POST /api/exams`, `GET/PATCH/DELETE /api/exams/{id}` | — | — | own | Y |
| `POST /api/exams/{id}/publish`, `.../duplicate` | — | — | own | Y |
| `GET /api/exams/{id}/candidates`, `GET/POST .../enrollments`, `PATCH/DELETE .../enrollments/{eid}` | — | — | own | Y |
| `GET /api/me/exams`, `GET /api/me/exams/{id}` (no questions) | — | own | — | — |
| `POST /api/me/exams/{id}/attempt` (start or resume) | — | own | — | — |
| `GET /api/attempts/{id}`, `.../clock`, `PUT .../answers/{qid}`, `POST .../progress`, `POST .../submit` | — | own | — | — |
| `POST /api/cron/finalize` (needs `CRON_SECRET`, no session) | secret | secret | secret | secret |
| `POST /api/email/send` | — | — | — | Y |
| `POST /api/check-room`, `generate-code` | — | Y | Y | Y |
| `POST /api/get-or-create-room` | — | — | Y | Y |
| `POST /api/speech` | — | Y | Y | Y |
| `POST /api/stripe/create-checkout` | — | Y | Y | Y |
| `GET /api/calendar/auth`, `callback` | sign-in | own | own | own |

## Pages

| Page | Anonymous | Candidate | Examiner | Admin |
|---|:-:|:-:|:-:|:-:|
| `/login` | Y | Y | Y | Y |
| `/signup` (redirects while closed) | — | — | — | — |
| `/profile`, `/chat`, `/support`, `/meeting`, `/stripe` | — | Y | Y | Y |
| `/candidate`, `/candidate/exams/{id}` (enrolled, published) | — | own | — | — |
| `/examiner`, `/examiner/questions`, `/examiner/exams/...`, `/admin/support` | — | — | Y | Y |
| `/admin`, `/admin/users`, `/admin/audit-logs`, `/send-email` | — | — | — | Y |

## Record rules (`src/lib/policies`)

Examination features must pass these. Missing and forbidden records both answer 404.

| Rule | Who |
|---|---|
| Manage an exam or question, grade | Owning examiner, admin |
| View an attempt | Owner staff, or the candidate (never their view of sandbox attempts) |
| View a result | Owner staff; the candidate only after publication |
| Take an exam | Enrolled candidate (window and state checked by the exam services) |

## Known gaps (planned in the security pass)

- No per-address rate limiting yet; sign-in has per-account lockout, and answer saving is limited per
  account (180 a minute, held in memory on one server)
- Video room codes are issued with the host role to any signed-in user
- Google refresh tokens are stored unencrypted

# Local test accounts

Demo accounts in the **local Docker database only**. Do not reuse these passwords anywhere;
create new ones for any hosted deployment.

| Role | Email | Password |
|---|---|---|
| Administrator | `admin.demo@secureexam.test` | `Demo-chqRodTGUQGO` |
| Examiner | `examiner.demo@secureexam.test` | `Demo-4JHnGboxMAq-` |
| Candidate | `candidate.demo@secureexam.test` | `Demo-mrEY8GNJI506` |

## Seeded demo data (`pnpm run seed:demo`)

Shared password for seeded accounts: `Seed-Mk0LR5T2Titb`

| Role | Email |
|---|---|
| Examiner | `examiner2.demo@secureexam.test` |
| Candidates (30) | `candidate01@secureexam.test` … `candidate30@secureexam.test` |

The three accounts in the first table keep their own passwords. `examiner.demo` owns the demo
examinations; `candidate.demo` is enrolled in all published ones.

Run again at any time to move unattempted exam windows to the present:

```powershell
docker compose -f docker-compose.dev.yml exec -e DEMO_PASSWORD="<shared password>" app pnpm run seed:demo
```

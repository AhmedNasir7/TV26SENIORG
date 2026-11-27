# Deployment

Every push to `main` (and a manual run from the Actions tab) does this:

1. Checks that the repository secrets exist and runs the unit tests.
2. Builds the app image and a small migration image, and pushes both to Docker Hub as
   `<your Docker Hub name>/secureexam` (`latest`, the commit hash, and `tools`).
3. Copies the compose file and `deploy.sh` to `~/secureexam` on the server and runs the script there: removes
   leftover containers of the earlier template, pulls the images, applies database migrations, creates the first
   administrator if none exists, runs the containers with Docker Compose, sets up nginx and checks health.

**Settings live only on the server**, in `~/secureexam/.env`. Docker Compose reads that file when it starts the
containers. The pipeline never copies or reads it into GitHub. The database is a Docker volume on the server and
is never removed by a deployment.

## 1. Create the settings file on the server (once)

Start from [`deploy/env.production.example`](../deploy/env.production.example), fill a copy outside the
repository, and copy it to the server:

```powershell
ssh -i "$HOME\Downloads\comsats.pem" ec2-user@32.194.175.137 "mkdir -p ~/secureexam"
```

```powershell
scp -i "$HOME\Downloads\comsats.pem" .\prod.env ec2-user@32.194.175.137:secureexam/.env
```

Required: `JWT_SECRET`, `POSTGRES_PASSWORD`, `NEXT_PUBLIC_APP_URL`. Add `ADMIN_EMAIL` and `ADMIN_PASSWORD` to
get the first administrator.

## 2. Docker Hub

Create a repository named `secureexam` and set it to **Private** before the first run (the migration image
contains source files). Create an access token with **Read & Write** access.

## 3. Repository secrets

GitHub, repository, Settings, Secrets and variables, Actions.

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | your Docker Hub user name, lowercase |
| `DOCKERHUB_TOKEN` | the access token (not your password) |
| `DEPLOY_HOST` | `32.194.175.137` |
| `DEPLOY_USER` | `ec2-user` |
| `DEPLOY_SSH_KEY` | the whole content of `comsats.pem`, including the BEGIN and END lines |
| `DEPLOY_KNOWN_HOSTS` | `32.194.175.137 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBJOjAY49PyDQUh/6mlVqLub53gRY5kcqXpbNjROz56L` |

```powershell
Get-Content "$HOME\Downloads\comsats.pem" -Raw | gh secret set DEPLOY_SSH_KEY --repo AhmedNasir7/TV26SENIORG
```

No application setting is stored in GitHub. The two public Pusher values the browser needs are read from the
server's `.env` while the image is built.

Then run the workflow: Actions, "Build, Push, and Deploy", Run workflow. Or push to `main`.

## 4. Outside GitHub

- **Cloudflare Turnstile:** the widget's domain list must include `seniorgrade.site`.
- **Firebase (Google sign-in):** add `seniorgrade.site` to Authentication, Settings, Authorized domains.
- **Google Calendar (if used):** the OAuth client's redirect URI must use `https://seniorgrade.site`.
- **Cloudflare SSL mode:** "Full (strict)" matches the certificate on the server.

## On the server

```bash
cd ~/secureexam
export IMAGE=<name>/secureexam
docker compose ps
docker compose logs --tail 100 app
docker compose up -d          # restart with the current .env
```

Demo data for judging (fictional accounts; choose a password of 8 or more characters):

```bash
docker compose run --rm -e ALLOW_DEMO_SEED=true -e DEMO_PASSWORD='choose-one' tools npx tsx scripts/seed-demo.ts
```

Roll back by running the workflow again from an earlier commit.

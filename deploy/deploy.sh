#!/usr/bin/env bash
# Runs on the server, from the deployment folder. Safe to run again.
#   IMAGE=user/secureexam TAG=<commit> bash deploy.sh
# Needs docker-compose.yml, nginx-secureexam.conf and the server's own .env beside it.
set -euo pipefail
cd "$(dirname "$0")"
: "${IMAGE:?set IMAGE}"
export IMAGE TAG="${TAG:-latest}" TOOLS_TAG="${TOOLS_TAG:-tools}"
COMPOSE=(docker compose -f docker-compose.yml)

# Reads one value from .env without executing the file or printing it
value() { sed -n "s/^$1=//p" .env | tail -1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"; }

[ -f .env ] || { echo "Create $(pwd)/.env first (copy env.production.example)"; exit 1; }
chmod 600 .env
for name in JWT_SECRET POSTGRES_PASSWORD; do
  [ -n "$(value $name)" ] || { echo "$name is missing from .env"; exit 1; }
done
db_password="$(value POSTGRES_PASSWORD)"
[[ "$db_password" =~ ^[A-Za-z0-9_-]{16,}$ ]] || { echo "POSTGRES_PASSWORD must be 16+ letters, digits, - or _"; exit 1; }
db_user="$(value POSTGRES_USER)"; db_user="${db_user:-secureexam}"
db_name="$(value POSTGRES_DB)"; db_name="${db_name:-secureexam}"

# The timer and the app share this token; it is made here once and never leaves the server
if [ -z "$(value CRON_SECRET)" ]; then
  echo "== Creating the timer token"
  sed -i '/^CRON_SECRET=/d' .env
  [ -z "$(tail -c 1 .env)" ] || echo >> .env
  echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env
fi

# Needed to sign up a new administrator. Read it with: grep ADMIN_SIGNUP_CODE ~/secureexam/.env
if [ -z "$(value ADMIN_SIGNUP_CODE)" ]; then
  echo "== Creating the administrator setup code"
  sed -i '/^ADMIN_SIGNUP_CODE=/d' .env
  [ -z "$(tail -c 1 .env)" ] || echo >> .env
  echo "ADMIN_SIGNUP_CODE=$(openssl rand -hex 12)" >> .env
fi

echo "== Removing leftovers from the earlier template"
docker rm -f estatepro >/dev/null 2>&1 || true
docker network rm nascon-net >/dev/null 2>&1 || true
docker container prune -f >/dev/null

echo "== Getting images"
if [ "${SKIP_PULL:-}" != "true" ]; then
  "${COMPOSE[@]}" --profile tools pull
fi

echo "== Database"
"${COMPOSE[@]}" up -d --wait postgres
# Keeps the stored password in step with .env if it is ever changed
"${COMPOSE[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -q -U "$db_user" -d "$db_name" \
  <<SQL
ALTER USER "$db_user" PASSWORD '$db_password';
SQL

echo "== Migrations"
"${COMPOSE[@]}" run --rm -T tools npx prisma migrate deploy

admins=$("${COMPOSE[@]}" exec -T postgres psql -tAq -U "$db_user" -d "$db_name" -c "select count(*) from \"User\" where role='ADMIN'")
if [ "$admins" = "0" ]; then
  if [ -n "$(value ADMIN_EMAIL)" ] && [ -n "$(value ADMIN_PASSWORD)" ]; then
    echo "== Creating the first administrator from .env"
    "${COMPOSE[@]}" run --rm -T tools npx tsx scripts/seed-admin.ts
  else
    echo "No administrator yet: add ADMIN_EMAIL and ADMIN_PASSWORD to .env and deploy again."
  fi
fi

echo "== Application"
"${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 180 app

echo "== Web server"
if ! sudo -n cmp -s nginx-secureexam.conf /etc/nginx/default.d/secureexam.conf; then
  sudo -n cp nginx-secureexam.conf /etc/nginx/default.d/secureexam.conf
  if ! sudo -n nginx -t; then
    sudo -n rm -f /etc/nginx/default.d/secureexam.conf
    echo "nginx rejected the configuration; removed it again"
    exit 1
  fi
  sudo -n systemctl reload nginx
fi

curl -fsS --retry 20 --retry-delay 3 --retry-all-errors http://127.0.0.1:3000/api/health >/dev/null
echo "== Healthy"

echo "== Reminder timer (every 5 minutes)"
sudo -n tee /etc/systemd/system/secureexam-cron.service >/dev/null <<UNIT
[Unit]
Description=Examination reminders and attempt closing
After=docker.service

[Service]
Type=oneshot
User=$(id -un)
ExecStart=/usr/bin/env bash $(pwd)/cron.sh
UNIT
sudo -n tee /etc/systemd/system/secureexam-cron.timer >/dev/null <<UNIT
[Unit]
Description=Run examination reminders every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
UNIT
sudo -n systemctl daemon-reload
sudo -n systemctl enable --now secureexam-cron.timer
sudo -n systemctl start secureexam-cron.service || echo "The first reminder run failed: check journalctl -u secureexam-cron"

# Old versions of our image only; volumes are never touched
docker images "$IMAGE" --format '{{.Tag}}' | { grep -vxE "latest|$TOOLS_TAG|$TAG" || true; } | while read -r old; do
  docker rmi "$IMAGE:$old" >/dev/null 2>&1 || true
done
docker image prune -f >/dev/null
"${COMPOSE[@]}" ps

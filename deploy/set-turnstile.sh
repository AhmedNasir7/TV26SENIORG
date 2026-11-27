#!/usr/bin/env bash
# Switches the Cloudflare Turnstile bot check on the server.
#   bash set-turnstile.sh        asks for the secret (hidden), checks it with Cloudflare, restarts the app
#   bash set-turnstile.sh off    switches the check off again
# The secret is typed by the person running this; it is never stored in the repository.
set -euo pipefail
cd "$(dirname "$0")"

secret=""
if [ "${1:-}" != off ]; then
  # Typed at the prompt, or piped in from the computer running the command
  read -rsp "Paste the Turnstile SECRET key (not the site key), then press Enter: " secret || true
  echo
  secret="$(printf '%s' "$secret" | tr -cd 'A-Za-z0-9_-')" # drops stray spaces and Windows line ends
  [[ "$secret" =~ ^[A-Za-z0-9_-]{20,}$ ]] || { echo "That does not look like a secret key. Nothing changed."; exit 1; }
  # A real secret answers "invalid-input-response" to a made-up token; a wrong one is named as such
  reply="$(printf 'secret=%s&response=check' "$secret" | curl -s -m 15 --data @- https://challenges.cloudflare.com/turnstile/v0/siteverify)"
  case "$reply" in
    *invalid-input-secret*) echo "Cloudflare rejected this secret. Nothing changed."; exit 1 ;;
    *invalid-input-response*) echo "Cloudflare accepts the secret." ;;
    *) echo "Could not check the secret with Cloudflare. Nothing changed."; exit 1 ;;
  esac
fi

sed -i '/^TURNSTILE_SECRET_KEY=/d' .env
printf 'TURNSTILE_SECRET_KEY=%s\n' "$secret" >>.env
chmod 600 .env

image="$(docker inspect secureexam-app-1 --format '{{.Config.Image}}')"
IMAGE="${image%:*}" TAG="${image##*:}" docker compose -f docker-compose.yml up -d --no-deps --wait app
echo "App restarted. Bot check settings now: $(curl -fsS --retry 10 --retry-delay 2 --retry-all-errors http://127.0.0.1:3000/api/security/turnstile)"

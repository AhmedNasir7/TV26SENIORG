#!/usr/bin/env bash
# Saves the Groq key into an .env file without echoing it, checking it first.
#   Local:   bash scripts/set-groq.sh
#   Server:  bash set-groq.sh        (run inside ~/secureexam)
set -euo pipefail
file=".env"
[ -f "$file" ] || { echo "Run this in the folder that holds .env"; exit 1; }
read -rsp "Paste the Groq API key, then press Enter: " key; echo
key="$(printf '%s' "$key" | tr -d '[:space:]')"
[[ "$key" =~ ^gsk_[A-Za-z0-9]+$ ]] || { echo "That does not look like a Groq key (gsk_...)"; exit 1; }
status=$(printf 'header = "Authorization: Bearer %s"\n' "$key" |
  curl -s -o /dev/null -w '%{http_code}' -K - https://api.groq.com/openai/v1/models)
[ "$status" = "200" ] || { echo "Groq refused the key (HTTP $status). Nothing was saved."; exit 1; }
(
  umask 077
  { grep -v '^GROQ_API_KEY=' "$file" || true; printf 'GROQ_API_KEY=%s\n' "$key"; } > "$file.new"
)
mv "$file.new" "$file"
echo "Saved."
if [ -f docker-compose.yml ] && docker inspect secureexam-app-1 >/dev/null 2>&1; then
  image="$(docker inspect secureexam-app-1 --format '{{.Config.Image}}')"
  IMAGE="${image%:*}" TAG="${image##*:}" docker compose -f docker-compose.yml up -d --force-recreate --wait app
  echo "Application restarted: the AI features are on."
else
  echo "Restart the app to turn the AI features on."
fi

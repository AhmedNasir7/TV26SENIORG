#!/usr/bin/env bash
# Called by the secureexam-cron timer: closes expired attempts and sends due reminders.
set -euo pipefail
cd "$(dirname "$0")"
secret="$(sed -n 's/^CRON_SECRET=//p' .env | tail -1 | tr -d "\r\"'")"
# The secret goes to curl on standard input, so it never shows in the process list
printf 'header = "Authorization: Bearer %s"\n' "$secret" |
  curl -fsS -m 120 -X POST -K - http://127.0.0.1:3000/api/cron/reminders
echo

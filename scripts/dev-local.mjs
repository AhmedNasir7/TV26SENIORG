/**
 * Runs the app directly on this machine with only the database in Docker, so edits show at once.
 *   node scripts/dev-local.mjs        (or: pnpm dev:local)
 * Local-only settings are taken from docker-compose.dev.yml; the .env database address is overridden
 * so this never touches a remote database. Nothing is printed from either file.
 */
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

process.chdir(fileURLToPath(new URL('..', import.meta.url))) // works from any folder

const compose = ['compose', '-f', 'docker-compose.dev.yml']

try {
  execFileSync('docker', [...compose, 'up', '-d', '--wait', 'postgres'], { stdio: 'inherit' })
} catch {
  console.error('Could not start the database container. Is Docker Desktop running?')
  process.exit(1)
}

const config = JSON.parse(execFileSync('docker', [...compose, 'config', '--format', 'json'], { encoding: 'utf8' }))
const settings = config.services.app.environment
const local = {
  DATABASE_URL: settings.DATABASE_URL.replace('@postgres:5432', '@localhost:5432'),
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
}
for (const name of ['SHOW_DEMO_LOGINS', 'DEMO_ADMIN_PASSWORD', 'DEMO_EXAMINER_PASSWORD', 'DEMO_CANDIDATE_PASSWORD']) {
  if (settings[name]) local[name] = settings[name]
}

// `--captcha-test`: Cloudflare's published test keys, which always pass, to try the bot check locally
if (process.argv.includes('--captcha-test')) {
  local.TURNSTILE_SITE_KEY = '1x00000000000000000000AA'
  local.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA'
}

// Values set here win over .env
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', '3000'], {
  stdio: 'inherit',
  env: { ...process.env, ...local },
})
server.on('exit', (code) => process.exit(code ?? 0))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal))

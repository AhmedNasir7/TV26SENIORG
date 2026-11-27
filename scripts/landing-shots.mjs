/**
 * Takes the dashboard pictures used on the landing page, from the local app with demo data.
 *   node scripts/landing-shots.mjs          (app on localhost:3000, Chrome installed)
 * Demo passwords come from docker-compose.dev.yml and are never printed.
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

process.chdir(fileURLToPath(new URL('..', import.meta.url)))

const BASE = 'http://localhost:3000'
const OUT = 'public/landing'
const PORT = 9333
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
].find((path) => path && existsSync(path))
if (!chrome) throw new Error('Set CHROME_PATH to a Chrome or Edge executable')

const config = JSON.parse(execFileSync('docker', ['compose', '-f', 'docker-compose.dev.yml', 'config', '--format', 'json'], { encoding: 'utf8' }))
const settings = config.services.app.environment

const browser = spawn(chrome, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'shots-'))}`,
  '--window-size=1440,900', '--hide-scrollbars', '--no-first-run', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = pages.find((p) => p.type === 'page')
      if (page) return new WebSocket(page.webSocketDebuggerUrl)
    } catch {}
    await sleep(500)
  }
  throw new Error('The browser did not start')
}

try {
  const socket = await connect()
  await new Promise((resolve) => (socket.onopen = resolve))
  let id = 0
  const waiting = new Map()
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    waiting.get(message.id)?.(message)
    waiting.delete(message.id)
  }
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id
      waiting.set(n, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)))
      socket.send(JSON.stringify({ id: n, method, params }))
    })
  const run = async (expression) =>
    (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value

  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1.25, mobile: false })

  let suffix = ''
  let themeScript = null
  async function setShotTheme(theme) {
    if (themeScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: themeScript })
    themeScript = (await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('secureexam-theme','${theme}')` })).identifier
    suffix = theme === 'dark' ? '-dark' : ''
  }

  async function open(path, wait = 3500) {
    await send('Page.navigate', { url: BASE + path })
    for (let i = 0; i < 120; i++) {
      await sleep(500)
      if (await run("document.readyState === 'complete' && Boolean(document.querySelector('main'))")) break
    }
    await sleep(wait)
  }

  async function signIn(email, password) {
    await open('/login', 1500)
    await run("fetch('/api/auth/logout', { method: 'POST' }).then(() => 1)")
    const status = await run(`fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: ${JSON.stringify(JSON.stringify({ email, password }))} }).then((r) => r.status)`)
    if (status !== 200) throw new Error(`Sign-in failed for ${email}: ${status}`)
  }

  async function shot(name, path, prepare) {
    await open(path)
    if (prepare) {
      await run(prepare)
      await sleep(2500)
    }
    // Leftover rows from automated checks stay out of the pictures
    await run("document.querySelectorAll('li, tr').forEach((n) => n.textContent.includes('ZZ ') && n.remove()); document.querySelectorAll('[aria-label*=\"theme\" i].fixed').forEach((n) => n.remove())")
    await sleep(300)
    const { data } = await send('Page.captureScreenshot', { format: 'webp', quality: 82 })
    writeFileSync(`${OUT}/${name}${suffix}.webp`, Buffer.from(data, 'base64'))
    console.log('saved', name + suffix)
  }

  mkdirSync(OUT, { recursive: true })
  for (const theme of ['light', 'dark']) {
    await setShotTheme(theme)
    await signIn('examiner.demo@secureexam.test', settings.DEMO_EXAMINER_PASSWORD)
    const exams = await run("fetch('/api/exams').then((r) => r.json()).then((d) => d.exams ?? d.items)")
    const find = (title) => exams.find((e) => e.title.startsWith(title)).id
    const done = find('Programming')
    const live = find('Database')
    const next = find('Computer')

    await shot('workspace', '/examiner')
    await shot('results', `/examiner/exams/${done}/results`)
    await shot('monitor', `/examiner/exams/${live}/monitor`)
    await shot('questions', '/examiner/questions')
    await shot('fair', `/examiner/exams/${next}/fair`)
    await run(`fetch('/api/exams/${next}/sandbox', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"minutes":30}' }).then((r) => r.status)`)
    await shot('attempt', `/examiner/exams/${next}/sandbox`)
    await shot('scratchpad', `/examiner/exams/${next}/sandbox`, "document.querySelector('.pad-hex')?.click()")

    await signIn('candidate.demo@secureexam.test', settings.DEMO_CANDIDATE_PASSWORD)
    await shot('candidate', '/candidate')
    await shot('result', `/candidate/exams/${done}/result`)
  }
  socket.close()
} finally {
  browser.kill()
}

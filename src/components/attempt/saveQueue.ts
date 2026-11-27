/**
 * Sends answers to the server in order, keeps unsent ones in local storage, and retries with a
 * growing delay while the connection is bad. Framework-free so it behaves predictably.
 */
import { apiRequest, RequestError } from '@/lib/client/request'
import { readPending, writePending, type Draft, type Pending } from './storage'

export type SaveState =
  | { kind: 'saved'; at: string | null }
  | { kind: 'saving' }
  | { kind: 'retrying'; unsaved: number }
  | { kind: 'blocked'; message: string; unsaved: number }

type Reply = { saved: boolean; revision: number; savedAt: string }
const MAX_DELAY = 15_000

export function createSaveQueue(attemptId: number, sessionId: string, onState: (state: SaveState) => void) {
  const pending: Pending = {}
  let timer: ReturnType<typeof setTimeout> | undefined
  let running: Promise<boolean> | null = null
  let failures = 0
  let savedAt: string | null = null
  let blocked: string | null = null
  let stopped = false

  const count = () => Object.keys(pending).length
  const persist = () => writePending(attemptId, pending)

  function report() {
    if (blocked) onState({ kind: 'blocked', message: blocked, unsaved: count() })
    else if (!count()) onState({ kind: 'saved', at: savedAt })
    else onState(failures ? { kind: 'retrying', unsaved: count() } : { kind: 'saving' })
  }

  function schedule(delay: number) {
    clearTimeout(timer)
    if (!stopped && !blocked) timer = setTimeout(() => void flush(), delay)
  }

  async function sendAll(keepalive: boolean) {
    for (const key of Object.keys(pending)) {
      const questionId = Number(key)
      const draft = pending[questionId]
      if (!draft) continue
      try {
        const reply = await apiRequest<Reply>(
          `/api/attempts/${attemptId}/answers/${questionId}`,
          'PUT',
          { sessionId, ...draft },
          { keepalive }
        )
        failures = 0
        if (!reply.saved) {
          // The server holds a higher revision (another device earlier): this edit is newer
          if (pending[questionId] === draft) pending[questionId] = { ...draft, revision: reply.revision + 1 }
          continue
        }
        savedAt = reply.savedAt
        if (pending[questionId] === draft) delete pending[questionId]
      } catch (error) {
        const status = error instanceof RequestError ? error.status : 0
        if (status === 400 || status === 404) {
          delete pending[questionId] // can never succeed
        } else if (status === 401 || status === 403 || status === 409) {
          blocked = (error as Error).message
          break
        } else {
          failures += 1
          break
        }
      } finally {
        persist()
      }
    }
  }

  /** Resolves true when nothing is left unsent. */
  function flush(keepalive = false): Promise<boolean> {
    if (running) return running.then(() => (count() && !blocked && !failures ? flush(keepalive) : !count()))
    clearTimeout(timer)
    if (!count() || blocked) {
      report()
      return Promise.resolve(!count())
    }
    report()
    running = sendAll(keepalive).then(() => {
      running = null
      report()
      if (count()) schedule(failures ? Math.min(MAX_DELAY, 1000 * 2 ** (failures - 1)) : 100)
      return !count()
    })
    return running
  }

  return {
    flush,
    unsent: count,
    push(questionId: number, draft: Draft, delay: number) {
      pending[questionId] = draft
      persist()
      report()
      schedule(delay)
    },
    /** Unsent answers from before a reload that are newer than what the server has. */
    restore(serverRevision: (questionId: number) => number | undefined): Pending {
      for (const [key, draft] of Object.entries(readPending(attemptId))) {
        const known = serverRevision(Number(key))
        if (known !== undefined && draft.revision > known) pending[Number(key)] = draft
      }
      persist()
      stopped = false
      report()
      if (count()) schedule(0)
      return { ...pending }
    },
    stop() {
      stopped = true
      clearTimeout(timer)
    },
  }
}

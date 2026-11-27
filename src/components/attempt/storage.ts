/**
 * What the browser keeps during an attempt: answers not yet accepted by the server and the
 * question in view. Everything here is removed after submitting and on sign-out (shared computers).
 */
export type Response = { optionKeys: string[] } | { text: string } | null
export type Draft = { response: Response; markedForReview: boolean; revision: number }
export type Pending = Record<number, Draft>

const PREFIX = 'attempt-'
const pendingKey = (attemptId: number) => `${PREFIX}pending-${attemptId}`
const positionKey = (attemptId: number) => `${PREFIX}position-${attemptId}`

function safely<T>(action: () => T, fallback: T): T {
  try {
    return action()
  } catch {
    return fallback // storage blocked or full: saving to the server still works
  }
}

export const readPending = (attemptId: number): Pending =>
  safely(() => JSON.parse(localStorage.getItem(pendingKey(attemptId)) ?? '{}') as Pending, {})

export const writePending = (attemptId: number, pending: Pending) =>
  safely(() => {
    if (Object.keys(pending).length) localStorage.setItem(pendingKey(attemptId), JSON.stringify(pending))
    else localStorage.removeItem(pendingKey(attemptId))
  }, undefined)

export const readPosition = (attemptId: number) => safely(() => Number(localStorage.getItem(positionKey(attemptId))) || 1, 1)

export const writePosition = (attemptId: number, position: number) =>
  safely(() => localStorage.setItem(positionKey(attemptId), String(position)), undefined)

export type MonitorEvent = {
  type: 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'OFFLINE' | 'PASTE' | 'COPY' | 'FULLSCREEN_EXIT'
  seconds?: number
  characters?: number
}
const eventsKey = (attemptId: number) => `${PREFIX}events-${attemptId}`

export const readEvents = (attemptId: number) =>
  safely(() => JSON.parse(localStorage.getItem(eventsKey(attemptId)) ?? '[]') as MonitorEvent[], [])

export const writeEvents = (attemptId: number, events: MonitorEvent[]) =>
  safely(() => {
    if (events.length) localStorage.setItem(eventsKey(attemptId), JSON.stringify(events))
    else localStorage.removeItem(eventsKey(attemptId))
  }, undefined)

export type Pad = { notes: string; drawing: [number, number][][]; unsent?: boolean }
const padKey = (attemptId: number) => `${PREFIX}pad-${attemptId}`

export const readPad = (attemptId: number) =>
  safely(() => JSON.parse(localStorage.getItem(padKey(attemptId)) ?? 'null') as Pad | null, null)

export const writePad = (attemptId: number, pad: Pad) =>
  safely(() => localStorage.setItem(padKey(attemptId), JSON.stringify(pad)), undefined)

export function clearAttemptStorage() {
  safely(() => {
    for (const store of [localStorage, sessionStorage]) {
      Object.keys(store)
        .filter((key) => key.startsWith(PREFIX))
        .forEach((key) => store.removeItem(key))
    }
  }, undefined)
}

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

export function clearAttemptStorage() {
  safely(() => {
    for (const store of [localStorage, sessionStorage]) {
      Object.keys(store)
        .filter((key) => key.startsWith(PREFIX))
        .forEach((key) => store.removeItem(key))
    }
  }, undefined)
}

/** The attempt session lives in this tab: a reload keeps it, another browser has to take over. */
const key = (examId: number) => `attempt-session-${examId}`

export function readSession(examId: number) {
  try {
    return sessionStorage.getItem(key(examId)) ?? undefined
  } catch {
    return undefined
  }
}

export function storeSession(examId: number, sessionId: string) {
  try {
    sessionStorage.setItem(key(examId), sessionId)
  } catch {
    // Storage blocked: the next reload simply counts as a new session
  }
}

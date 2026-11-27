/** The attempt session lives in this tab: a reload keeps it, another browser has to take over. */
const key = (examId: number, sandbox: boolean) => `attempt-session-${sandbox ? 'sandbox-' : ''}${examId}`

export function readSession(examId: number, sandbox = false) {
  try {
    return sessionStorage.getItem(key(examId, sandbox)) ?? undefined
  } catch {
    return undefined
  }
}

export function storeSession(examId: number, sessionId: string, sandbox = false) {
  try {
    sessionStorage.setItem(key(examId, sandbox), sessionId)
  } catch {
    // Storage blocked: the next reload simply counts as a new session
  }
}

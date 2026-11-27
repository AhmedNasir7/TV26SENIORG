/** What the candidate is told about the connection. Pure, so tests can use it. */
export type ConnectionState = 'online' | 'unstable' | 'offline' | 'reconnecting'

export const SLOW_MS = 3000

export type ConnectionSignals = {
  /** the browser's own online flag */
  browserOnline: boolean
  /** server check-ins failed in a row */
  failures: number
  /** how long the last successful check-in took */
  latencyMs: number | null
  /** the browser came back online but the server hasn't answered yet */
  recovering: boolean
  /** an answer is waiting to be retried */
  saveRetrying: boolean
}

export function connectionState(signals: ConnectionSignals): ConnectionState {
  if (!signals.browserOnline) return 'offline'
  if (signals.recovering) return 'reconnecting'
  if (signals.failures >= 2) return 'offline'
  if (signals.failures === 1 || signals.saveRetrying || (signals.latencyMs ?? 0) > SLOW_MS) return 'unstable'
  return 'online'
}

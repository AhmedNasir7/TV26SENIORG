import type { ConnectionState } from '@/lib/connection'

const TEXT: Record<Exclude<ConnectionState, 'online'>, string> = {
  unstable: 'Your connection is unstable.',
  offline: 'You are offline, or the server cannot be reached.',
  reconnecting: 'Reconnecting...',
}

type Props = { state: ConnectionState; unsaved: number; onRetry: () => void }

/** Says what is happening and what will happen, only when something is wrong. */
export function NetworkNotice({ state, unsaved, onRetry }: Props) {
  return (
    <div aria-live="polite">
      {state !== 'online' && (
        <div className="surface-card space-y-2 p-4 text-sm" style={{ borderColor: 'var(--danger)' }}>
          <p className="font-medium">{TEXT[state]}</p>
          <p>
            The timer keeps running on the server. {unsaved > 0 ? `${unsaved} answer${unsaved === 1 ? ' is' : 's are'} waiting on this device` : 'New answers are kept on this device'} and will be sent when the
            connection returns, if there is still time. Keep this page open.
          </p>
          <button type="button" onClick={onRetry} className="btn-secondary px-3 py-1.5">Retry now</button>
        </div>
      )}
    </div>
  )
}

import type { Credentials } from './api'

/** A temporary password is shown here once; it is not stored anywhere it can be read again. */
export function CredentialNotice({ credentials, onDismiss }: { credentials: Credentials; onDismiss: () => void }) {
  return (
    <div role="status" className="surface-card mb-6 flex flex-wrap items-start justify-between gap-4 p-5">
      <div>
        {credentials.emailed ? (
          <p className="text-sm">Sign-in details were emailed to {credentials.email}.</p>
        ) : (
          <>
            <p className="text-sm font-medium">Temporary password for {credentials.email}</p>
            <p className="mt-2 select-all font-mono text-lg">{credentials.temporaryPassword}</p>
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              Shown only once. The user must change it at first sign-in.
            </p>
          </>
        )}
      </div>
      <button type="button" onClick={onDismiss} className="btn-secondary px-3 py-1.5 text-xs">
        Done
      </button>
    </div>
  )
}

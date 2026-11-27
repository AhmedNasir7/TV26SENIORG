import type { RefObject } from 'react'
import { MessageThread, type Message } from '@/components/chat/MessageThread'

export function ChatFeed({
  feedRef,
  onScroll,
  loading,
  messages,
  signedIn,
  autoScroll,
  onScrollToBottom,
  onReply,
  currentUserId,
}: {
  feedRef: RefObject<HTMLDivElement>
  onScroll: () => void
  loading: boolean
  messages: Message[]
  signedIn: boolean
  autoScroll: boolean
  onScrollToBottom: () => void
  onReply: (target: Message) => void
  currentUserId?: number
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="text-sm font-semibold text-[color:var(--foreground)]">Live chat</span>
        </div>
        {!autoScroll && (
          <button type="button" onClick={onScrollToBottom} className="btn-primary px-2.5 py-1 text-xs">
            ↓ New messages
          </button>
        )}
      </div>

      <div
        ref={feedRef}
        onScroll={onScroll}
        className="min-h-[320px] flex-1 space-y-4 overflow-y-auto p-4 scroll-smooth sm:p-6"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-[color:var(--muted)]">Loading chat...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-semibold text-[color:var(--foreground)]">No messages yet</p>
            <p className="mt-2 max-w-xs text-sm text-[color:var(--muted)]">
              {signedIn ? 'Be the first to start the conversation!' : 'Sign in to join the discussion.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageThread
              key={msg.id}
              message={msg}
              depth={0}
              maxDepth={6}
              onReply={onReply}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </>
  )
}

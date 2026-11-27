import dynamic from 'next/dynamic'
import type { RefObject } from 'react'
import type { Theme } from 'emoji-picker-react'
import { UserAvatar } from '@/components/chat/UserAvatar'
import type { Message } from '@/components/chat/MessageThread'
import { displayName } from '@/lib/chat-format'

const EmojiPicker = dynamic(() => import('emoji-picker-react').then((mod) => mod.default), { ssr: false })

export function ChatComposer({
  inputRef,
  input,
  onInputChange,
  replyingTo,
  onCancelReply,
  showEmoji,
  onToggleEmoji,
  onEmojiClick,
  submitting,
  onSubmit,
}: {
  inputRef: RefObject<HTMLTextAreaElement>
  input: string
  onInputChange: (value: string) => void
  replyingTo: Message | null
  onCancelReply: () => void
  showEmoji: boolean
  onToggleEmoji: () => void
  onEmojiClick: (emojiData: { emoji: string }) => void
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div className="border-t border-[var(--border)] p-4">
      {replyingTo && (
        <div className="mb-3 flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5" style={{ background: 'var(--accent-soft)' }}>
          <UserAvatar
            userId={replyingTo.author.id}
            name={replyingTo.author.name}
            email={replyingTo.author.email}
            imageUrl={replyingTo.author.imageUrl}
            role={replyingTo.author.role}
            size="sm"
            showTooltip={false}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--accent-strong)' }}>
                Replying to
              </span>
              <span className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                {displayName(replyingTo.author)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-[color:var(--muted)]">
              {replyingTo.content.slice(0, 60)}
              {replyingTo.content.length > 60 ? '…' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="btn-ghost h-7 w-7 shrink-0 px-0"
            aria-label="Cancel reply"
          >
            ×
          </button>
        </div>
      )}
      <form onSubmit={onSubmit} className="relative">
        <div className="input-clean flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={() => showEmoji && onToggleEmoji()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit(e)
              }
            }}
            placeholder={
              replyingTo
                ? `Reply to ${displayName(replyingTo.author)}...`
                : 'Type your message... (Enter to send, Shift+Enter for new line)'
            }
            rows={2}
            className="min-h-[52px] max-h-32 flex-1 resize-none bg-transparent px-4 py-3 text-sm text-[color:var(--foreground)] placeholder-[color:var(--muted)] focus:outline-none"
          />
          <div className="flex items-center gap-1 pr-2 pb-2">
            <div className="relative">
              <button type="button" onClick={onToggleEmoji} className="btn-ghost h-9 w-9 px-0" title="Add emoji">
                <span className="text-lg">☺</span>
              </button>
              {showEmoji && (
                <div className="absolute bottom-full right-0 z-50 mb-2 overflow-hidden rounded-[var(--radius)] shadow-[var(--shadow-md)]">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme={(typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light') as Theme}
                    width={320}
                    height={400}
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting || !input.trim()}
              className="btn-primary h-9 w-9 px-0 disabled:opacity-50"
              title="Send message (Enter)"
            >
              ↑
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

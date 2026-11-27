'use client'

import { memo, useState } from 'react'
import { UserAvatar } from './UserAvatar'
import { isStaff, roleLabel } from '@/lib/roles'

export type Author = {
  id: number
  email: string
  name: string | null
  imageUrl?: string | null
  role?: string | null
}

export type Message = {
  id: number | string
  content: string
  author: Author
  createdAt: string
  replies?: Message[]
  _optimistic?: boolean
}

type MessageThreadProps = {
  message: Message
  depth?: number
  maxDepth?: number
  onReply?: (message: Message) => void
  currentUserId?: number | null
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  
  const isThisYear = d.getFullYear() === now.getFullYear()
  if (isThisYear) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const MessageThreadComponent = ({
  message,
  depth = 0,
  maxDepth = 6,
  onReply,
  currentUserId,
}: MessageThreadProps) => {
  const [collapsed, setCollapsed] = useState(false)
  const [showFullDate, setShowFullDate] = useState(false)
  
  const isNested = depth > 0
  const hasReplies = message.replies && message.replies.length > 0
  const canReply = currentUserId && depth < maxDepth
  const isOwnMessage = currentUserId === message.author.id

  const displayName = message.author.name?.trim() || message.author.email.split('@')[0] || 'Anonymous'

  return (
    <div className={isNested ? 'relative ml-2 border-l-2 border-[var(--border)] pl-4 sm:ml-3 sm:pl-6' : ''}>
      {isNested && (
        <div
          className="absolute -left-[5px] top-6 h-2 w-2 rounded-full border-2 border-[var(--surface)]"
          style={{ background: 'var(--accent)' }}
        />
      )}

      <div
        className={`group inline-block max-w-3xl rounded-[var(--radius)] border p-3 transition-colors sm:p-4 ${
          message._optimistic ? '' : 'hover:border-[var(--accent)]'
        } ${isOwnMessage ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}
        style={{ background: message._optimistic ? 'var(--accent-soft)' : 'var(--surface)' }}
      >
        <div className="flex items-start gap-3">
          <UserAvatar
            userId={message.author.id}
            name={message.author.name}
            email={message.author.email}
            imageUrl={message.author.imageUrl}
            role={message.author.role}
            size="md"
            showTooltip={true}
          />

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-[color:var(--foreground)]">
                  {displayName}
                </span>
                {isStaff(message.author.role) && message.author.role && (
                  <span className="chip text-[10px]">{roleLabel(message.author.role)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFullDate(!showFullDate)}
                className="shrink-0 text-xs text-[color:var(--muted)] transition-colors hover:text-[color:var(--foreground)]"
                title={formatFullDate(message.createdAt)}
              >
                {showFullDate ? formatFullDate(message.createdAt) : formatTime(message.createdAt)}
              </button>
            </div>

            <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[color:var(--foreground)]">
              {message.content}
            </p>

            <div className="mt-2 flex items-center gap-2">
              {canReply && onReply && (
                <button
                  type="button"
                  onClick={() => onReply(message)}
                  className="rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-[color:var(--muted)] opacity-0 transition-all hover:bg-[var(--accent-soft)] hover:text-[color:var(--accent-strong)] group-hover:opacity-100"
                >
                  Reply
                </button>
              )}
              {hasReplies && (
                <button
                  type="button"
                  onClick={() => setCollapsed(!collapsed)}
                  className="rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-[color:var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[color:var(--foreground)]"
                >
                  {collapsed
                    ? `Show ${message.replies!.length} ${message.replies!.length === 1 ? 'reply' : 'replies'}`
                    : `Hide ${message.replies!.length} ${message.replies!.length === 1 ? 'reply' : 'replies'}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {hasReplies && !collapsed && (
        <div className="mt-3 space-y-3">
          {message.replies!.map((reply) => (
            <MessageThreadComponent
              key={reply.id}
              message={reply}
              depth={depth + 1}
              maxDepth={maxDepth}
              onReply={onReply}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const MessageThread = memo(MessageThreadComponent)

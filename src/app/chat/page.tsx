'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AppHeader } from '@/components/layout/AppHeader'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui/ToasterProvider'
import type { Message } from '@/components/chat/MessageThread'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { ChatFeed } from '@/components/chat/ChatFeed'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { createPusherClient } from '@/lib/pusher/client'

const COMMUNITY_CHAT_CHANNEL = 'community-chat'

function injectOptimistic(list: Message[], parentId: number | null, optimistic: Message): Message[] {
  if (parentId === null) {
    return [...list, optimistic]
  }
  return list.map((m) => {
    if (m.id === parentId) {
      return { ...m, replies: [...(m.replies || []), optimistic] }
    }
    if (m.replies?.length) {
      return { ...m, replies: injectOptimistic(m.replies, parentId, optimistic) }
    }
    return m
  })
}

function removeOptimistic(list: Message[], tempId: string | number): Message[] {
  return list
    .filter((m) => m.id !== tempId)
    .map((m) => (m.replies?.length ? { ...m, replies: removeOptimistic(m.replies, tempId) } : m))
}

function containsMessageId(list: Message[], id: number | string): boolean {
  return list.some((m) => m.id === id || (m.replies?.length ? containsMessageId(m.replies, id) : false))
}

// Replaces an optimistic placeholder with the server-confirmed message, in place.
function replaceMessage(list: Message[], tempId: string | number, real: Message): Message[] {
  return list.map((m) => {
    if (m.id === tempId) return real
    if (m.replies?.length) return { ...m, replies: replaceMessage(m.replies, tempId, real) }
    return m
  })
}

export default function CommunityChatPage() {
  const { user, loading: authLoading } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEmoji, setShowEmoji] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const feedRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/messages')
      const data = await res.json()
      if (res.ok) setMessages(data.messages || [])
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    const pusher = createPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(COMMUNITY_CHAT_CHANNEL)
    // The ping carries no content; load the messages through the authenticated API
    channel.bind('new-message', () => fetchMessages())

    return () => {
      pusher.unsubscribe(COMMUNITY_CHAT_CHANNEL)
      pusher.disconnect()
    }
  }, [fetchMessages])

  useEffect(() => {
    if (feedRef.current && messages.length && autoScroll) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.length, autoScroll])

  const handleScroll = useCallback(() => {
    if (!feedRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100)
  }, [])

  const scrollToBottom = useCallback(() => {
    if (!feedRef.current) return
    feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
    setAutoScroll(true)
  }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !input.trim()) {
      if (!user) toast.error('Sign in to send messages')
      return
    }
    const contentToSend = input.trim()
    const parentId = replyingTo?.id != null && typeof replyingTo.id === 'number' ? replyingTo.id : null
    const tempId = `opt-${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId,
      content: contentToSend,
      author: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        imageUrl: user.imageUrl ?? null,
        role: user.role ?? null,
      },
      createdAt: new Date().toISOString(),
      replies: [],
      _optimistic: true,
    }

    setMessages((prev) => injectOptimistic(prev, parentId, optimisticMsg))
    setInput('')
    setReplyingTo(null)
    setShowEmoji(false)
    setSubmitting(true)

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentToSend, parentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setMessages((prev) => replaceMessage(prev, tempId, data.message))
    } catch (err: unknown) {
      setMessages((prev) => removeOptimistic(prev, tempId))
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSubmitting(false)
    }
  }

  function onEmojiClick(emojiData: { emoji: string }) {
    setInput((prev) => prev + emojiData.emoji)
    inputRef.current?.focus()
  }

  const messageCount = useMemo(() => {
    const countMessages = (msgs: Message[]): number =>
      msgs.reduce((acc, msg) => acc + 1 + (msg.replies ? countMessages(msg.replies) : 0), 0)
    return countMessages(messages)
  }, [messages])

  if (authLoading) {
    return (
      <div className="page-shell flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center">
          <span className="text-sm text-[color:var(--muted)]">Loading...</span>
        </main>
      </div>
    )
  }

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
        <ChatHeader messageCount={messageCount} signedIn={!!user} />

        <div className="surface-card flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatFeed
            feedRef={feedRef}
            onScroll={handleScroll}
            loading={loading}
            messages={messages}
            signedIn={!!user}
            autoScroll={autoScroll}
            onScrollToBottom={scrollToBottom}
            onReply={(target) => {
              setReplyingTo(target)
              inputRef.current?.focus()
            }}
            currentUserId={user?.id}
          />

          {user && (
            <ChatComposer
              inputRef={inputRef}
              input={input}
              onInputChange={setInput}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              showEmoji={showEmoji}
              onToggleEmoji={() => setShowEmoji((e) => !e)}
              onEmojiClick={onEmojiClick}
              submitting={submitting}
              onSubmit={handleSend}
            />
          )}
        </div>
      </main>

    </div>
  )
}

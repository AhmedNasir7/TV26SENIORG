'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui/ToasterProvider'
import type { Message } from '@/components/chat/MessageThread'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { ChatFeed } from '@/components/chat/ChatFeed'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { apiRequest } from '@/lib/client/request'
import { createPusherClient } from '@/lib/pusher/client'

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

/** The live chat of one examination. The server decides who may read and write. */
export function ExamChat({ examId, title }: { examId: number; title: string }) {
  const { user } = useAuth()
  const channelName = `exam-chat-${examId}`
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [closed, setClosed] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const feedRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiRequest<{ messages: Message[] }>(`/api/exams/${examId}/chat`)
      setMessages(data.messages)
      setClosed('')
    } catch (err) {
      setClosed(err instanceof Error ? err.message : 'Could not load the chat')
    } finally {
      setLoading(false)
    }
  }, [examId])

  useEffect(() => {
    void fetchMessages()
    // Without the realtime service the chat still works; it just refreshes every few seconds
    const timer = setInterval(() => void fetchMessages(), 8000)
    return () => clearInterval(timer)
  }, [fetchMessages])

  useEffect(() => {
    const pusher = createPusherClient()
    if (!pusher) return
    const channel = pusher.subscribe(channelName)
    // The ping carries no content; messages are loaded through the authenticated API
    channel.bind('new-message', () => void fetchMessages())
    return () => {
      pusher.unsubscribe(channelName)
      pusher.disconnect()
    }
  }, [channelName, fetchMessages])

  const messageCount = useMemo(() => {
    const count = (list: Message[]): number => list.reduce((sum, m) => sum + 1 + (m.replies ? count(m.replies) : 0), 0)
    return count(messages)
  }, [messages])

  useEffect(() => {
    if (feedRef.current && messageCount && autoScroll) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messageCount, autoScroll])

  const handleScroll = useCallback(() => {
    if (!feedRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100)
  }, [])

  const scrollToBottom = useCallback(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
    setAutoScroll(true)
  }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !input.trim()) return
    const content = input.trim()
    const parentId = replyingTo?.id != null && typeof replyingTo.id === 'number' ? replyingTo.id : null
    const tempId = `opt-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      content,
      author: { id: user.id, email: user.email, name: user.name ?? null, imageUrl: user.imageUrl ?? null, role: user.role ?? null },
      createdAt: new Date().toISOString(),
      replies: [],
      _optimistic: true,
    }
    setMessages((prev) => injectOptimistic(prev, parentId, optimistic))
    setInput('')
    setReplyingTo(null)
    setShowEmoji(false)
    setSubmitting(true)
    try {
      const data = await apiRequest<{ message: Message }>(`/api/exams/${examId}/chat`, 'POST', { content, parentId })
      setMessages((prev) => (containsMessageId(prev, data.message.id) ? removeOptimistic(prev, tempId) : replaceMessage(prev, tempId, data.message)))
    } catch (err) {
      setMessages((prev) => removeOptimistic(prev, tempId))
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSubmitting(false)
    }
  }

  if (closed) {
    return (
      <div className="surface-card p-8 text-sm" role="status">
        <p className="font-medium">{closed}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[28rem] flex-col">
      <ChatHeader messageCount={messageCount} signedIn={!!user} title={`Chat: ${title}`} />
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
            onEmojiClick={(emoji: { emoji: string }) => {
              setInput((prev) => prev + emoji.emoji)
              inputRef.current?.focus()
            }}
            submitting={submitting}
            onSubmit={handleSend}
          />
        )}
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import type { QuestionList, Topic } from './types'

export const emptyQuestionFilters = { search: '', topicId: '', type: '', difficulty: '', archived: 'false' }
export type QuestionFilterState = typeof emptyQuestionFilters

/** Filtered, paged bank questions plus the topics, shared by the bank and the exam picker. */
export function useQuestionList(ownerId?: number) {
  const [filters, setFilters] = useState(emptyQuestionFilters)
  const [page, setPage] = useState(1)
  const [list, setList] = useState<QuestionList | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    const params = new URLSearchParams({ ...filters, page: String(page), ...(ownerId && { ownerId: String(ownerId) }) })
    try {
      const [questions, topicList] = await Promise.all([
        apiRequest<QuestionList>(`/api/questions?${params}`),
        apiRequest<{ topics: Topic[] }>('/api/topics'),
      ])
      setList(questions)
      setTopics(ownerId ? topicList.topics.filter((t) => t.ownerId === ownerId) : topicList.topics)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions')
    }
  }, [filters, page, ownerId])

  useEffect(() => {
    const timer = setTimeout(reload, 250)
    return () => clearTimeout(timer)
  }, [reload])

  const updateFilter = (patch: Partial<QuestionFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }

  return { filters, updateFilter, page, setPage, list, topics, error, setError, reload }
}

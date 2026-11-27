export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'WRITTEN'
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

export const TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'Single answer',
  MULTIPLE_CHOICE: 'Multiple select',
  WRITTEN: 'Written',
}
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }

export type Topic = { id: number; name: string; ownerId: number; owner: { email: string }; _count: { questions: number } }

export type QuestionRow = {
  id: number
  type: QuestionType
  difficulty: Difficulty
  text: string
  marks: number
  usedInExams: number
  currentVersion: number
  ownerId: number
  archivedAt: string | null
  topic: { id: number; name: string }
}

export type QuestionList = { questions: QuestionRow[]; total: number; page: number; totalPages: number }

export type QuestionDetail = {
  id: number
  type: QuestionType
  difficulty: Difficulty
  topicId: number
  version: number
  text: string
  marks: number
  options: Array<{ id: string; text: string; correct: boolean }>
  scoringRule: 'ALL_OR_NOTHING' | 'PARTIAL'
  guidance: string | null
  maxLength: number | null
  history: Array<{ version: number; createdAt: string; text: string }>
}

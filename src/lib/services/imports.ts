/**
 * Bulk import. Every row is validated first; nothing is written unless all rows are valid, and then
 * everything is written in one transaction. Existing accounts are never changed, and imported
 * accounts are always candidates.
 */
import { hashPassword } from '@/lib/auth'
import { parseRows, toQuestion, type Row } from '@/lib/import-parse'
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { deliverCredentialsBatch, temporaryPassword } from '@/lib/server/credentials'
import { rateLimit } from '@/lib/server/rate-limit'
import { audit } from '@/lib/services/audit'
import { emailSchema } from '@/lib/validation/auth'
import { questionSchema, type QuestionInput } from '@/lib/validation/questions'

export type ImportRequest = { content: string; format: 'csv' | 'json'; commit: boolean; examId?: number }
export type RowReport = { row: number; summary: string; errors: string[]; note?: string }

function read(request: ImportRequest) {
  try {
    return parseRows(request.content, request.format)
  } catch (error) {
    throw new ApiError('BAD_REQUEST', error instanceof Error ? error.message : 'Could not read the file')
  }
}

const result = (rows: RowReport[]) => ({
  rows,
  valid: rows.filter((r) => !r.errors.length).length,
  invalid: rows.filter((r) => r.errors.length).length,
  committed: false as boolean,
  created: 0,
  enrolled: 0,
  passwords: [] as Array<{ email: string; temporaryPassword: string }>,
})

export async function importCandidates(actor: Actor, request: ImportRequest) {
  rateLimit(`import:${actor.id}`, 30, 60_000)
  const rows = read(request)
  const exam = request.examId
    ? ensureFound(await prisma.exam.findUnique({ where: { id: request.examId } }), (e) => canManageExam(actor, e))
    : null
  if (exam?.resultsPublishedAt) throw new ApiError('CONFLICT', 'Results are published for that examination')

  const parsed = rows.map((row: Row) => ({
    email: emailSchema.safeParse(String(row.email ?? '')),
    name: String(row.name ?? '').trim(),
  }))
  const emails = parsed.flatMap((p) => (p.email.success ? [p.email.data] : []))
  const existing = new Map(
    (await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true, role: true, status: true } })).map(
      (u) => [u.email, u]
    )
  )
  const seen = new Set<string>()
  const fresh: Array<{ email: string; name: string }> = []
  const reuse: number[] = []

  const reports: RowReport[] = parsed.map(({ email, name }, index) => {
    const errors: string[] = []
    let note: string | undefined
    if (!email.success) errors.push('Email is not valid')
    else if (seen.has(email.data)) errors.push('Email appears more than once in the file')
    if (name.length > 100) errors.push('Name is longer than 100 characters')
    if (email.success && !errors.length) {
      seen.add(email.data)
      const account = existing.get(email.data)
      if (!account) fresh.push({ email: email.data, name })
      else if (!exam) errors.push('An account with this email already exists')
      else if (account.role !== 'CANDIDATE' || account.status !== 'ACTIVE') errors.push('This account is not an active candidate')
      else {
        reuse.push(account.id)
        note = 'Existing account: will only be enrolled'
      }
    }
    return { row: index + 1, summary: email.success ? email.data : String(rows[index].email ?? ''), errors, note }
  })

  const report = result(reports)
  if (!request.commit || report.invalid) return report

  // Hashing is slow on purpose, so it happens before the transaction opens
  const accounts = await Promise.all(
    fresh.map(async (person) => {
      const password = temporaryPassword()
      return { ...person, password, passwordHash: await hashPassword(password) }
    })
  )
  const enrolled = await prisma.$transaction(
    async (tx) => {
      const ids = [...reuse]
      for (const account of accounts) {
        const created = await tx.user.create({
          data: { email: account.email, name: account.name || null, role: 'CANDIDATE', passwordHash: account.passwordHash, mustChangePassword: true },
          select: { id: true },
        })
        ids.push(created.id)
      }
      const added = exam
        ? (await tx.enrollment.createMany({ data: ids.map((candidateId) => ({ examId: exam.id, candidateId })), skipDuplicates: true })).count
        : 0
      await audit(tx, actor.id, 'candidates_imported', exam ? 'exam' : 'user', exam?.id ?? actor.id, { created: accounts.length, enrolled: added })
      return added
    },
    { timeout: 60_000 }
  )
  // Each new candidate is emailed their sign-in details; the list below stays as a backup
  void deliverCredentialsBatch(accounts.map((a) => ({ email: a.email, password: a.password, name: a.name }))).catch((error) => console.error('Credential batch failed:', error))
  return {
    ...report,
    committed: true,
    created: accounts.length,
    enrolled,
    passwords: accounts.map((a) => ({ email: a.email, temporaryPassword: a.password })),
  }
}

/** Questions go into the importer's own bank; unknown topic names are created. */
export async function importQuestions(actor: Actor, request: ImportRequest) {
  rateLimit(`import:${actor.id}`, 30, 60_000)
  const rows = read(request)
  const topics = new Map(
    (await prisma.topic.findMany({ where: { ownerId: actor.id } })).map((t) => [t.name.toLowerCase(), t.id])
  )
  const accepted: Array<{ topic: string; input: QuestionInput }> = []

  const reports: RowReport[] = rows.map((row, index) => {
    const topic = String(row.topic ?? '').trim()
    const check = questionSchema.safeParse(toQuestion(row, 1))
    const errors = check.success ? [] : check.error.issues.map((i) => `${i.path.join('.') || 'row'}: ${i.message}`)
    if (!topic || topic.length > 80) errors.unshift('topic: name a topic of up to 80 characters')
    if (check.success && !errors.length) accepted.push({ topic, input: check.data })
    return {
      row: index + 1,
      summary: String(row.text ?? '').slice(0, 90),
      errors,
      note: topic && !topics.has(topic.toLowerCase()) ? `New topic: ${topic}` : undefined,
    }
  })

  const report = result(reports)
  if (!request.commit || report.invalid) return report

  await prisma.$transaction(
    async (tx) => {
      for (const { topic, input } of accepted) {
        let topicId = topics.get(topic.toLowerCase())
        if (!topicId) {
          topicId = (await tx.topic.create({ data: { ownerId: actor.id, name: topic } })).id
          topics.set(topic.toLowerCase(), topicId)
        }
        await tx.question.create({
          data: {
            ownerId: actor.id,
            topicId,
            type: input.type,
            difficulty: input.difficulty,
            currentText: input.text,
            versions: {
              create: {
                version: 1,
                text: input.text,
                marks: input.marks,
                options: input.type === 'WRITTEN' ? [] : input.options.map((o, i) => ({ id: `o${i + 1}`, ...o })),
                scoringRule: input.type === 'MULTIPLE_CHOICE' ? input.scoringRule : 'ALL_OR_NOTHING',
                guidance: input.type === 'WRITTEN' ? input.guidance || null : null,
                maxLength: input.type === 'WRITTEN' ? (input.maxLength ?? null) : null,
              },
            },
          },
        })
      }
      await audit(tx, actor.id, 'questions_imported', 'question', actor.id, { created: accepted.length })
    },
    { timeout: 60_000 }
  )
  return { ...report, committed: true, created: accepted.length }
}

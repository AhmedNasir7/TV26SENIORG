/**
 * Verifiable result reports. A report is a signed snapshot with a random code. Anyone holding the
 * code can ask whether it is still true; they learn the examination, a masked name, the score and the
 * issue date, and nothing else.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { Report } from '@/lib/services/report'

export type Snapshot = {
  exam: string
  candidate: string
  score: number | null
  maximum: number
  passed: boolean | null
  submittedAt: string | null
  marks: Array<[number, number | null, number]>
}

export const snapshotOf = (report: Report): Snapshot => ({
  exam: report.exam.title,
  candidate: report.candidate,
  score: report.score,
  maximum: report.maximum,
  passed: report.passed,
  submittedAt: report.submittedAt,
  marks: report.questions.map((q) => [q.position, q.marks, q.maximum]),
})

// Rebuilt field by field: the database may return object keys in another order
const canonical = (s: Snapshot) => JSON.stringify([s.exam, s.candidate, s.score, s.maximum, s.passed, s.submittedAt, s.marks])

// A key of its own, derived from the server secret
const sign = (snapshot: Snapshot) =>
  createHmac('sha256', createHmac('sha256', process.env.JWT_SECRET!).update('result-report').digest()).update(canonical(snapshot)).digest('hex')

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

// No look-alike characters, so a code can be typed from paper
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = () => Array.from(randomBytes(20), (byte) => ALPHABET[byte % ALPHABET.length]).join('')

/** The current report for a result: reused while nothing has changed, otherwise a new one. */
export async function issueReport(report: Report) {
  const snapshot = snapshotOf(report)
  const signature = sign(snapshot)
  const latest = await prisma.resultReport.findFirst({ where: { attemptId: report.attemptId }, orderBy: { id: 'desc' } })
  if (latest && !latest.revokedAt && latest.signature === signature) return latest
  return prisma.resultReport.create({
    data: { attemptId: report.attemptId, verificationCode: newCode(), payload: snapshot as unknown as Prisma.InputJsonObject, signature },
  })
}

const mask = (name: string) =>
  name
    .split('@')[0]
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + '•••')
    .join(' ')

export type Verdict = 'valid' | 'superseded' | 'withdrawn' | 'revoked' | 'invalid' | 'unknown'

export async function verifyCode(code: string) {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const stored = clean.length === 20 ? await prisma.resultReport.findUnique({
    where: { verificationCode: clean },
    include: { attempt: { select: { exam: { select: { resultsPublishedAt: true } } } } },
  }) : null
  if (!stored) return { verdict: 'unknown' as Verdict }

  const snapshot = stored.payload as unknown as Snapshot
  if (!same(sign(snapshot), stored.signature)) return { verdict: 'invalid' as Verdict }

  const { candidateReport } = await import('@/lib/services/report')
  const current = snapshotOf(await candidateReport(stored.attemptId))
  const newer = await prisma.resultReport.count({ where: { attemptId: stored.attemptId, id: { gt: stored.id } } })
  const verdict: Verdict = stored.revokedAt
    ? 'revoked'
    : !stored.attempt.exam.resultsPublishedAt
      ? 'withdrawn'
      : newer || !same(sign(current), stored.signature)
        ? 'superseded'
        : 'valid'
  return {
    verdict,
    exam: snapshot.exam,
    candidate: mask(snapshot.candidate),
    score: snapshot.score,
    maximum: snapshot.maximum,
    issuedAt: stored.issuedAt.toISOString(),
  }
}

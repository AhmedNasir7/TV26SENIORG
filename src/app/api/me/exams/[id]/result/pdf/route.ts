import { requireUser } from '@/lib/auth'
import { parseInput, route } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { pdfResponse, resultPdf } from '@/lib/services/pdf'
import { candidateResult } from '@/lib/services/report'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(['CANDIDATE'])
  rateLimit(`pdf:${actor.id}`, 20, 60_000)
  const report = await candidateResult(actor, parseInput((await params).id, idSchema))
  // The printed report never carries the answer key
  const plain = { ...report, questions: report.questions.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o, correct: null })) })) }
  return pdfResponse(await resultPdf(plain), `result-${report.attemptId}`)
})

import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { pdfResponse, summaryPdf } from '@/lib/services/pdf'
import { staffReport } from '@/lib/services/report'
import { examResults } from '@/lib/services/results'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

/** `?all=1` appends every submitted paper (up to 200) after the summary. */
export const GET = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  rateLimit(`pdf-all:${actor.id}`, 6, 60_000)
  const id = parseInput((await params).id, idSchema)
  const results = await examResults(actor, id)
  const papers = []
  if (new URL(request.url).searchParams.get('all') === '1') {
    for (const attempt of results.attempts.filter((a) => a.state !== 'Running').slice(0, 200)) {
      papers.push(await staffReport(actor, id, attempt.id))
    }
  }
  return pdfResponse(await summaryPdf(results, papers), `exam-${id}-summary`)
})

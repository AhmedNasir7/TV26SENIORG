import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { pdfResponse, resultPdf } from '@/lib/services/pdf'
import { staffReport } from '@/lib/services/report'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string; attemptId: string }> }

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  rateLimit(`pdf:${actor.id}`, 30, 60_000)
  const { id, attemptId } = await params
  const report = await staffReport(actor, parseInput(id, idSchema), parseInput(attemptId, idSchema))
  return pdfResponse(await resultPdf(report), `paper-${report.attemptId}`)
})

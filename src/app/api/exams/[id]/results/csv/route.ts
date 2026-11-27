import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { examResults } from '@/lib/services/results'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

// A leading =, +, - or @ would run as a formula in a spreadsheet
const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""').replace(/^([=+\-@\t\r])/, "'$1")}"`

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { attempts } = await examResults(actor, id)
  const lines = [['Name', 'Email', 'State', 'Score', 'Maximum', 'Passed', 'Submitted'], ...attempts.map((a) => [a.name, a.email, a.state, a.score, a.maximum, a.passed === null ? '' : a.passed ? 'yes' : 'no', a.submittedAt])]
  return new Response(lines.map((line) => line.map(cell).join(',')).join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="exam-${id}-results.csv"`, 'Cache-Control': 'private, no-store' },
  })
})

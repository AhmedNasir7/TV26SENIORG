import { requireUser } from '@/lib/auth'
import { APP_NAME } from '@/lib/config'
import { parseInput, route } from '@/lib/server/api'
import { runtimeEnv } from '@/lib/server/runtime-env'
import { getCandidateExam } from '@/lib/services/access'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '')
const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n')

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(['CANDIDATE'])
  const { exam } = await getCandidateExam(actor, parseInput((await params).id, idSchema))
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${APP_NAME}//Examinations//EN`, 'BEGIN:VEVENT',
    `UID:exam-${exam.id}-${actor.id}@${APP_NAME.toLowerCase()}`, `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(exam.startsAt)}`, `DTEND:${stamp(exam.access.closesAt)}`, `SUMMARY:${escape(exam.title)}`,
    `DESCRIPTION:${escape(`Examination window. ${runtimeEnv('NEXT_PUBLIC_APP_URL') ?? ''}/login`)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Examination in one hour', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ]
  return new Response(lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="exam-${exam.id}.ics"`, 'Cache-Control': 'private, no-store' },
  })
})

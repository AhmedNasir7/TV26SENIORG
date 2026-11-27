/**
 * Deletes the demo examiners' examinations, attempts, questions and topics so the demo seed can
 * rebuild them. Accounts are kept. Destructive: nothing runs unless you ask for it explicitly.
 * Run:  RESET_DEMO=yes pnpm run reset:demo   then   DEMO_PASSWORD=... pnpm run seed:demo
 */
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

const DEMO_OWNERS = ['examiner.demo@secureexam.test', 'examiner2.demo@secureexam.test']

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to reset in production')
  if (process.env.RESET_DEMO !== 'yes') throw new Error('This deletes demo data. Set RESET_DEMO=yes to continue.')

  const owner = { owner: { email: { in: DEMO_OWNERS } } }
  // Order matters: results and attempts are protected from cascading deletes
  const [reports, attempts, exams, versions, questions, topics] = await prisma.$transaction([
    prisma.resultReport.deleteMany({ where: { attempt: { exam: owner } } }),
    prisma.attempt.deleteMany({ where: { exam: owner } }),
    prisma.exam.deleteMany({ where: owner }),
    prisma.questionVersion.deleteMany({ where: { question: owner } }),
    prisma.question.deleteMany({ where: owner }),
    prisma.topic.deleteMany({ where: owner }),
  ])
  console.log(
    `Removed ${exams.count} exams, ${attempts.count} attempts, ${reports.count} reports, ` +
      `${questions.count} questions (${versions.count} versions), ${topics.count} topics`
  )
}

main()
  .catch((error) => {
    console.error('Reset failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

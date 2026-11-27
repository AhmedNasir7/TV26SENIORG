/**
 * Fills a database with fictional demo data: accounts, 64 questions, four examinations and results.
 * Run:  DEMO_PASSWORD=... pnpm run seed:demo
 * Safe to re-run: nothing is deleted, existing records are kept, and unattempted exam windows move to "now".
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'
import { EXAM_PLANS, seedExam, seedQuestions } from './demo/content'
import { seedAttempts } from './demo/attempts'
import type { Role } from '../src/lib/roles'

const NAMES = [
  'Ayesha Khan', 'Bilal Ahmed', 'Hira Malik', 'Usman Tariq', 'Fatima Noor', 'Hamza Sheikh', 'Zainab Ali', 'Saad Qureshi',
  'Maryam Iqbal', 'Ali Raza', 'Noor Fatima', 'Danish Mehmood', 'Sana Javed', 'Omar Farooq', 'Iqra Aslam', 'Talha Nadeem',
  'Mahnoor Butt', 'Ahsan Siddiqui', 'Rabia Anwar', 'Faizan Akhtar', 'Amna Rashid', 'Shahzaib Hassan', 'Kiran Shafiq',
  'Waleed Zafar', 'Laiba Imran', 'Arslan Yousaf', 'Nimra Sohail', 'Huzaifa Khalid', 'Eman Waseem', 'Moiz Abbasi',
]

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Refusing to add demo accounts in production. Set ALLOW_DEMO_SEED=true if you really mean it.')
  }
  const password = process.env.DEMO_PASSWORD
  if (!password || password.length < 8) throw new Error('Set DEMO_PASSWORD (at least 8 characters)')
  const passwordHash = await bcrypt.hash(password, 12)

  // Existing accounts keep their own password: only missing ones are created
  const account = (email: string, name: string, role: Role) =>
    prisma.user.upsert({ where: { email }, update: {}, create: { email, name, role, passwordHash } })

  await account('admin.demo@secureexam.test', 'Demo Admin', 'ADMIN')
  const examiner = await account('examiner.demo@secureexam.test', 'Demo Examiner', 'EXAMINER')
  await account('examiner2.demo@secureexam.test', 'Second Examiner', 'EXAMINER')

  const candidates = [await account('candidate.demo@secureexam.test', 'Demo Candidate', 'CANDIDATE')]
  for (const [index, name] of NAMES.entries()) {
    const number = String(index + 1).padStart(2, '0')
    candidates.push(await account(`candidate${number}@secureexam.test`, name, 'CANDIDATE'))
  }
  const ids = candidates.map((c) => c.id)

  await seedQuestions(examiner.id)

  const midterm = await seedExam(examiner.id, EXAM_PLANS.completed, ids.slice(0, 28))
  await seedAttempts(midterm, examiner.id, ids.slice(0, 25)) // three enrolled candidates were absent
  await seedExam(examiner.id, EXAM_PLANS.live, ids.slice(0, 20))
  await seedExam(examiner.id, EXAM_PLANS.upcoming, ids)
  await seedExam(examiner.id, EXAM_PLANS.draft, [])

  const [users, questions, exams, attempts] = await Promise.all([
    prisma.user.count(),
    prisma.question.count(),
    prisma.exam.count(),
    prisma.attempt.count(),
  ])
  console.log(`Demo data ready: ${users} users, ${questions} questions, ${exams} exams, ${attempts} attempts`)
}

main()
  .catch((error) => {
    console.error('Demo seed failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

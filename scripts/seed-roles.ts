/**
 * Seeds 2 test accounts per role (admin, examiner, candidate) from env vars.
 * The first admin reuses ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_NAME (see seed-admin.ts);
 * the rest use ADMIN2_*, TEACHER1_*, TEACHER2_*, STUDENT1_*, STUDENT2_*.
 * Run: pnpm run seed:roles
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'
import type { Role } from '../src/lib/roles'

type SeedAccount = {
  role: Role
  emailVar: string
  passwordVar: string
  nameVar: string
  defaultName: string
}

const ACCOUNTS: SeedAccount[] = [
  { role: 'ADMIN', emailVar: 'ADMIN_EMAIL', passwordVar: 'ADMIN_PASSWORD', nameVar: 'ADMIN_NAME', defaultName: 'Admin' },
  { role: 'ADMIN', emailVar: 'ADMIN2_EMAIL', passwordVar: 'ADMIN2_PASSWORD', nameVar: 'ADMIN2_NAME', defaultName: 'Admin Two' },
  { role: 'EXAMINER', emailVar: 'TEACHER1_EMAIL', passwordVar: 'TEACHER1_PASSWORD', nameVar: 'TEACHER1_NAME', defaultName: 'Teacher One' },
  { role: 'EXAMINER', emailVar: 'TEACHER2_EMAIL', passwordVar: 'TEACHER2_PASSWORD', nameVar: 'TEACHER2_NAME', defaultName: 'Teacher Two' },
  { role: 'CANDIDATE', emailVar: 'STUDENT1_EMAIL', passwordVar: 'STUDENT1_PASSWORD', nameVar: 'STUDENT1_NAME', defaultName: 'Student One' },
  { role: 'CANDIDATE', emailVar: 'STUDENT2_EMAIL', passwordVar: 'STUDENT2_PASSWORD', nameVar: 'STUDENT2_NAME', defaultName: 'Student Two' },
]

async function seedAccount({ role, emailVar, passwordVar, nameVar, defaultName }: SeedAccount) {
  const email = process.env[emailVar]
  const password = process.env[passwordVar]
  const name = process.env[nameVar] ?? defaultName

  if (!email?.trim()) {
    console.error(`Missing ${emailVar} in .env — skipping ${role} account`)
    return
  }
  if (!password?.trim() || password.length < 8) {
    console.error(`${passwordVar} missing or too short (min 8 chars) — skipping ${role} account`)
    return
  }

  const trimmedEmail = email.trim().toLowerCase()
  const hashedPassword = await bcrypt.hash(password, 12)

  const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } })

  if (existing) {
    await prisma.user.update({
      where: { email: trimmedEmail },
      data: {
        passwordHash: hashedPassword,
        name: name.trim() || existing.name,
        role,
        status: 'ACTIVE',
        failedLogins: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    })
    console.log(`Updated ${role}: ${trimmedEmail}`)
  } else {
    await prisma.user.create({
      data: { email: trimmedEmail, name: name.trim() || null, passwordHash: hashedPassword, role },
    })
    console.log(`Created ${role}: ${trimmedEmail}`)
  }
}

async function main() {
  for (const account of ACCOUNTS) {
    await seedAccount(account)
  }
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})

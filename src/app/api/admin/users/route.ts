import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { hashPassword } from '@/lib/auth'
import { randomInt } from 'node:crypto'
import { escapeHtml, getMailer } from '@/lib/server/email'

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomInt(chars.length))
  }
  return result
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ users })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { email, name } = body as { email?: string; name?: string }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()

    const password = generatePassword()
    const hashedPassword = await hashPassword(password)

    // Create user in transaction - check for duplicates atomically
    let user
    try {
      user = await prisma.$transaction(async (tx) => {
        // Check for existing user inside transaction to prevent race conditions
        const existing = await tx.user.findUnique({
          where: { email: trimmedEmail },
        })
        if (existing) {
          throw new Error('DUPLICATE_USER')
        }

        return await tx.user.create({
          data: {
            email: trimmedEmail,
            name: (typeof name === 'string' && name.trim()) ? name.trim() : null,
            passwordHash: hashedPassword,
            mustChangePassword: true,
            role: 'CANDIDATE',
          },
        })
      })
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'DUPLICATE_USER') {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        )
      }
      throw e // Re-throw other errors
    }

    // Email is optional. If it can't be sent, the administrator gets the password once instead.
    let emailed = false
    const mailer = getMailer()
    if (mailer) {
      const { error } = await mailer.resend.emails.send({
        from: mailer.from,
        to: trimmedEmail,
        subject: 'Your SecureExam account credentials',
        html: `
          <h2>Your SecureExam account has been created</h2>
          <p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
          <p><strong>Temporary password:</strong> <code>${escapeHtml(password)}</code></p>
          <p>Change it after you sign in.</p>
        `,
      })
      if (error) console.error('Resend error:', error)
      emailed = !error
    }

    return NextResponse.json({
      message: emailed ? 'User created and credentials sent by email' : 'User created. Share the temporary password.',
      temporaryPassword: emailed ? undefined : password,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

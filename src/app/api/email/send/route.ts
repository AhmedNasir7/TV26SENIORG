import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getMailer } from '@/lib/server/email'

export async function POST(request: NextRequest) {
  try {
    // Administrators only: an open sender would let any account email anyone as us.
    const user = await requireAdmin()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const mailer = getMailer()
    if (!mailer) {
      return NextResponse.json({ error: 'Email is not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { subject, html, to } = body

    const recipientEmail = to || user.email

    if (!subject || !html) {
      return NextResponse.json(
        { error: 'Subject and HTML content are required' },
        { status: 400 }
      )
    }

    const { data, error } = await mailer.resend.emails.send({
      from: mailer.from,
      to: recipientEmail,
      subject: subject,
      html: html,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Email sent successfully',
        data: data,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


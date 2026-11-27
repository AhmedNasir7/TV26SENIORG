import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { addCalendarEvent, createOAuthClient, parseCalendarRequest } from '@/lib/calendar'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.redirect(new URL('/login', req.url))

    const client = createOAuthClient()
    if (!client) return NextResponse.json({ error: 'Google Calendar is not configured' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const event = parseCalendarRequest(searchParams.get('title'), searchParams.get('date'), searchParams.get('remind'))

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { googleRefreshToken: true },
    })

    if (dbUser?.googleRefreshToken) {
      client.setCredentials({ refresh_token: dbUser.googleRefreshToken })
      await addCalendarEvent(client, event)
      return NextResponse.redirect(new URL('/profile?calendar=added', req.url))
    }

    // The random nonce ties Google's redirect back to this browser (blocks forged callbacks)
    const nonce = randomBytes(16).toString('hex')
    const response = NextResponse.redirect(
      client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
        prompt: 'consent',
        state: new URLSearchParams({ nonce, ...event }).toString(),
      })
    )
    response.cookies.set('calendar-nonce', nonce, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.nextUrl.protocol === 'https:',
      maxAge: 600,
      path: '/api/calendar',
    })
    return response
  } catch (error) {
    console.error('Calendar auth error:', error)
    return NextResponse.json({ error: 'Could not add the calendar event' }, { status: 500 })
  }
}

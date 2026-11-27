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
    const code = searchParams.get('code')
    const state = new URLSearchParams(searchParams.get('state') || '')
    const nonce = req.cookies.get('calendar-nonce')?.value

    if (!code || !nonce || state.get('nonce') !== nonce) {
      return NextResponse.json({ error: 'Invalid calendar sign-in. Start again.' }, { status: 400 })
    }

    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    if (tokens.refresh_token) {
      await prisma.user.update({
        where: { id: user.id },
        data: { googleRefreshToken: tokens.refresh_token },
      })
    }

    await addCalendarEvent(client, parseCalendarRequest(state.get('title'), state.get('date'), state.get('remind')))

    const response = NextResponse.redirect(new URL('/profile?calendar=added', req.url))
    response.cookies.delete({ name: 'calendar-nonce', path: '/api/calendar' })
    return response
  } catch (error) {
    console.error('Calendar callback error:', error)
    return NextResponse.json({ error: 'Could not add the calendar event' }, { status: 500 })
  }
}

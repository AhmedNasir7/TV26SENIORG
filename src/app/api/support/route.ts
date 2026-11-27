import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { notifyStaff } from '@/lib/support'
import { humanCheckResponse } from '@/lib/server/turnstile'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messages = await prisma.supportMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching support messages:', error)
    return NextResponse.json({ error: 'Failed to load support messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const refused = await humanCheckResponse(request, 'support')
    if (refused) return refused

    const body = await request.json()
    const { subject, message } = body

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
    }

    const supportMessage = await prisma.supportMessage.create({
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        subject: subject.trim(),
        message: message.trim(),
      },
    })

    await logActivity({
      action: 'system_event',
      entityType: 'system',
      userId: user.id,
      metadata: { event: 'support_message_created', supportMessageId: supportMessage.id, subject: supportMessage.subject },
    })

    await notifyStaff({
      title: 'New support message',
      message: `${user.email} sent: "${supportMessage.subject}"`,
      entityId: supportMessage.id,
    })

    return NextResponse.json({ message: 'Support message submitted', supportMessage }, { status: 201 })
  } catch (error) {
    console.error('Error creating support message:', error)
    return NextResponse.json({ error: 'Failed to submit support message' }, { status: 500 })
  }
}

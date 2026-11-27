import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/admin'
import { logActivity, notifyUser } from '@/lib/activity'
import { sendSupportResponseEmail } from '@/lib/support'

export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff()
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = new URL(request.url).searchParams.get('status')

    const messages = await prisma.supportMessage.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { respondedBy: { select: { id: true, email: true, name: true } } },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching support messages (admin):', error)
    return NextResponse.json({ error: 'Failed to load support messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff()
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, response } = body

    if (!id || !response?.trim()) {
      return NextResponse.json({ error: 'Message ID and response are required' }, { status: 400 })
    }

    const existing = await prisma.supportMessage.findUnique({ where: { id: Number(id) } })
    if (!existing) {
      return NextResponse.json({ error: 'Support message not found' }, { status: 404 })
    }

    const updated = await prisma.supportMessage.update({
      where: { id: Number(id) },
      data: {
        response: response.trim(),
        status: 'resolved',
        respondedById: staff.id,
      },
    })

    try {
      await sendSupportResponseEmail({
        to: existing.email,
        subject: existing.subject,
        originalMessage: existing.message,
        response: response.trim(),
      })
    } catch (emailError) {
      console.error('Failed to send support response email:', emailError)
    }

    if (existing.userId) {
      await notifyUser({
        userId: existing.userId,
        title: 'Your support message was answered',
        message: `Re: ${existing.subject}`,
        type: 'support_message_resolved',
        entityType: 'support_message',
        entityId: existing.id,
      })
    }

    await logActivity({
      action: 'system_event',
      entityType: 'system',
      userId: staff.id,
      metadata: { event: 'support_message_resolved', supportMessageId: existing.id, subject: existing.subject },
    })

    return NextResponse.json({ message: 'Response sent', supportMessage: updated })
  } catch (error) {
    console.error('Error responding to support message:', error)
    return NextResponse.json({ error: 'Failed to send response' }, { status: 500 })
  }
}

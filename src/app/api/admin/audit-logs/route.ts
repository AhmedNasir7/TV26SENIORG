import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import type { ActivityLogWhereInput } from '@/generated/prisma/models'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const email = url.searchParams.get('email')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const page = Math.max(1, Number(url.searchParams.get('page') || 1))
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 25)))

    const where: ActivityLogWhereInput = {}
    if (action) where.action = action
    if (email) where.user = { email: { contains: email, mode: 'insensitive' } }
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const [logs, total, actions] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, email: true, name: true, role: true } } },
      }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      actions: actions.map((a) => a.action),
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Failed to load audit logs' }, { status: 500 })
  }
}

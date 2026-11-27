import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseInput, route } from '@/lib/server/api'
import type { ActivityLogWhereInput } from '@/generated/prisma/models'

const day = z.iso.date('Use a date like 2026-11-27')

const querySchema = z.strictObject({
  action: z.string().max(60).optional(),
  email: z.string().trim().max(254).optional(),
  from: day.optional(),
  to: day.optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const GET = route(async (request: Request) => {
  await requireUser(['ADMIN'])
  const params = [...new URL(request.url).searchParams].filter(([, value]) => value !== '')
  const { action, email, from, to, page, limit } = parseInput(Object.fromEntries(params), querySchema)

  const where: ActivityLogWhereInput = {
    action,
    ...(email && { user: { email: { contains: email, mode: 'insensitive' as const } } }),
    // "to" includes that whole day
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(`${from}T00:00:00Z`) }),
        ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
      },
    }),
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
    prisma.activityLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
  ])

  return NextResponse.json(
    {
      logs,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      actions: actions.map((a) => a.action),
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
})

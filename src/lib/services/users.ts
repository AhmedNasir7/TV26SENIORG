import { Prisma } from '@/generated/prisma/client'
import { hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { deliverCredentials, temporaryPassword } from '@/lib/server/credentials'
import type { CreateUserInput, UpdateUserInput, UserListFilter } from '@/lib/validation/users'

const PAGE_SIZE = 20

// The only account fields that ever leave the server: no hashes, tokens or counters
const PUBLIC_FIELDS = {
  id: true,
  email: true,
  username: true,
  name: true,
  role: true,
  status: true,
  mustChangePassword: true,
  lockedUntil: true,
  createdAt: true,
} satisfies Prisma.UserSelect

type Tx = Prisma.TransactionClient

/** Written inside the same transaction as the change, so the two can't drift apart. */
function audit(tx: Tx, actorId: number, action: string, targetId: number, metadata: Prisma.InputJsonObject) {
  return tx.activityLog.create({
    data: { action, entityType: 'user', entityId: targetId, userId: actorId, metadata: JSON.stringify(metadata) },
  })
}

export async function listUsers({ search, role, status, page }: UserListFilter) {
  const where: Prisma.UserWhereInput = {
    role,
    status,
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: PUBLIC_FIELDS,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ])
  return { users, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

/** The administrator may choose the password; otherwise a temporary one is made and shown once. */
export async function createUser(actorId: number, { email, name, role, username, password: chosen, mustChangePassword }: CreateUserInput) {
  const password = chosen ?? temporaryPassword()
  const passwordHash = await hashPassword(password)

  // A duplicate email or username violates a unique constraint and becomes a 409 in route()
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      // A generated password must always be replaced
      data: { email, username: username ?? null, name: name || null, role, passwordHash, mustChangePassword: chosen ? (mustChangePassword ?? true) : true },
      select: PUBLIC_FIELDS,
    })
    await audit(tx, actorId, 'user_created', created.id, { email, role })
    return created
  })

  const emailed = await deliverCredentials(email, password, { name, role, username })
  return { user, emailed, temporaryPassword: emailed || chosen ? undefined : password }
}

export async function updateUser(actorId: number, targetId: number, input: UpdateUserInput) {
  try {
    // Serializable: two administrators can't demote each other at the same moment
    return await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({ where: { id: targetId }, select: PUBLIC_FIELDS })
        if (!target) throw new ApiError('NOT_FOUND', 'User not found')

        const roleChanged = input.role !== undefined && input.role !== target.role
        const statusChanged = input.status !== undefined && input.status !== target.status

        if (targetId === actorId && (roleChanged || statusChanged)) {
          throw new ApiError('CONFLICT', 'You cannot change your own role or status')
        }

        const losesAdmin =
          target.role === 'ADMIN' &&
          target.status === 'ACTIVE' &&
          ((roleChanged && input.role !== 'ADMIN') || input.status === 'DISABLED')
        if (losesAdmin) {
          const others = await tx.user.count({ where: { role: 'ADMIN', status: 'ACTIVE', id: { not: targetId } } })
          if (others === 0) throw new ApiError('CONFLICT', 'At least one active administrator is required')
        }

        const user = await tx.user.update({
          where: { id: targetId },
          data: {
            ...(input.name !== undefined && { name: input.name || null }),
            role: input.role,
            status: input.status,
            ...(input.unlock && { failedLogins: 0, lockedUntil: null }),
            // New role or status: every existing session of this account ends now
            ...((roleChanged || statusChanged) && { sessionVersion: { increment: 1 } }),
          },
          select: PUBLIC_FIELDS,
        })

        await audit(tx, actorId, 'user_updated', targetId, {
          email: target.email,
          ...(roleChanged && { role: { from: target.role, to: user.role } }),
          ...(statusChanged && { status: { from: target.status, to: user.status } }),
          ...(input.name !== undefined && { name: { from: target.name, to: user.name } }),
          ...(input.unlock && { unlocked: true }),
        })
        return user
      },
      { isolationLevel: 'Serializable' }
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new ApiError('CONFLICT', 'Someone else changed this at the same time. Try again.')
    }
    throw error
  }
}

export async function resetPassword(actorId: number, targetId: number) {
  if (targetId === actorId) {
    throw new ApiError('CONFLICT', 'Use "Change password" for your own account')
  }
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { email: true } })
  if (!target) throw new ApiError('NOT_FOUND', 'User not found')

  const password = temporaryPassword()
  const passwordHash = await hashPassword(password)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetId },
      data: {
        passwordHash,
        mustChangePassword: true,
        failedLogins: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    })
    await audit(tx, actorId, 'user_password_reset', targetId, { email: target.email })
  })

  const emailed = await deliverCredentials(target.email, password)
  return { emailed, temporaryPassword: emailed ? undefined : password }
}

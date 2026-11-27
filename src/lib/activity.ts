import { prisma } from './prisma'
import { pingChannel } from './pusher/server'

export type ActivityAction =
  | 'user_registered'
  | 'user_logged_in'
  | 'user_logged_out'
  | 'admin_login'
  | 'account_locked'
  | 'password_changed'
  | 'user_created'
  | 'user_updated'
  | 'user_password_reset'
  | 'question_created'
  | 'question_updated'
  | 'question_archived'
  | 'exam_questions_updated'
  | 'exam_created'
  | 'attempt_started'
  | 'attempt_submitted'
  | 'exam_updated'
  | 'exam_published'
  | 'exam_unpublished'
  | 'exam_deleted'
  | 'exam_duplicated'
  | 'enrollment_added'
  | 'enrollment_removed'
  | 'extra_time_granted'
  | 'answer_graded'
  | 'results_published'
  | 'results_unpublished'
  | 'monitoring_updated'
  | 'announcement_sent'
  | 'incident_reviewed'
  | 'system_event'

type LogActivityParams = {
  action: ActivityAction
  entityType?: 'user' | 'system'
  entityId?: number
  userId?: number
  metadata?: Record<string, unknown>
}

export async function logActivity({ action, entityType, entityId, userId, metadata }: LogActivityParams) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        userId: userId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })
    if (action === 'user_registered') await notifyAdminsOfNewUser(entityId, metadata)
  } catch (error) {
    // Don't throw: activity logging must never break the request that triggered it
    console.error('Failed to log activity:', error)
  }
}

/** In-app notification for one user. Clients pick it up by polling /api/notifications. */
export async function notifyUser({
  userId,
  title,
  message,
  type,
  entityType,
  entityId,
}: {
  userId: number
  title: string
  message: string
  type?: string
  entityType?: string
  entityId?: number
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type ?? null,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
      },
    })
    await pingChannel(`user-notifications-${userId}`, 'new-notification')
    return notification
  } catch (error) {
    console.error('Failed to notify user:', error)
  }
}

async function notifyAdminsOfNewUser(entityId?: number, metadata?: Record<string, unknown>) {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
  const email = typeof metadata?.email === 'string' ? metadata.email : null

  await Promise.all(
    admins.map((admin) =>
      notifyUser({
        userId: admin.id,
        title: 'New account created',
        message: email ? `${email} now has an account.` : 'A new account was created.',
        type: 'user_registered',
        entityType: 'user',
        entityId,
      })
    )
  )
}

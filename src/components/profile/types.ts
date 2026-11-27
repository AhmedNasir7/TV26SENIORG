export type ProfileUser = {
  id: number
  email: string
  name: string | null
  role: string
  imageUrl?: string | null
}

export type NotificationItem = {
  id: number
  title: string
  message: string
  type?: string | null
  entityType?: string | null
  entityId?: number | null
  userId?: number | null
  readAt?: string | null
  createdAt: string
}

export type ProfileTab = 'profile' | 'notifications'

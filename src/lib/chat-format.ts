import type { Author } from '@/components/chat/MessageThread'

export function displayName(author: Author) {
  return author.name?.trim() || author.email.split('@')[0] || 'Anonymous'
}

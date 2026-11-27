import type { viewAttempt } from '@/lib/services/attempts'

export type Attempt = Awaited<ReturnType<typeof viewAttempt>>

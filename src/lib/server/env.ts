import { z } from 'zod'

/** Variables the core application cannot run without. Optional services are checked where used. */
const requiredSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
})

export function assertEnv() {
  const result = requiredSchema.safeParse(process.env)
  if (!result.success) {
    // Names only: never print values
    const missing = result.error.issues.map((issue) => String(issue.path[0])).join(', ')
    throw new Error(`Missing required environment variables: ${missing}. See .env.example.`)
  }
  if (result.data.JWT_SECRET.length < 32) {
    console.warn('JWT_SECRET is shorter than 32 characters. Use a long random value.')
  }
}

import { z } from 'zod'

export const MIN_PASSWORD_LENGTH = 8
// bcrypt ignores everything after 72 bytes
const MAX_PASSWORD_LENGTH = 72

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'))

export const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Use at most ${MAX_PASSWORD_LENGTH} characters`)

export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().min(1, 'Enter your email or username').max(254),
  password: z.string().min(1, 'Password is required').max(200),
})

export const signupSchema = z.strictObject({
  email: emailSchema,
  password: newPasswordSchema,
  name: z.string().trim().max(100).optional(),
  setupCode: z.string().max(200).optional(),
})

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,30}$/, 'Use 3 to 30 letters, numbers, dots, dashes or underscores')

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1, 'Enter your current password').max(200),
    newPassword: newPasswordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'Choose a password you are not already using',
    path: ['newPassword'],
  })

export const profileSchema = z
  .strictObject({
    name: z.string().trim().max(100).nullable().optional(),
  })
  .refine((value) => value.name !== undefined, { message: 'Nothing to update' })

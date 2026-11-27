import { z } from 'zod'
import { ROLES } from '@/lib/roles'
import { emailSchema, newPasswordSchema, usernameSchema } from '@/lib/validation/auth'

const status = z.enum(['ACTIVE', 'DISABLED'])
const displayName = z.string().trim().max(100)

export const idSchema = z.coerce.number().int().positive()

export const userListSchema = z.strictObject({
  search: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  status: status.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
})

export const createUserSchema = z.strictObject({
  email: emailSchema,
  name: displayName.optional(),
  role: z.enum(ROLES),
  username: usernameSchema.optional(),
  password: newPasswordSchema.optional(),
  mustChangePassword: z.boolean().optional(),
})

export const updateUserSchema = z
  .strictObject({
    name: displayName.nullable().optional(),
    role: z.enum(ROLES).optional(),
    status: status.optional(),
    unlock: z.literal(true).optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), { message: 'Nothing to update' })

export type UserListFilter = z.infer<typeof userListSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
}

/** Throw from a route or service: the message is shown to the caller, so keep it safe. */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message)
  }
}

function errorResponse(code: ErrorCode, message: string, fields?: Record<string, string>) {
  return NextResponse.json({ error: { code, message, fields } }, { status: STATUS[code] })
}

/**
 * Wraps a route handler so every failure has one shape and nothing internal leaks.
 * Handler order: authenticate, validate, call a service, respond.
 */
export function route<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error.code, error.message, error.fields)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return errorResponse('CONFLICT', 'That already exists')
      }
      console.error('Unhandled API error:', error)
      return errorResponse('SERVER_ERROR', 'Something went wrong')
    }
  }
}

const MAX_BODY_BYTES = 1024 * 1024

/** Reads and validates a JSON body. Unknown fields are rejected when the schema is strict. */
export async function parseBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
  maxBytes = MAX_BODY_BYTES
): Promise<z.infer<Schema>> {
  const text = await request.text()
  if (Buffer.byteLength(text) > maxBytes) throw new ApiError('BAD_REQUEST', 'Request is too large')

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new ApiError('BAD_REQUEST', 'Invalid JSON')
  }
  return parseInput(json, schema)
}

/** Validates query parameters, path parameters or any other untrusted value. */
export function parseInput<Schema extends z.ZodType>(value: unknown, schema: Schema): z.infer<Schema> {
  const result = schema.safeParse(value)
  if (result.success) return result.data

  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    fields[issue.path.join('.') || 'value'] ??= issue.message
  }
  throw new ApiError('BAD_REQUEST', 'Check the highlighted fields', fields)
}

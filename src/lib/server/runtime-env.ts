/**
 * Reads a setting when the server runs. Next.js replaces a literal `process.env.NEXT_PUBLIC_X` with its
 * value at build time; looking the name up dynamically keeps the server's own .env in charge, so one
 * built image works with whatever the host provides.
 */
export const runtimeEnv = (name: string): string | undefined => process.env[name]

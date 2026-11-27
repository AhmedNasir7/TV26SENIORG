/** Shared by the forms and the server. */
export const TOKEN_HEADER = 'x-turnstile-token'

/** One name per protected form, checked by the server so a token can't be reused elsewhere. */
export type HumanAction = 'login' | 'signup' | 'password' | 'support' | 'email'

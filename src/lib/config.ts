export const APP_NAME = 'Invigil'
export const APP_DESCRIPTION = 'Create, run, monitor and grade online examinations.'

/**
 * Sign-up creates administrators only. It stays closed until a setup code is configured, so a stranger
 * can never make themselves an administrator. Everyone else gets an account from an administrator.
 */
export const isSignupOpen = () => (process.env.ADMIN_SIGNUP_CODE?.length ?? 0) >= 8

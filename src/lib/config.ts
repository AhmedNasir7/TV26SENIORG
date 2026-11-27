export const APP_NAME = 'SecureExam'
export const APP_DESCRIPTION = 'Create, run, monitor and grade online examinations.'

/** Public sign-up is off by default: administrators create accounts. */
export const isSignupOpen = () => process.env.ALLOW_PUBLIC_SIGNUP === 'true'

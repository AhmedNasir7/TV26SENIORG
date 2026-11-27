/** Runs once when the server starts: stop immediately if required configuration is missing. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnv } = await import('./lib/server/env')
    assertEnv()
  }
}

import Pusher from 'pusher'

const hasPusherConfig =
  !!process.env.PUSHER_APP_ID &&
  !!process.env.PUSHER_KEY &&
  !!process.env.PUSHER_SECRET &&
  !!process.env.PUSHER_CLUSTER

export const pusherServer = hasPusherConfig
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID as string,
      key: process.env.PUSHER_KEY as string,
      secret: process.env.PUSHER_SECRET as string,
      cluster: process.env.PUSHER_CLUSTER as string,
      useTLS: true,
    })
  : null

/**
 * Tells subscribers "something changed" without sending any content: these channels are
 * public, so clients re-fetch through the authenticated API. Never throws.
 */
export async function pingChannel(channel: string, event: string) {
  try {
    await pusherServer?.trigger(channel, event, {})
  } catch (error) {
    console.error('Pusher ping failed:', error)
  }
}

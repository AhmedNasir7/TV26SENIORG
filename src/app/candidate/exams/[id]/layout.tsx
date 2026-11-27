import { LiveRoomProvider } from '@/components/live/LiveRoom'

/** The live room stays connected while moving between the examination page and the attempt. */
export default function CandidateExamLayout({ children }: { children: React.ReactNode }) {
  return <LiveRoomProvider>{children}</LiveRoomProvider>
}

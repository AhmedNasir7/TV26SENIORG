import { AttemptScreen } from '@/components/attempt/AttemptScreen'
import { CameraGuard } from '@/components/live/CameraGate'
import { requirePageUser } from '@/lib/auth'
import { loadById } from '@/lib/server/page'
import { getCandidateExam } from '@/lib/services/access'

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser(['CANDIDATE'])
  // Same gate as everywhere else: 404 unless enrolled in a published examination
  const { exam } = await loadById((await params).id, (id) => getCandidateExam(user, id))
  return exam.liveProctor ? (
    <CameraGuard examId={exam.id}>
      <AttemptScreen examId={exam.id} />
    </CameraGuard>
  ) : (
    <AttemptScreen examId={exam.id} />
  )
}

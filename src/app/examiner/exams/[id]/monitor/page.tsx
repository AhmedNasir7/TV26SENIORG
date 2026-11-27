import Link from 'next/link'
import { AnnouncementPanel } from '@/components/monitor/AnnouncementPanel'
import { MonitorBoard } from '@/components/monitor/MonitorBoard'
import { MonitoringSettingsForm } from '@/components/monitor/MonitoringSettingsForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusPill } from '@/components/ui/StatusPill'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { loadById } from '@/lib/server/page'
import { listAnnouncements } from '@/lib/services/announcements'
import { monitorBoard, monitorSettings } from '@/lib/services/monitor'

export default async function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser(STAFF_ROLES)
  const { exam, settings, recordingLocked } = await loadById((await params).id, (id) => monitorSettings(actor, id))
  const [board, announcements] = await Promise.all([
    monitorBoard(actor, exam.id, { page: 1 }),
    listAnnouncements(actor, exam.id),
  ])
  const isDraft = exam.phase === 'DRAFT'

  return (
    <div className="space-y-6 p-8">
      <PageHeader
        status={<StatusPill phase={exam.phase} />}
        title={exam.title}
        description={isDraft ? 'Choose what to record before publishing.' : 'Live progress, indicators and announcements.'}
        actions={<Link href={`/examiner/exams/${exam.id}`} className="btn-secondary px-4 py-2 text-sm">Back to examination</Link>}
      />
      {!isDraft && <MonitorBoard examId={exam.id} initial={board} />}
      <AnnouncementPanel examId={exam.id} initial={announcements} canSend={!isDraft} />
      <MonitoringSettingsForm examId={exam.id} initial={settings} recordingLocked={recordingLocked} />
    </div>
  )
}

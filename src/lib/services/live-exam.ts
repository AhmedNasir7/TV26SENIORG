/**
 * Live camera examinations. When an examination is live, a candidate must be in its video room before
 * the attempt can start, staff watch the room, and the session is recorded.
 */
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import * as hms from '@/lib/server/hms-api'
import { serverNow } from '@/lib/server/time'
import { audit } from '@/lib/services/audit'

/** How early a candidate may join the room to check their camera. */
const EARLY_MS = 30 * 60_000

const userKey = (id: number) => `u${id}`

async function managed(actor: Actor, examId: number) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, ownerId: true, title: true, status: true, endsAt: true, liveProctor: true, liveRoomId: true },
  })
  return ensureFound(exam, (e) => canManageExam(actor, e))
}

export async function liveState(actor: Actor, examId: number) {
  const exam = await managed(actor, examId)
  const configured = hms.liveConfigured()
  let recording = false
  let assets: hms.Asset[] = []
  let problem = ''
  if (configured && exam.liveRoomId) {
    try {
      const [recordings, files] = await Promise.all([hms.listRecordings(exam.liveRoomId), hms.listAssets(exam.liveRoomId)])
      recording = hms.isRecording(recordings)
      assets = files.filter((a) => a.type !== 'chat')
    } catch (error) {
      problem = error instanceof Error ? error.message : 'The video service did not answer'
    }
  }
  return { configured, enabled: exam.liveProctor, recording, assets, problem }
}

export async function setLive(actor: Actor, examId: number, enabled: boolean) {
  const exam = await managed(actor, examId)
  if (enabled && exam.endsAt <= serverNow()) throw new ApiError('CONFLICT', 'This examination has already ended')

  let roomId = exam.liveRoomId
  if (enabled && !roomId) roomId = (await hms.createRoom(`exam-${examId}-${Date.now()}`)).id
  if (!enabled && roomId && hms.liveConfigured()) await hms.stopRecording(roomId).catch(() => {})

  await prisma.$transaction(async (tx) => {
    await tx.exam.update({ where: { id: examId }, data: { liveProctor: enabled, liveRoomId: roomId } })
    await audit(tx, actor.id, enabled ? 'exam_live_on' : 'exam_live_off', 'exam', examId, {})
    if (enabled && exam.status === 'PUBLISHED') {
      await tx.announcement.create({
        data: { examId, authorId: actor.id, message: 'This examination is now live. Turn your camera on and join before you continue. The session is recorded.' },
      })
    }
  })
  return liveState(actor, examId)
}

export async function staffPass(actor: Actor, examId: number) {
  const exam = await managed(actor, examId)
  if (!exam.liveProctor || !exam.liveRoomId) throw new ApiError('CONFLICT', 'Turn live mode on first')
  const [roles, user] = await Promise.all([hms.roomRoles(), prisma.user.findUniqueOrThrow({ where: { id: actor.id }, select: { name: true, email: true } })])
  return { token: hms.joinToken(exam.liveRoomId, userKey(actor.id), roles.staff), name: `Examiner: ${user.name || user.email}` }
}

function enrolment(candidateId: number, examId: number) {
  return prisma.enrollment.findFirst({
    where: { candidateId, examId, exam: { status: 'PUBLISHED' } },
    select: { extraMinutes: true, candidate: { select: { name: true, email: true } }, exam: { select: { liveProctor: true, liveRoomId: true, startsAt: true, endsAt: true } } },
  })
}

export async function candidatePass(actor: Actor, examId: number) {
  const found = await enrolment(actor.id, examId)
  if (!found) throw new ApiError('NOT_FOUND', 'Not found')
  const { exam, candidate, extraMinutes } = found
  if (!exam.liveProctor || !exam.liveRoomId) throw new ApiError('CONFLICT', 'This examination is not live')
  const now = serverNow().getTime()
  if (now < exam.startsAt.getTime() - EARLY_MS) throw new ApiError('CONFLICT', 'The room opens 30 minutes before the examination')
  if (now > exam.endsAt.getTime() + extraMinutes * 60_000) throw new ApiError('CONFLICT', 'The examination has closed')
  const roles = await hms.roomRoles()
  return { token: hms.joinToken(exam.liveRoomId, userKey(actor.id), roles.candidate), name: candidate.name || candidate.email }
}

/** Refuses to start a live examination unless the video service sees the candidate in the room. */
export async function requirePresence(candidateId: number, examId: number) {
  const found = await enrolment(candidateId, examId)
  if (!found?.exam.liveProctor || !found.exam.liveRoomId) return
  // The room list can lag a moment behind a join
  for (let attempt = 0; attempt < 4; attempt++) {
    if ((await hms.presentUsers(found.exam.liveRoomId)).has(userKey(candidateId))) return
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  throw new ApiError('CONFLICT', 'Join the live room with your camera on, then start. If you just joined, try again.')
}

/** Starts recording once someone is taking a live examination. A failure never blocks the candidate. */
export async function ensureRecording(examId: number) {
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { liveProctor: true, liveRoomId: true } })
  if (!exam?.liveProctor || !exam.liveRoomId || !hms.liveConfigured()) return
  try {
    if (!hms.isRecording(await hms.listRecordings(exam.liveRoomId))) await hms.startRecording(exam.liveRoomId)
  } catch (error) {
    console.error('Recording did not start:', error instanceof Error ? error.message : error)
  }
}

export async function setRecording(actor: Actor, examId: number, record: boolean) {
  const exam = await managed(actor, examId)
  if (!exam.liveRoomId) throw new ApiError('CONFLICT', 'Turn live mode on first')
  await (record ? hms.startRecording(exam.liveRoomId) : hms.stopRecording(exam.liveRoomId))
  await prisma.$transaction((tx) => audit(tx, actor.id, record ? 'recording_started' : 'recording_stopped', 'exam', examId, {}))
  return liveState(actor, examId)
}

export async function recordingLink(actor: Actor, examId: number, assetId: string) {
  const exam = await managed(actor, examId)
  // Only files of this examination's room, whatever id is asked for
  const owned = exam.liveRoomId && (await hms.listAssets(exam.liveRoomId)).some((a) => a.id === assetId)
  if (!owned) throw new ApiError('NOT_FOUND', 'Not found')
  return hms.assetLink(assetId)
}

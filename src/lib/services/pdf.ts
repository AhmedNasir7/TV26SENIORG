/** PDF result reports, built on the server from the same data the screens show. */
import { formatDateTime, SERVER_ZONE } from '@/lib/format-date'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { APP_NAME } from '@/lib/config'
import { runtimeEnv } from '@/lib/server/runtime-env'
import type { Report } from '@/lib/services/report'
import { issueReport } from '@/lib/services/verification'

type Doc = InstanceType<typeof PDFDocument>

// The built-in fonts cover Western European text; anything else is shown as "?" instead of garbage
const safe = (text: string) => text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[^\t\n -~ -ÿ]/g, '?')

function render(build: (doc: Doc) => Promise<void>) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    build(doc)
      .then(() => {
        const range = doc.bufferedPageRange()
        for (let i = 0; i < range.count; i += 1) {
          doc.switchToPage(i)
          const bottom = doc.page.margins.bottom
          doc.page.margins.bottom = 0 // the footer sits in the margin without adding a page
          doc.fontSize(8).fillColor('#667085').text(`${APP_NAME} · page ${i + 1} of ${range.count}`, 50, doc.page.height - 34, { lineBreak: false })
          doc.page.margins.bottom = bottom
        }
        doc.end()
      })
      .catch(reject)
  })
}

async function resultPages(doc: Doc, report: Report) {
  const issued = await issueReport(report)
  const link = `${runtimeEnv('NEXT_PUBLIC_APP_URL') ?? ''}/verify/${issued.verificationCode}`
  const qr = await QRCode.toBuffer(link, { margin: 0, width: 220 })

  doc.fillColor('#101828').fontSize(10).text(APP_NAME.toUpperCase())
  doc.moveDown(0.5).fontSize(20).text(safe(report.exam.title), { width: 380 })
  doc.fontSize(12).fillColor('#475467').text(safe(report.candidate), { width: 380 })
  doc.image(qr, 445, 50, { width: 100 })
  doc.fontSize(7).text('Scan to verify', 445, 154, { width: 100, align: 'center' })

  doc.fillColor('#101828').fontSize(28).text(report.score === null ? 'Not fully marked' : `${report.score} / ${report.maximum}`, 50, 180)
  if (report.passed !== null) doc.fontSize(12).text(`${report.passed ? 'Passed' : 'Not passed'} (pass mark ${report.passMarks})`)
  doc.fontSize(10).fillColor('#475467')
  if (report.submittedAt) doc.text(`Submitted ${formatDateTime(report.submittedAt, SERVER_ZONE)}`)
  doc.text(`Verification code ${issued.verificationCode}`).text(link, { link }).moveDown()

  for (const q of report.questions) {
    if (doc.y > 720) doc.addPage()
    doc.moveDown(0.6).fillColor('#101828').fontSize(11).text(safe(`${q.position}. ${q.text}`), { width: 495 })
    doc.fontSize(10).fillColor('#475467').text(`${q.marks ?? 'unmarked'} of ${q.maximum} marks`)
    const answer = q.type === 'WRITTEN' ? q.written?.trim() : q.options.filter((o) => o.chosen).map((o) => o.text).join('; ')
    doc.text(safe(`Answer: ${answer || 'none'}`), { width: 495 })
    if (q.feedback) doc.text(safe(`Feedback: ${q.feedback}`), { width: 495 })
  }
}

export const resultPdf = (report: Report) => render((doc) => resultPages(doc, report))

type Summary = {
  exam: { title: string; totalMarks: number; passMarks: number | null }
  summary: Record<string, number | null>
  attempts: Array<{ name: string | null; email: string; state: string; score: number | null; maximum: number }>
}

/** The examination summary; `papers` adds every candidate's report after it. */
export function summaryPdf(results: Summary, papers: Report[] = []) {
  return render(async (doc) => {
    doc.fillColor('#101828').fontSize(10).text(APP_NAME.toUpperCase())
    doc.moveDown(0.5).fontSize(20).text(safe(results.exam.title))
    doc.fontSize(11).fillColor('#475467').text(`Examination summary, ${formatDateTime(new Date(), SERVER_ZONE)}`).moveDown()
    const labels: Array<[string, string]> = [
      ['enrolled', 'Enrolled'], ['attempted', 'Attempted'], ['absent', 'Without an attempt'], ['average', 'Average'],
      ['median', 'Median'], ['highest', 'Highest'], ['lowest', 'Lowest'], ['passRate', 'Pass rate %'],
    ]
    for (const [key, label] of labels) doc.fillColor('#101828').text(`${label}: ${results.summary[key] ?? '-'}`)
    doc.moveDown().fontSize(13).text('Candidates').moveDown(0.3)
    for (const a of results.attempts) {
      if (doc.y > 760) doc.addPage()
      const y = doc.y
      doc.fontSize(10).text(safe(a.name || a.email), 50, y, { width: 270, lineBreak: false })
      doc.text(a.state, 330, y, { width: 110, lineBreak: false })
      doc.text(a.score === null ? '-' : `${a.score} / ${a.maximum}`, 450, y, { width: 95, lineBreak: false })
      doc.moveDown(0.4)
    }
    for (const paper of papers) {
      doc.addPage()
      await resultPages(doc, paper)
    }
  })
}

export const pdfResponse = (body: Buffer, name: string) =>
  new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })

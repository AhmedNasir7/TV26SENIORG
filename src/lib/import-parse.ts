/** Reads CSV or JSON import files into plain rows. Pure, with no imports, so tests can use it. */
export type Row = Record<string, unknown>

export const MAX_IMPORT_ROWS = 200

/** RFC-style CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"' && field === '') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (quoted) throw new Error('A quoted value is never closed')
  if (field !== '' || row.length) rows.push([...row, field])
  return rows.filter((r) => r.some((value) => value.trim() !== ''))
}

export function parseRows(content: string, format: 'csv' | 'json'): Row[] {
  let rows: Row[]
  if (format === 'json') {
    let data: unknown
    try {
      data = JSON.parse(content)
    } catch {
      throw new Error('This is not valid JSON')
    }
    if (!Array.isArray(data) || data.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
      throw new Error('JSON must be a list of objects')
    }
    rows = data as Row[]
  } else {
    const [header, ...body] = parseCsv(content)
    if (!header) throw new Error('The file is empty')
    const names = header.map((name) => name.trim().toLowerCase())
    rows = body.map((cells, index) => {
      if (cells.length > names.length) throw new Error(`Line ${index + 2} has more values than the header`)
      return Object.fromEntries(names.map((name, i) => [name, (cells[i] ?? '').trim()]))
    })
  }
  if (!rows.length) throw new Error('The file has no rows')
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Import at most ${MAX_IMPORT_ROWS} rows at a time`)
  return rows
}

const TYPES: Record<string, string> = { single: 'SINGLE_CHOICE', multiple: 'MULTIPLE_CHOICE', written: 'WRITTEN' }
const text = (value: unknown) => (value === undefined || value === null ? '' : String(value).trim())

/**
 * Turns one row into the shape the question form sends, so imports pass the same validation.
 * `correct` lists option numbers, for example "2" or "1;3".
 */
export function toQuestion(row: Row, topicId: number) {
  const kind = text(row.type).toLowerCase()
  const type = TYPES[kind] ?? kind.toUpperCase()
  const base = {
    type,
    topicId,
    difficulty: text(row.difficulty).toUpperCase(),
    text: text(row.text),
    marks: Number(text(row.marks)),
  }
  if (type === 'WRITTEN') {
    const limit = text(row.maxlength ?? row.maxLength)
    return {
      ...base,
      ...(text(row.guidance) && { guidance: text(row.guidance) }),
      ...(limit && { maxLength: Number(limit) }),
    }
  }
  const listed = Array.isArray(row.options) ? row.options.map(text) : Array.from({ length: 8 }, (_, i) => text(row[`option${i + 1}`]))
  const answer = Array.isArray(row.correct) ? row.correct.join(';') : row.correct
  const correct = new Set(text(answer).split(/[;|\s]+/).filter(Boolean).map(Number))
  const options = listed.map((value, i) => ({ text: value, correct: correct.has(i + 1) })).filter((o) => o.text)
  return {
    ...base,
    options,
    ...(type === 'MULTIPLE_CHOICE' && { scoringRule: text(row.scoring).toLowerCase() === 'partial' ? 'PARTIAL' : 'ALL_OR_NOTHING' }),
  }
}

export const CANDIDATE_TEMPLATE = 'email,name\nstudent.one@example.edu,Student One\nstudent.two@example.edu,Student Two\n'

export const QUESTION_TEMPLATE =
  'type,topic,difficulty,text,marks,option1,option2,option3,option4,correct,scoring,guidance\n' +
  'single,Databases,EASY,"Which key uniquely identifies a row?",2,Primary key,Foreign key,Index,View,1,,\n' +
  'multiple,Databases,MEDIUM,"Pick the ACID properties",4,Atomicity,Isolation,Latency,Durability,1;2;4,partial,\n' +
  'written,Databases,HARD,"Explain third normal form",6,,,,,,,Mention transitive dependency\n'

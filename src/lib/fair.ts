/**
 * Fair randomized papers: every candidate gets the same number of questions and marks in every
 * topic and difficulty cell, and the draw whose overall difficulty is closest to the pool's average
 * is kept, favouring questions used less often. Pure and seeded, so a paper can be reproduced.
 * No imports, so tests can use it.
 */
export type Level = 'EASY' | 'MEDIUM' | 'HARD'
export type Rule = { topicId: number; difficulty: Level; count: number; marks: number }
export type PoolItem = { id: number; cell: string; score: number; uses: number }
export type Cell = { key: string; count: number; marks: number }
export type Pick = { id: number; marks: number; score: number }

const PRIOR: Record<Level, number> = { EASY: 0.8, MEDIUM: 0.55, HARD: 0.3 }
const PRIOR_WEIGHT = 10

export const cellKey = (topicId: number, difficulty: Level) => `${topicId}:${difficulty}`

export const toCells = (rules: Rule[]): Cell[] =>
  rules.map((r) => ({ key: cellKey(r.topicId, r.difficulty), count: r.count, marks: r.marks }))

/** 0 is easiest, 1 hardest: the declared level, moved towards observed results as they accumulate. */
export function difficultyScore(declared: Level, fullMarks: number, sittings: number) {
  const success = (fullMarks + PRIOR[declared] * PRIOR_WEIGHT) / (sittings + PRIOR_WEIGHT)
  return 1 - success
}

/** Marks-weighted difficulty of one paper, from 0 to 1. */
export function paperScore(paper: Pick[]) {
  const total = paper.reduce((sum, p) => sum + p.marks, 0)
  return total ? paper.reduce((sum, p) => sum + p.score * p.marks, 0) / total : 0
}

export function shortfall(cells: Cell[], pool: PoolItem[]) {
  return cells
    .map((cell) => ({ key: cell.key, needed: cell.count, available: pool.filter((p) => p.cell === cell.key).length }))
    .filter((c) => c.available < c.needed)
}

function sample<T>(items: T[], count: number, random: () => number) {
  const copy = [...items]
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(random() * (copy.length - i))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

/** One plain random paper that respects the cells. */
export function drawRandom(cells: Cell[], pool: PoolItem[], random: () => number): Pick[] {
  if (shortfall(cells, pool).length) throw new Error('The question pool is too small for this recipe')
  return cells.flatMap((cell) =>
    sample(pool.filter((p) => p.cell === cell.key), cell.count, random).map((p) => ({ id: p.id, marks: cell.marks, score: p.score }))
  )
}

/** What an average paper from this pool and recipe weighs. */
export function targetScore(cells: Cell[], pool: PoolItem[]) {
  let weighted = 0
  let marks = 0
  for (const cell of cells) {
    const items = pool.filter((p) => p.cell === cell.key)
    if (!items.length) continue
    weighted += (items.reduce((sum, p) => sum + p.score, 0) / items.length) * cell.count * cell.marks
    marks += cell.count * cell.marks
  }
  return marks ? weighted / marks : 0
}

export function drawBalanced(cells: Cell[], pool: PoolItem[], random: () => number, tries = 60): Pick[] {
  const target = targetScore(cells, pool)
  const uses = new Map(pool.map((p) => [p.id, p.uses]))
  const busiest = Math.max(1, ...pool.map((p) => p.uses))
  let best: Pick[] = []
  let cost = Infinity
  for (let i = 0; i < tries; i += 1) {
    const paper = drawRandom(cells, pool, random)
    const exposure = paper.reduce((sum, p) => sum + (uses.get(p.id) ?? 0) / busiest, 0) / (paper.length || 1)
    // Difficulty matters most; exposure only separates papers that are about equally close
    const value = Math.abs(paperScore(paper) - target) + exposure * 0.01
    if (value < cost) {
      cost = value
      best = paper
    }
  }
  return best
}

const round = (value: number) => Math.round(value * 1000) / 10

function describe(papers: Pick[][]) {
  const scores = papers.map(paperScore)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const sd = Math.sqrt(scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length)
  let shared = 0
  for (let i = 1; i < papers.length; i += 1) {
    const before = new Set(papers[i - 1].map((p) => p.id))
    shared += papers[i].filter((p) => before.has(p.id)).length / (papers[i].length || 1)
  }
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  return {
    easiest: round(min),
    hardest: round(max),
    spread: round(max - min),
    deviation: round(sd),
    overlap: round(shared / Math.max(1, papers.length - 1)),
    scores: scores.map(round),
  }
}

/** Many papers drawn both ways, as evidence of what balancing changes. */
export function simulate(cells: Cell[], pool: PoolItem[], papers: number, random: () => number) {
  const used = pool.map((p) => ({ ...p }))
  const byId = new Map(used.map((p) => [p.id, p]))
  const plain = Array.from({ length: papers }, () => drawRandom(cells, pool, random))
  const balanced = Array.from({ length: papers }, () => {
    const paper = drawBalanced(cells, used, random)
    for (const pick of paper) byId.get(pick.id)!.uses += 1
    return paper
  })
  return { target: round(targetScore(cells, pool)), random: describe(plain), balanced: describe(balanced) }
}

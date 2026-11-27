/** How alike two written answers are, by shared three-word phrases (0 to 1). Pure; used by tests. */
export function phrases(text: string) {
  const words = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  return new Set(words.slice(0, -2).map((_, i) => words.slice(i, i + 3).join(' ')))
}

export function similarity(a: string, b: string) {
  const left = phrases(a)
  const right = phrases(b)
  // Very short answers match by chance, so they are never compared
  if (left.size < 5 || right.size < 5) return 0
  let shared = 0
  for (const phrase of left) if (right.has(phrase)) shared += 1
  return Math.round((shared / (left.size + right.size - shared)) * 100) / 100
}

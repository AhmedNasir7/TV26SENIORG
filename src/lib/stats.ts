/** Summary statistics for results. Pure functions with no imports, so tests can use them directly. */
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function summarize(scores: number[]) {
  if (!scores.length) return { count: 0, average: null, median: null, highest: null, lowest: null }
  const sorted = [...scores].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return {
    count: sorted.length,
    average: round(sorted.reduce((sum, s) => sum + s, 0) / sorted.length),
    median: round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2),
    highest: sorted[sorted.length - 1],
    lowest: sorted[0],
  }
}

/** Share of scores at or above the pass mark, as a percentage. */
export function passRate(scores: number[], passMarks: number | null) {
  if (passMarks === null || !scores.length) return null
  return round((scores.filter((s) => s >= passMarks).length / scores.length) * 100)
}

/** Five equal bands of the maximum; full marks fall in the top band. */
export function distribution(scores: number[], maximum: number) {
  const bands = ['0–19%', '20–39%', '40–59%', '60–79%', '80–100%'].map((label) => ({ label, count: 0 }))
  if (maximum <= 0) return bands
  for (const score of scores) bands[Math.min(4, Math.max(0, Math.floor((score / maximum) * 5)))].count += 1
  return bands
}

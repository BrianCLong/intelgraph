export interface ScoreResult {
  scores: Record<string, number>
  breakdown: Record<string, number>
}

export function score(dataset: Record<string, unknown>[], required: string[]): ScoreResult {
  const total = dataset.length
  const completeness =
    total === 0
      ? 1
      : dataset.reduce((acc, item) => {
          const filled = required.filter(f => item[f] !== undefined).length
          return acc + filled / required.length
        }, 0) / total
  return { scores: { completeness }, breakdown: { completeness } }
}

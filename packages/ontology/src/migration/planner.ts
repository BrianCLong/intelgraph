import { MigrationPlan } from '@intelgraph/common-types'

export function planMigration(fromSDL: string, toSDL: string): MigrationPlan {
  const steps: string[] = []
  if (fromSDL.includes('title') && toSDL.includes('headline')) {
    steps.push('rename Document.title -> Document.headline')
  }
  return { steps }
}

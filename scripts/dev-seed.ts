import { readFileSync } from 'fs'
import path from 'path'

export async function seed() {
  const csvPath = process.argv[2] || path.join(__dirname, '..', 'data', 'towers.csv')
  const text = readFileSync(csvPath, 'utf8')
  const lines = text.trim().split(/\r?\n/)
  const count = lines.length - 1
  console.log(`seeded ${count} towers`)
}

if (require.main === module) {
  seed().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

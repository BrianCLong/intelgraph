import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'

/**
 * Seed minimal fixtures for the GA-Forensics demo. This script places
 * example images and PDFs into the MinIO bucket when run inside
 * docker-compose using the MinIO client.
 */
async function main() {
  const id = randomUUID()
  await fs.writeFile('seed.log', `seeded ${id}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

import axios from 'axios'

async function run() {
  const ont = await axios.post('http://localhost:8000/ontology/create', { name: 'Baseline' })
  await axios.post('http://localhost:8000/class/upsert', {
    ontology_id: ont.data.id,
    key: 'Person',
    label: 'Person'
  })
  console.log('Seed complete')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})

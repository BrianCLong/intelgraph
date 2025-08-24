import fetch from 'node-fetch';

async function main() {
  const graphRes = await fetch('http://localhost:8000/graph/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'demo',
      nodeQuery: 'MATCH (n) RETURN n',
      edgeQuery: 'MATCH ()-[e]->() RETURN e'
    })
  });
  const graph = await graphRes.json();
  console.log('Registered graph', graph);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

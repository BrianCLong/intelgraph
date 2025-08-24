export async function pagerank(baseUrl, payload) {
  const res = await fetch(`${baseUrl}/algos/pagerank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function louvain(baseUrl, payload) {
  const res = await fetch(`${baseUrl}/algos/louvain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function kpaths(baseUrl, payload) {
  const res = await fetch(`${baseUrl}/algos/kpaths`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function materialize(baseUrl, payload) {
  const res = await fetch(`${baseUrl}/algos/materialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

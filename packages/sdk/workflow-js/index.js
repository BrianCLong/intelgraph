export async function createDefinition(baseUrl, name, definition) {
  const res = await fetch(`${baseUrl}/wf/definition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, definition })
  });
  return res.json();
}

export async function startCase(baseUrl, id, definition) {
  const res = await fetch(`${baseUrl}/wf/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, definition })
  });
  return res.json();
}

export async function transitionCase(baseUrl, id, transition, reason) {
  const res = await fetch(`${baseUrl}/wf/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, transition, reason })
  });
  return res.json();
}

export async function getCase(baseUrl, id) {
  const res = await fetch(`${baseUrl}/wf/cases/${id}`);
  return res.json();
}

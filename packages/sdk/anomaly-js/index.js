export async function configure(baseUrl, configs) {
  const res = await fetch(`${baseUrl}/anomaly/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ configs }),
  });
  return res.json();
}

export async function score(baseUrl, modelId, records, threshold) {
  const payload = { model_id: modelId, records };
  if (threshold !== undefined) payload.threshold = threshold;
  const res = await fetch(`${baseUrl}/anomaly/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

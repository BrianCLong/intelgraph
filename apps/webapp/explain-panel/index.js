export function buildExplainPayload(query, components) {
  const details = components.map((c) => c.reason).join('; ');
  return { query, explanation: details };
}

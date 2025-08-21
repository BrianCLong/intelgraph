/**
 * Minimal rules engine utilities.
 * @typedef {import('../../packages/shared/rules-schema').Alert} Alert
 * @typedef {import('../../packages/shared/rules-schema').Rule} Rule
 */

function selectorToCypher(selector) {
  const params = {};
  const conditions = [];
  if (selector.match) {
    for (const [key, value] of Object.entries(selector.match)) {
      params[key] = value;
      conditions.push(`n.${key} = $${key}`);
    }
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const query = `MATCH (n:${selector.label})${where} RETURN n`;
  return { query, params };
}

function computeScore(severityWeights, rule, data) {
  let score = 0;
  for (const [field, weight] of Object.entries(severityWeights)) {
    if (data[field] !== undefined) {
      score += weight;
    }
  }
  return score >= rule.threshold ? score : 0;
}

function dedupeAlerts(alerts, alert, windowMs) {
  const key = `${alert.ruleId}:${alert.entityId || alert.edgeId}`;
  const now = alert.createdAt.getTime();
  const duplicate = alerts.find((a) => {
    const aKey = `${a.ruleId}:${a.entityId || a.edgeId}`;
    const diff = Math.abs(now - a.createdAt.getTime());
    return aKey === key && diff <= windowMs;
  });
  if (duplicate) {
    return alerts;
  }
  return [...alerts, alert];
}

module.exports = {
  selectorToCypher,
  computeScore,
  dedupeAlerts,
};

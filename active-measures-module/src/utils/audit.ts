export function logAudit(actor, action, details) {
  // Similar to middleware, but for services
  const entry = { actor, action, details, timestamp: new Date().toISOString() };
  // Insert to DB
}
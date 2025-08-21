export function generateCypher(prompt: string, _context?: any): string {
  return 'MATCH (n) RETURN n LIMIT 10';
}

export function estimateCost(_cypher: string): { rows: number; cost: number } {
  return { rows: 10, cost: 1 };
}

export function guardrails(_cypher: string): string[] {
  return [];
}

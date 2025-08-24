export interface Estimate {
  cost: number;
  rows: number;
}

export function estimateCost(query: string): Estimate {
  const matches = query.match(/MATCH/gi)?.length || 0;
  const cost = matches * 10 + query.length * 0.1;
  return { cost, rows: cost * 5 };
}

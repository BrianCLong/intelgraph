export interface AstNode {
  type: 'find' | 'count';
  label: string;
  filter?: { property: string; value: string } | null;
}

export function estimateCost(ast: AstNode): number {
  let cost = 1;
  if (ast.filter) cost += 1;
  return cost;
}

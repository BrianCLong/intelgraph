// Laplace mechanism for simple count queries with budget accounting.
export type Budget = { epsilon: number; spent: number };

export function laplace(scale: number): number {
  const u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

export function dpCount(raw: number, eps: number, sensitivity = 1): number {
  const b = sensitivity / eps;
  return Math.round(raw + laplace(b));
}

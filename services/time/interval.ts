export interface TemporalInterval {
  validFrom: Date;
  validTo: Date;
}

export interface TemporalEntity<T = Record<string, unknown>> {
  id: string;
  data: T;
  validFrom: Date;
  validTo: Date;
  txFrom: Date;
  txTo: Date;
}

export function overlaps(a: TemporalInterval, b: TemporalInterval): boolean {
  return a.validFrom < b.validTo && b.validFrom < a.validTo;
}

export function isConsistent(existing: TemporalInterval[], candidate: TemporalInterval): boolean {
  return !existing.some((i) => overlaps(i, candidate));
}

export function buildValidTimePredicate(instant: Date): string {
  const iso = instant.toISOString();
  return `valid_from <= datetime(\"${iso}\") AND valid_to > datetime(\"${iso}\")`;
}

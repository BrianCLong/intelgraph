export interface DiffResult<T> {
  added: T[];
  removed: T[];
  changed: { before: T; after: T }[];
}

export function diffById<T extends { id: string }>(before: T[], after: T[]): DiffResult<T> {
  const beforeMap = new Map(before.map((e) => [e.id, e]));
  const afterMap = new Map(after.map((e) => [e.id, e]));

  const added: T[] = [];
  const removed: T[] = [];
  const changed: { before: T; after: T }[] = [];

  afterMap.forEach((value, id) => {
    if (!beforeMap.has(id)) {
      added.push(value);
    } else if (JSON.stringify(beforeMap.get(id)) !== JSON.stringify(value)) {
      changed.push({ before: beforeMap.get(id)!, after: value });
    }
  });

  beforeMap.forEach((value, id) => {
    if (!afterMap.has(id)) {
      removed.push(value);
    }
  });

  return { added, removed, changed };
}

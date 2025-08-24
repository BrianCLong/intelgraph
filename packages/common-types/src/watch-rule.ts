export interface WatchPredicate {
  field: string;
  op: '==' | 'in' | '~' | '>=';
  value: unknown;
}

export interface WatchAction {
  type: 'CREATE_ALERT' | 'BLOCK_MERGE' | 'TAG' | 'NOTIFY';
  severity?: string;
  tag?: string;
  channel?: string;
}

export interface WatchRule {
  id: string;
  name: string;
  predicate: WatchPredicate;
  action: WatchAction;
}

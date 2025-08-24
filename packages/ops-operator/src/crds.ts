export interface BackupJob {
  target: 'postgres' | 'neo4j' | 'redis' | 'minio';
  schedule: string;
}

export interface RestoreJob {
  target: string;
  snapshotRef: string;
}

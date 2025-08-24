import { EventEmitter } from 'events';
import pino from 'pino';
import { BackupJob } from './crds';

export class OpsOperator extends EventEmitter {
  private log = pino();

  constructor() {
    super();
    this.on('backup', (job: BackupJob) => this.handleBackup(job));
  }

  handleBackup(job: BackupJob) {
    this.log.info({ job }, 'performing backup');
    this.emit('backup:done', job);
  }
}

export function createOperator() {
  return new OpsOperator();
}

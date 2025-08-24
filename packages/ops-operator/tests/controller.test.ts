import { createOperator } from '../src/controller';

describe('OpsOperator', () => {
  it('emits backup:done', (done) => {
    const op = createOperator();
    op.on('backup:done', (job) => {
      expect(job.target).toBe('postgres');
      done();
    });
    op.emit('backup', { target: 'postgres', schedule: '@daily' });
  });
});

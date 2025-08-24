import { createOperator } from './controller';

const operator = createOperator();
operator.on('backup:done', () => {
  // eslint-disable-next-line no-console
  console.log('backup complete');
});

// demo trigger
operator.emit('backup', { target: 'postgres', schedule: '@daily' });

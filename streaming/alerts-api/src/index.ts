import Fastify from 'fastify';
import { Kafka } from 'kafkajs';

const fastify = Fastify({ logger: true });
const kafka = new Kafka({ clientId: 'alerts-api', brokers: ['localhost:9092'] });

fastify.get('/alerts/stream', async (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache'
  });
  const consumer = kafka.consumer({ groupId: 'alerts-api' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'alerts.v1' });
  await consumer.run({
    eachMessage: async ({ message }) => {
      reply.raw.write(`data: ${message.value?.toString()}\n\n`);
    }
  });
});

fastify.listen({ port: 4000, host: '0.0.0.0' }).catch(err => {
  fastify.log.error(err);
  process.exit(1);
});

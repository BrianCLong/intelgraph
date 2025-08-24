import Fastify from 'fastify';
import { v4 as uuid } from 'uuid';
import { Kafka, logLevel } from 'kafkajs';

const fastify = Fastify({ logger: true });
const kafka = new Kafka({
  clientId: 'ingest-gw',
  brokers: ['localhost:9092'],
  logLevel: logLevel.ERROR
});
const producer = kafka.producer();

fastify.post('/events', async (request, reply) => {
  const manifestId = uuid();
  const value = JSON.stringify({ ...request.body, manifestId });
  await producer.send({
    topic: 'ingest.raw.v1',
    messages: [{ key: manifestId, value }]
  });
  reply.code(202).send({ manifestId });
});

async function start() {
  await producer.connect();
  await fastify.listen({ port: 3000, host: '0.0.0.0' });
}

start().catch(err => {
  fastify.log.error(err);
  process.exit(1);
});

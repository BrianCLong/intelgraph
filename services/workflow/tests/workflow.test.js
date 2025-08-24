import request from 'supertest';
import app from '../src/index.js';
import { workflowEngine } from '../src/routes.js';

describe('workflow engine', () => {
  beforeAll(() => {
    const def = {
      initial: 'open',
      states: {
        open: {
          on: { review: 'review' },
          sla: 1,
          assignees: ['a'],
          checklist: ['<script>xss</script>']
        },
        review: { on: { close: 'closed' }, sla: 1 },
        closed: { on: {} }
      },
      guards: {
        close: (_case, reason) => reason === 'ok'
      }
    };
    workflowEngine.define('test', def);
  });

  test('start to transition to review', async () => {
    await request(app).post('/wf/start').send({ id: '1', definition: 'test' }).expect(200);
    const res = await request(app)
      .post('/wf/transition')
      .send({ id: '1', transition: 'review', reason: 'need review' })
      .expect(200);
    expect(res.body.state).toBe('review');
  });

  test('guard prevents invalid close', async () => {
    await request(app)
      .post('/wf/transition')
      .send({ id: '1', transition: 'close', reason: 'bad' })
      .expect(400);
  });

  test('sanitizes checklist to avoid xss', async () => {
    await request(app).post('/wf/start').send({ id: '2', definition: 'test' }).expect(200);
    const res = await request(app).get('/wf/cases/2').expect(200);
    expect(res.body.checklist[0].text).toBe('scriptxss/script');
  });
});

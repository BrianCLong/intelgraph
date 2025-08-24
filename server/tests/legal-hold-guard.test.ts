import { denyWhenHold } from '../src/cases/legal-hold-guard';

describe('legal hold guard', () => {
  it('denies when case has legal hold', async () => {
    const req = {
      params: { id: 'c1' },
      db: { case: { findUnique: async () => ({ legalHold: true }) } },
    } as any;
    const reply: any = {
      status: 0,
      body: null,
      code(code: number) {
        this.status = code;
        return this;
      },
      send(payload: any) {
        this.body = payload;
      },
    };
    await denyWhenHold(req, reply);
    expect(reply.status).toBe(423);
    expect(reply.body).toEqual({ error: 'Legal hold active: operation locked' });
  });

  it('passes through when no hold', async () => {
    const req = {
      params: { id: 'c1' },
      db: { case: { findUnique: async () => ({ legalHold: false }) } },
    } as any;
    const reply = { code: jest.fn().mockReturnThis(), send: jest.fn() } as any;
    await denyWhenHold(req, reply);
    expect(reply.code).not.toHaveBeenCalled();
  });
});

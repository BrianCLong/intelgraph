export const denyWhenHold = async (req: any, reply: any) => {
  const { id } = req.params as any;
  const c = await req.db.case.findUnique({ where: { id } });
  if (c?.legalHold) {
    return reply.code(423).send({ error: 'Legal hold active: operation locked' });
  }
};

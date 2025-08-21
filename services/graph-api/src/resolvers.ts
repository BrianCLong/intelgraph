import { Driver } from 'neo4j-driver';
import { v4 as uuid } from 'uuid';

type NodeInput = {
  provenance: { source: string; confidence: number; chain: string[] };
  policy: {
    tenantId: string;
    sensitivity?: string;
    legalBasis?: string;
    needToKnow?: string;
  };
};

type EdgeInput = NodeInput & { from: string; to: string };

const nodeTypes = ['Person', 'Org', 'Event', 'Document', 'Account'] as const;
const edgeTypes = ['ACTED_FOR', 'ATTENDED', 'MENTIONS', 'OWNS'] as const;

export const buildResolvers = (driver: Driver) => {
  const getNode = async (
    label: string,
    id: string,
    tenantId: string,
    asOf?: string,
  ) => {
    const session = driver.session();
    try {
      const res = await session.run(
        `MATCH (n:${label} {id: $id})\nWHERE n.policy.tenantId = $tenantId AND ($asOf IS NULL OR n.updatedAt <= $asOf)\nRETURN n`,
        { id, tenantId, asOf },
      );
      return res.records[0]?.get('n').properties || null;
    } finally {
      await session.close();
    }
  };

  const listNodes = async (
    label: string,
    tenantId: string,
    limit = 25,
    offset = 0,
    asOf?: string,
  ) => {
    const session = driver.session();
    try {
      const res = await session.run(
        `MATCH (n:${label})\nWHERE n.policy.tenantId = $tenantId AND ($asOf IS NULL OR n.updatedAt <= $asOf)\nRETURN n SKIP $offset LIMIT $limit`,
        { tenantId, limit, offset, asOf },
      );
      return res.records.map((r) => r.get('n').properties);
    } finally {
      await session.close();
    }
  };

  const createNode = async (
    label: string,
    input: NodeInput,
    tenantId: string,
  ) => {
    if (input.policy.tenantId !== tenantId) {
      throw new Error('policy tenant mismatch');
    }
    const id = uuid();
    const now = new Date().toISOString();
    const props = { id, createdAt: now, updatedAt: now, ...input };
    const session = driver.session();
    try {
      const res = await session.run(`CREATE (n:${label} $props) RETURN n`, {
        props,
      });
      return res.records[0].get('n').properties;
    } finally {
      await session.close();
    }
  };

  const updateNode = async (
    label: string,
    id: string,
    input: NodeInput,
    tenantId: string,
  ) => {
    if (input.policy.tenantId !== tenantId) {
      throw new Error('policy tenant mismatch');
    }
    const now = new Date().toISOString();
    const session = driver.session();
    try {
      const res = await session.run(
        `MATCH (n:${label} {id: $id})\nWHERE n.policy.tenantId = $tenantId\nSET n += {provenance: $prov, policy: $pol, updatedAt: $now}\nRETURN n`,
        { id, tenantId, prov: input.provenance, pol: input.policy, now },
      );
      return res.records[0]?.get('n').properties || null;
    } finally {
      await session.close();
    }
  };

  const deleteNode = async (label: string, id: string, tenantId: string) => {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (n:${label} {id: $id}) WHERE n.policy.tenantId = $tenantId DETACH DELETE n`,
        { id, tenantId },
      );
      return true;
    } finally {
      await session.close();
    }
  };

  const createEdge = async (
    type: string,
    input: EdgeInput,
    tenantId: string,
  ) => {
    if (input.policy.tenantId !== tenantId)
      throw new Error('policy tenant mismatch');
    const id = uuid();
    const now = new Date().toISOString();
    const session = driver.session();
    try {
      await session.run(
        `MATCH (a {id: $from}), (b {id: $to})\nWHERE a.policy.tenantId = $tenantId AND b.policy.tenantId = $tenantId\nMERGE (a)-[r:${type}]->(b)\nSET r += {id: $id, createdAt: $now, updatedAt: $now, provenance: $prov, policy: $pol}`,
        {
          from: input.from,
          to: input.to,
          tenantId,
          id,
          now,
          prov: input.provenance,
          pol: input.policy,
        },
      );
      return true;
    } finally {
      await session.close();
    }
  };

  const updateEdge = async (
    type: string,
    input: EdgeInput,
    tenantId: string,
  ) => {
    if (input.policy.tenantId !== tenantId)
      throw new Error('policy tenant mismatch');
    const now = new Date().toISOString();
    const session = driver.session();
    try {
      await session.run(
        `MATCH (a {id: $from})-[r:${type}]->(b {id: $to})\nWHERE r.policy.tenantId = $tenantId\nSET r += {provenance: $prov, policy: $pol, updatedAt: $now}`,
        {
          from: input.from,
          to: input.to,
          tenantId,
          prov: input.provenance,
          pol: input.policy,
          now,
        },
      );
      return true;
    } finally {
      await session.close();
    }
  };

  const deleteEdge = async (
    type: string,
    from: string,
    to: string,
    tenantId: string,
  ) => {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (a {id: $from})-[r:${type}]->(b {id: $to})\nWHERE r.policy.tenantId = $tenantId DELETE r`,
        { from, to, tenantId },
      );
      return true;
    } finally {
      await session.close();
    }
  };

  const nodeResolvers: Record<string, any> = {};
  nodeTypes.forEach((label) => {
    const lname = label.toLowerCase();
    nodeResolvers[lname] = (_: any, args: any, ctx: any) =>
      getNode(label, args.id, ctx.tenantId, args.asOf);
    nodeResolvers[`${lname}s`] = (_: any, args: any, ctx: any) =>
      listNodes(label, ctx.tenantId, args.limit, args.offset, args.asOf);
  });

  const mutationResolvers: Record<string, any> = {};
  nodeTypes.forEach((label) => {
    mutationResolvers[`create${label}`] = (_: any, { input }: any, ctx: any) =>
      createNode(label, input, ctx.tenantId);
    mutationResolvers[`update${label}`] = (
      _: any,
      { id, input }: any,
      ctx: any,
    ) => updateNode(label, id, input, ctx.tenantId);
    mutationResolvers[`delete${label}`] = (_: any, { id }: any, ctx: any) =>
      deleteNode(label, id, ctx.tenantId);
  });
  const toPascal = (s: string) =>
    s.toLowerCase().replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase());
  edgeTypes.forEach((type) => {
    const pascal = toPascal(type);
    mutationResolvers[`create${pascal}`] = (_: any, { input }: any, ctx: any) =>
      createEdge(type, input, ctx.tenantId);
    mutationResolvers[`update${pascal}`] = (_: any, { input }: any, ctx: any) =>
      updateEdge(type, input, ctx.tenantId);
    mutationResolvers[`delete${pascal}`] = (_: any, args: any, ctx: any) =>
      deleteEdge(type, args.from, args.to, ctx.tenantId);
  });

  return {
    Query: nodeResolvers,
    Mutation: mutationResolvers,
  };
};

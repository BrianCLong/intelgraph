import fetch from 'node-fetch';
import { z } from 'zod';

const API = process.env.PLATFORM_URL || 'http://localhost:8000';

const resolvers = {
  Query: {
    tenants: async () => {
      const res = await fetch(`${API}/tenant/list`);
      if (!res.ok) return [];
      return res.json();
    }
  },
  Mutation: {
    async createTenant(_: any, { name, slug }: { name: string; slug: string }) {
      const res = await fetch(`${API}/tenant/create`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, slug })
      });
      return res.json();
    },
    async registerUser(_: any, args: any) {
      const schema = z.object({ tenantId: z.string(), email: z.string().email(), password: z.string(), name: z.string() });
      const data = schema.parse(args);
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: data.tenantId,
          email: data.email,
          password: data.password,
          name: data.name
        })
      });
      return res.json();
    },
    async login(_: any, args: any) {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: args.tenantId,
          email: args.email,
          password: args.password
        })
      });
      if (!res.ok) throw new Error('login failed');
      return res.json();
    }
  }
};

export default resolvers;

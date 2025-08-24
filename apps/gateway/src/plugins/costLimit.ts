export function costLimitPlugin(limitDefault = Number(process.env.GQL_MAX_COST || 1000)) {
  return {
    async didResolveOperation(ctx: any) {
      const roles = (ctx.contextValue?.roles as string[]) || [];
      const limit = roles.includes('admin') ? limitDefault * 2 : limitDefault;
      let cost = 0;
      const sel = ctx.operation?.selectionSet?.selections || [];
      for (const s of sel) {
        const name = s?.name?.value || 'unknown';
        cost += name.includes('search') ? 50 : 10;
      }
      if (cost > limit) throw new Error(`Query exceeds cost limit (${cost} > ${limit})`);
    },
  };
}

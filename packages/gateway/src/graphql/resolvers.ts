import fetch from 'node-fetch';

const graphs: { id: string; name: string }[] = [];

export default {
  Query: {
    graphs: () => graphs
  },
  Mutation: {
    async registerGraph(_: unknown, { name }: { name: string }) {
      const res = await fetch('http://graphai:8000/graph/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nodeQuery: '', edgeQuery: '' })
      });
      const graph = await res.json();
      graphs.push(graph);
      return graph;
    }
  }
};

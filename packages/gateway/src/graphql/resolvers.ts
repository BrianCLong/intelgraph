import { v4 as uuid } from 'uuid';
import fetch from 'node-fetch';

interface Hypothesis { id: string; title: string; prior: number; }
const data: Hypothesis[] = [];

export default {
  Query: {
    hypotheses: () => data
  },
  Mutation: {
    createHypothesis: (_: unknown, { title, prior }: { title: string; prior: number }) => {
      const h = { id: uuid(), title, prior };
      data.push(h);
      return h;
    }
  }
};

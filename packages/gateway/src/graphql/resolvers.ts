import { z } from 'zod';
import axios from 'axios';
export interface ScreeningResult {
  subjectId: string;
  entryId: string;
  score: number;
  reasons: string[];
  matchedFields: string[];
  decision: string;
}

export interface FinintelClient {
  screen(subjects: { id: string; name: string }[]): Promise<ScreeningResult[]>;
}

export default function createResolvers(client: FinintelClient) {
  const results: ScreeningResult[] = [];
  return {
    Query: {
      screeningResults: () => results,
    },
    Mutation: {
      runScreening: async (_: unknown, args: { subjects: { id: string; name: string }[] }) => {
        const schema = z.array(z.object({ id: z.string(), name: z.string() }));
        const subjects = schema.parse(args.subjects);
        const res = await client.screen(subjects);
        results.push(...res);
        return res;
      },
    },
  };
}

export class HttpFinintelClient implements FinintelClient {
  constructor(private baseUrl: string) {}
  async screen(subjects: { id: string; name: string }[]): Promise<ScreeningResult[]> {
    const resp = await axios.post(`${this.baseUrl}/screen`, { subjects });
    return resp.data;
  }
}

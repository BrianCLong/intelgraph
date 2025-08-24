import request from 'supertest';
import { createApp, startServer } from '../src/index';
interface ScreeningResult {
  subjectId: string;
  entryId: string;
  score: number;
  reasons: string[];
  matchedFields: string[];
  decision: string;
}
import { FinintelClient } from '../src/graphql/resolvers';

describe('Gateway screening', () => {
  it('runs screening mutation', async () => {
    const mockClient: FinintelClient = {
      screen: async () => [{
        subjectId: '1',
        entryId: 'wl1',
        score: 95,
        reasons: ['name-match'],
        matchedFields: ['name'],
        decision: 'HIT'
      } as ScreeningResult]
    };
    const app = await createApp(mockClient);
    const query = {
      query: `mutation($s:[SubjectInput!]!){runScreening(subjects:$s){decision subjectId}}`,
      variables: { s: [{ id: '1', name: 'John' }] }
    };
    const res = await request(app).post('/graphql').send(query);
    expect(res.body.data.runScreening[0].decision).toBe('HIT');
    const res2 = await request(app).post('/graphql').send({ query: '{ screeningResults { decision } }' });
    expect(res2.body.data.screeningResults.length).toBe(1);
  });
});

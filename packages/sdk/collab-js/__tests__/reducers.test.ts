import { presenceReducer } from '../src/reducers';

test('presence reducer handles join and leave', () => {
  let state = presenceReducer(undefined, {
    type: 'presence.join',
    sessionId: '1',
    userId: 'u',
    tenantId: 't',
  });
  expect(state['1']).toEqual({ userId: 'u', tenantId: 't' });
  state = presenceReducer(state, { type: 'presence.leave', sessionId: '1' });
  expect(state['1']).toBeUndefined();
});

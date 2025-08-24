import { verifyManifest } from '../src';

test('verifyManifest', () => {
  expect(
    verifyManifest({
      entries: [
        { id: '1', hash: 'abc' },
        { id: '2', hash: 'def' }
      ]
    })
  ).toBe(true);
});

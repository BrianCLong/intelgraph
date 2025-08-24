import { createManifest, verifyManifest } from '../src/index';

test('manifest verification', () => {
  const entries = [{ path: 'a.txt', data: 'hello' }];
  const manifest = createManifest(entries);
  expect(verifyManifest(entries, manifest)).toBe(true);
});

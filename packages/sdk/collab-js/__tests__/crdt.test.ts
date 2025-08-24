import { TextCRDT } from '../src/crdt';

test('CRDT insert and delete', () => {
  const doc = new TextCRDT('hi');
  doc.apply({ insert: { pos: 2, value: '!' } });
  expect(doc.value()).toBe('hi!');
  doc.apply({ delete: { pos: 1, count: 1 } });
  expect(doc.value()).toBe('h!');
});

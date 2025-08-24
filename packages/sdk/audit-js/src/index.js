import crypto from 'node:crypto';

export function merkleRoot(hashes) {
  if (!hashes.length) return '';
  let nodes = hashes.map((h) => Buffer.from(h, 'hex'));
  while (nodes.length > 1) {
    const next = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = i + 1 < nodes.length ? nodes[i + 1] : nodes[i];
      next.push(
        crypto
          .createHash('sha256')
          .update(Buffer.concat([left, right]))
          .digest(),
      );
    }
    nodes = next;
  }
  return nodes[0].toString('hex');
}

export function verifyBundle(bundle) {
  const root = merkleRoot(bundle.hashes || []);
  return root === bundle.merkleRoot;
}

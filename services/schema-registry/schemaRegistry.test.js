const fs = require('fs');
const path = require('path');
const { SchemaRegistry } = require('./schemaRegistry');

describe('SchemaRegistry', () => {
  const tempStore = path.join(__dirname, '__test-store.json');

  afterEach(() => {
    if (fs.existsSync(tempStore)) fs.unlinkSync(tempStore);
  });

  test('propose and approve schema versions', () => {
    const registry = new SchemaRegistry(tempStore);
    const proposal = registry.propose({ entity: {} }, ['CREATE CONSTRAINT']);
    expect(proposal.version).toBe(1);
    registry.approve(1);
    const current = registry.getCurrent();
    expect(current.version).toBe(1);
    expect(current.status).toBe('approved');
  });
});

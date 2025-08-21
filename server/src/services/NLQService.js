const { getNeo4jDriver } = require('../config/database');

class NLQService {
  constructor() {
    this.driver = getNeo4jDriver();
  }

  async generate(prompt) {
    // Placeholder implementation - schema aware decoding would go here
    const cypher = 'MATCH (n) RETURN n LIMIT 10';
    return {
      cypher,
      explanation: 'Basic node retrieval',
      estimatedRows: 10,
      estimatedCost: 1,
      readonly: true,
    };
  }

  async executeSandbox(cypher) {
    const isWrite = /(CREATE|MERGE|DELETE|SET)\b/i.test(cypher);
    if (isWrite) {
      const err = new Error('Sandbox is read-only; write operations blocked.');
      err.statusCode = 403;
      throw err;
    }
    const session = this.driver.session();
    try {
      const result = await session.run(`EXPLAIN PROFILE ${cypher}`);
      return { plan: result.summary?.plan || null };
    } finally {
      await session.close();
    }
  }
}

module.exports = NLQService;

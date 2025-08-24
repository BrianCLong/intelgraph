"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
const apollo_server_express_1 = require("apollo-server-express");
const schema_js_1 = require("./schema.js");
// Health check types for monitoring
const healthSchema = (0, apollo_server_express_1.gql) `
  scalar DateTime
  scalar JSON
  
  type HealthStatus {
    status: String!
    timestamp: DateTime!
    version: String!
    environment: String!
    services: [ServiceHealth!]!
  }
  
  type ServiceHealth {
    name: String!
    status: String!
    details: JSON
  }
  
  extend type Query {
    health: HealthStatus!
  }
`;
// Combine all schema definitions
exports.typeDefs = [healthSchema, ...schema_js_1.typeDefs];
exports.default = exports.typeDefs;
//# sourceMappingURL=schema-unified.js.map
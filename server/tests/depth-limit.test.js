"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const depthLimit_1 = require("../src/graphql/validation/depthLimit");
const graphql_1 = require("graphql");
describe('GraphQL Depth Limit Validation', () => {
    const schema = (0, graphql_1.buildSchema)(`
    type Query {
      user: User
    }
    
    type User {
      id: ID!
      name: String!
      friends: [User!]!
      posts: [Post!]!
    }
    
    type Post {
      id: ID!
      title: String!
      author: User!
      comments: [Comment!]!
    }
    
    type Comment {
      id: ID!
      content: String!
      author: User!
      post: Post!
    }
  `);
    test('should allow queries within depth limit', () => {
        const validQuery = (0, graphql_1.parse)(`
      query {
        user {
          id
          name
          friends {
            id
            name
            posts {
              id
              title
            }
          }
        }
      }
    `);
        const errors = (0, graphql_1.validate)(schema, validQuery, [(0, depthLimit_1.depthLimit)(8)]);
        expect(errors).toHaveLength(0);
    });
    test('should reject queries exceeding depth limit', () => {
        const deepQuery = (0, graphql_1.parse)(`
      query {
        user {
          friends {
            friends {
              friends {
                friends {
                  friends {
                    friends {
                      friends {
                        friends {
                          friends {
                            id
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);
        const errors = (0, graphql_1.validate)(schema, deepQuery, [(0, depthLimit_1.depthLimit)(8)]);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Query is too deep');
        expect(errors[0].message).toContain('depth');
        expect(errors[0].message).toContain('> 8');
    });
    test('should include operation name in error message', () => {
        const deepQueryWithName = (0, graphql_1.parse)(`
      query DeepUserQuery {
        user {
          friends {
            friends {
              friends {
                friends {
                  friends {
                    friends {
                      friends {
                        friends {
                          friends {
                            id
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);
        const errors = (0, graphql_1.validate)(schema, deepQueryWithName, [(0, depthLimit_1.depthLimit)(8)]);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('DeepUserQuery');
    });
    test('should handle custom depth limits', () => {
        const moderateQuery = (0, graphql_1.parse)(`
      query {
        user {
          friends {
            friends {
              friends {
                id
              }
            }
          }
        }
      }
    `);
        // Should pass with depth limit 5
        const errorsWithLimit5 = (0, graphql_1.validate)(schema, moderateQuery, [(0, depthLimit_1.depthLimit)(5)]);
        expect(errorsWithLimit5).toHaveLength(0);
        // Should fail with depth limit 3
        const errorsWithLimit3 = (0, graphql_1.validate)(schema, moderateQuery, [(0, depthLimit_1.depthLimit)(3)]);
        expect(errorsWithLimit3.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=depth-limit.test.js.map
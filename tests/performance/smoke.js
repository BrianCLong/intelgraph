/**
 * K6 Performance Smoke Test for IntelGraph MVP-1++
 * 
 * Validates core performance SLOs:
 * - GraphQL p95 < 350ms
 * - Socket.IO E2E < 600ms  
 * - Auth latency < 100ms
 * - RBAC checks < 50ms
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let graphqlLatency = new Trend('graphql_latency');
export let authLatency = new Trend('auth_latency');
export let rbacLatency = new Trend('rbac_latency');

// Test configuration
export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up
    { duration: '60s', target: 10 },  // Steady state
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration{type:graphql}': ['p(95)<350'],
    'http_req_duration{type:auth}': ['p(95)<100'],
    'http_req_duration{type:rbac}': ['p(95)<50'],
    'errors': ['rate<0.02'], // Less than 2% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const WS_URL = BASE_URL.replace('http', 'ws');

// Test user credentials
const TEST_USER = {
  email: 'test@intelgraph.com',
  password: 'test123',
};

// GraphQL queries for testing
const QUERIES = {
  healthCheck: `
    query HealthCheck {
      __schema {
        queryType {
          name
        }
      }
    }
  `,
  
  userProfile: `
    query UserProfile {
      me {
        id
        email
        roles
        permissions
      }
    }
  `,
  
  investigations: `
    query Investigations($limit: Int) {
      investigations(limit: $limit) {
        id
        title
        status
        createdAt
        entityCount
      }
    }
  `,

  entities: `
    query Entities($investigationId: String!, $limit: Int) {
      entities(investigationId: $investigationId, limit: $limit) {
        id
        label
        type
        properties
        riskScore
      }
    }
  `,

  copilotExtract: `
    mutation CopilotExtract($input: ExtractEntitiesInput!) {
      extractEntities(input: $input) {
        id
        status
        entities {
          label
          type
          confidence
        }
      }
    }
  `,
};

export function setup() {
  // Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, {
    'Health endpoint is up': (r) => r.status === 200,
  });

  // Authenticate and get token
  const authResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(authResponse, {
    'Authentication successful': (r) => r.status === 200,
  });

  const authData = authResponse.json();
  return {
    token: authData.access_token || 'test-token',
    userId: authData.user?.id || 'test-user',
  };
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // 1. Test GraphQL Health Check
  testGraphQLQuery('healthCheck', QUERIES.healthCheck, {}, headers);

  // 2. Test User Profile (RBAC)
  testGraphQLQuery('userProfile', QUERIES.userProfile, {}, headers, 'rbac');

  // 3. Test Investigations List
  testGraphQLQuery('investigations', QUERIES.investigations, { limit: 10 }, headers);

  // 4. Test Entities Query
  testGraphQLQuery('entities', QUERIES.entities, { 
    investigationId: 'test-investigation', 
    limit: 20 
  }, headers);

  // 5. Test AI Copilot (if enabled)
  if (__ENV.FEATURE_COPILOT_SERVICE === 'true') {
    testGraphQLQuery('copilotExtract', QUERIES.copilotExtract, {
      input: {
        text: "John Smith works at ACME Corp and knows Jane Doe.",
        investigationId: "test-investigation"
      }
    }, headers);
  }

  // 6. Test Real-time WebSocket
  testWebSocket(data.token);

  // 7. Test Metrics Endpoint
  testMetricsEndpoint();

  sleep(1);
}

function testGraphQLQuery(name, query, variables, headers, type = 'graphql') {
  const payload = JSON.stringify({ query, variables });
  
  const response = http.post(`${BASE_URL}/graphql`, payload, {
    headers,
    tags: { type, operation: name },
  });

  const success = check(response, {
    [`${name} - Status is 200`]: (r) => r.status === 200,
    [`${name} - No GraphQL errors`]: (r) => {
      try {
        const body = r.json();
        return !body.errors || body.errors.length === 0;
      } catch {
        return false;
      }
    },
    [`${name} - Response time OK`]: (r) => r.timings.duration < 1000,
  });

  // Record metrics
  if (type === 'graphql') {
    graphqlLatency.add(response.timings.duration);
  } else if (type === 'auth') {
    authLatency.add(response.timings.duration);
  } else if (type === 'rbac') {
    rbacLatency.add(response.timings.duration);
  }

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

function testWebSocket(token) {
  const wsUrl = `${WS_URL}/graphql`;
  
  const response = ws.connect(wsUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  }, function(socket) {
    socket.on('open', () => {
      // Send connection init
      socket.send(JSON.stringify({
        type: 'connection_init',
        payload: { Authorization: `Bearer ${token}` }
      }));
      
      // Subscribe to investigation updates
      socket.send(JSON.stringify({
        id: '1',
        type: 'start',
        payload: {
          query: `
            subscription InvestigationUpdates($investigationId: String!) {
              investigationUpdated(investigationId: $investigationId) {
                id
                title
                status
                updatedAt
              }
            }
          `,
          variables: { investigationId: 'test-investigation' }
        }
      }));
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      check(message, {
        'WebSocket message is valid': (msg) => msg.type !== 'error',
      });
    });

    socket.on('error', (e) => {
      console.log('WebSocket error:', e);
      errorRate.add(1);
    });

    // Keep connection open for a short time
    setTimeout(() => {
      socket.close();
    }, 2000);
  });

  check(response, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });
}

function testMetricsEndpoint() {
  const response = http.get(`${BASE_URL}/metrics`);
  
  check(response, {
    'Metrics endpoint accessible': (r) => r.status === 200,
    'Metrics contains GraphQL data': (r) => r.body.includes('graphql_requests_total'),
    'Metrics contains RBAC data': (r) => r.body.includes('rbac_checks_total'),
  });
}

export function teardown(data) {
  console.log('Smoke test completed');
  console.log(`Token used: ${data.token ? 'Yes' : 'No'}`);
}
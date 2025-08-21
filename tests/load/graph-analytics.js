import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const graphQueryDuration = new Trend('graph_query_duration');
const pathFindingDuration = new Trend('path_finding_duration');
const centralityDuration = new Trend('centrality_calculation_duration');
const errorRate = new Rate('error_rate');
const wsConnections = new Counter('websocket_connections');

// Load test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp-up
    { duration: '5m', target: 50 }, // Peak load
    { duration: '2m', target: 100 }, // Spike test
    { duration: '5m', target: 50 }, // Sustained load
    { duration: '2m', target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    graph_query_duration: ['p(90)<1000'], // Graph queries under 1s
    path_finding_duration: ['p(95)<3000'], // Path finding under 3s
    centrality_duration: ['p(90)<5000'], // Centrality under 5s
    error_rate: ['rate<0.1'], // Error rate under 10%
    http_req_failed: ['rate<0.05'], // HTTP failure rate under 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4001';
const WS_URL = __ENV.WS_URL || 'ws://localhost:4001';

// Test data
const testCases = ['case-1', 'case-2', 'case-3', 'case-4', 'case-5'];
const entityTypes = ['PERSON', 'ORGANIZATION', 'IP_ADDRESS', 'EMAIL', 'PHONE'];

export function setup() {
  // Authenticate and get JWT token
  const loginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'loadtest@example.com',
    password: 'loadtestpassword'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginResponse, {
    'login successful': (r) => r.status === 200,
  });

  const token = loginResponse.json('token');
  return { token };
}

export default function(data) {
  const { token } = data;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test scenario selection
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    testGraphQueries(headers);
  } else if (scenario < 0.6) {
    testPathFinding(headers);
  } else if (scenario < 0.8) {
    testCentralityCalculation(headers);
  } else {
    testRealTimeUpdates(headers, token);
  }

  sleep(1);
}

function testGraphQueries(headers) {
  const caseId = testCases[Math.floor(Math.random() * testCases.length)];
  
  // Basic graph query
  const graphQuery = `
    query GetGraphData($caseId: ID!) {
      case(id: $caseId) {
        graph {
          nodes {
            id
            type
            name
            properties
          }
          edges {
            id
            from
            to
            type
            weight
          }
        }
      }
    }
  `;

  const start = Date.now();
  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: graphQuery,
    variables: { caseId }
  }), { headers });

  const duration = Date.now() - start;
  graphQueryDuration.add(duration);

  const success = check(response, {
    'graph query status is 200': (r) => r.status === 200,
    'graph data returned': (r) => r.json('data.case.graph.nodes').length > 0,
    'no GraphQL errors': (r) => !r.json('errors'),
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  // Subgraph query
  const subgraphQuery = `
    query GetSubgraph($caseId: ID!, $centerNode: ID!, $depth: Int!) {
      case(id: $caseId) {
        subgraph(centerNode: $centerNode, depth: $depth) {
          nodes {
            id
            type
            name
          }
          edges {
            id
            from
            to
            type
          }
        }
      }
    }
  `;

  http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: subgraphQuery,
    variables: { 
      caseId,
      centerNode: 'entity-1',
      depth: 2
    }
  }), { headers });
}

function testPathFinding(headers) {
  const caseId = testCases[Math.floor(Math.random() * testCases.length)];
  
  const pathQuery = `
    query FindPath($caseId: ID!, $from: ID!, $to: ID!, $maxHops: Int) {
      case(id: $caseId) {
        findPath(from: $from, to: $to, maxHops: $maxHops) {
          path {
            nodes {
              id
              type
              name
            }
            edges {
              id
              type
              weight
            }
          }
          distance
          confidence
        }
      }
    }
  `;

  const start = Date.now();
  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: pathQuery,
    variables: {
      caseId,
      from: `entity-${Math.floor(Math.random() * 100) + 1}`,
      to: `entity-${Math.floor(Math.random() * 100) + 1}`,
      maxHops: 5
    }
  }), { headers });

  const duration = Date.now() - start;
  pathFindingDuration.add(duration);

  check(response, {
    'path finding status is 200': (r) => r.status === 200,
    'path result returned': (r) => r.json('data.case.findPath') !== null,
  });
}

function testCentralityCalculation(headers) {
  const caseId = testCases[Math.floor(Math.random() * testCases.length)];
  const centralityTypes = ['BETWEENNESS', 'CLOSENESS', 'EIGENVECTOR', 'PAGERANK'];
  const centralityType = centralityTypes[Math.floor(Math.random() * centralityTypes.length)];
  
  const centralityQuery = `
    query CalculateCentrality($caseId: ID!, $entityId: ID!, $type: CentralityType!) {
      case(id: $caseId) {
        calculateCentrality(entityId: $entityId, type: $type) {
          score
          rank
          percentile
        }
      }
    }
  `;

  const start = Date.now();
  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: centralityQuery,
    variables: {
      caseId,
      entityId: `entity-${Math.floor(Math.random() * 100) + 1}`,
      type: centralityType
    }
  }), { headers });

  const duration = Date.now() - start;
  centralityDuration.add(duration);

  check(response, {
    'centrality calculation status is 200': (r) => r.status === 200,
    'centrality score returned': (r) => r.json('data.case.calculateCentrality.score') !== null,
  });

  // Batch centrality calculation
  const batchCentralityQuery = `
    query BatchCentrality($caseId: ID!, $type: CentralityType!) {
      case(id: $caseId) {
        batchCentrality(type: $type) {
          entityId
          score
          rank
        }
      }
    }
  `;

  http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: batchCentralityQuery,
    variables: { caseId, type: centralityType }
  }), { headers });
}

function testRealTimeUpdates(headers, token) {
  const caseId = testCases[Math.floor(Math.random() * testCases.length)];
  
  // Test WebSocket connection for real-time updates
  const wsUrl = `${WS_URL}/socket.io/?token=${token}`;
  
  const response = ws.connect(wsUrl, {}, function (socket) {
    wsConnections.add(1);
    
    socket.on('open', function() {
      // Join case room for updates
      socket.send(JSON.stringify({
        type: 'join_case',
        caseId: caseId
      }));
    });

    socket.on('message', function(data) {
      const message = JSON.parse(data);
      check(message, {
        'valid message format': (msg) => msg.type !== undefined,
        'case update received': (msg) => msg.type === 'case_updated' || msg.type === 'entity_created',
      });
    });

    // Simulate staying connected for updates
    sleep(5);
    
    socket.close();
  });
  
  // Create entity to trigger real-time update
  const createEntityMutation = `
    mutation CreateEntity($input: CreateEntityInput!) {
      createEntity(input: $input) {
        id
        type
        name
      }
    }
  `;

  http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: createEntityMutation,
    variables: {
      input: {
        type: entityTypes[Math.floor(Math.random() * entityTypes.length)],
        name: `Load Test Entity ${Math.random()}`,
        caseId: caseId,
        properties: {
          source: 'load-test'
        }
      }
    }
  }), { headers });
}

export function teardown(data) {
  // Cleanup test data if needed
  console.log('Load test completed');
}
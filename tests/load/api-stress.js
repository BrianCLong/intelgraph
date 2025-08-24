import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const apiResponseTime = new Trend('api_response_time');
const dbQueryTime = new Trend('db_query_time');
const searchResponseTime = new Trend('search_response_time');
const authFailures = new Counter('auth_failures');
const rateLimitHits = new Counter('rate_limit_hits');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Warm-up
    { duration: '3m', target: 100 },  // Scale up
    { duration: '5m', target: 200 },  // Peak load
    { duration: '3m', target: 300 },  // Stress test
    { duration: '2m', target: 0 },    // Scale down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    api_response_time: ['p(90)<2000'],
    search_response_time: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
    rate_limit_hits: ['count<100'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4001';

// Test data generators
function generateEntity() {
  return {
    type: ['PERSON', 'ORGANIZATION', 'IP_ADDRESS', 'EMAIL'][Math.floor(Math.random() * 4)],
    name: `Test Entity ${Math.random().toString(36).substring(7)}`,
    properties: {
      confidence: Math.random(),
      source: 'load-test',
      timestamp: new Date().toISOString()
    }
  };
}

function generateCase() {
  return {
    title: `Load Test Case ${Math.random().toString(36).substring(7)}`,
    description: 'Generated for load testing',
    priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
    type: 'INVESTIGATION'
  };
}

export function setup() {
  // Create test users and get tokens
  const users = [];
  for (let i = 0; i < 10; i++) {
    const loginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: `loadtest${i}@example.com`,
      password: 'loadtestpassword'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (loginResponse.status === 200) {
      users.push({
        token: loginResponse.json('token'),
        userId: loginResponse.json('user.id')
      });
    }
  }

  return { users };
}

export default function(data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];
  if (!user) return;

  const headers = {
    'Authorization': `Bearer ${user.token}`,
    'Content-Type': 'application/json',
  };

  // Distribute load across different API endpoints
  const scenario = Math.random();
  
  if (scenario < 0.2) {
    testCaseManagement(headers);
  } else if (scenario < 0.4) {
    testEntityOperations(headers);
  } else if (scenario < 0.6) {
    testSearchOperations(headers);
  } else if (scenario < 0.8) {
    testAnalyticsQueries(headers);
  } else {
    testFileOperations(headers);
  }

  sleep(Math.random() * 2 + 1); // Random think time 1-3 seconds
}

function testCaseManagement(headers) {
  group('Case Management', function() {
    // List cases
    let start = Date.now();
    let response = http.get(`${BASE_URL}/api/cases?limit=20&offset=0`, { headers });
    apiResponseTime.add(Date.now() - start);
    
    check(response, {
      'cases list status is 200': (r) => r.status === 200,
      'cases returned': (r) => r.json('data').length >= 0,
    });

    if (response.status === 429) {
      rateLimitHits.add(1);
      return;
    }

    // Create case
    const newCase = generateCase();
    start = Date.now();
    response = http.post(`${BASE_URL}/api/cases`, JSON.stringify(newCase), { headers });
    apiResponseTime.add(Date.now() - start);
    
    const caseCreated = check(response, {
      'case creation status is 201': (r) => r.status === 201,
      'case ID returned': (r) => r.json('data.id') !== null,
    });

    if (caseCreated && response.status === 201) {
      const caseId = response.json('data.id');
      
      // Update case
      start = Date.now();
      response = http.patch(`${BASE_URL}/api/cases/${caseId}`, JSON.stringify({
        status: 'IN_PROGRESS',
        priority: 'HIGH'
      }), { headers });
      apiResponseTime.add(Date.now() - start);
      
      check(response, {
        'case update status is 200': (r) => r.status === 200,
      });

      // Get case details
      start = Date.now();
      response = http.get(`${BASE_URL}/api/cases/${caseId}`, { headers });
      apiResponseTime.add(Date.now() - start);
      
      check(response, {
        'case details status is 200': (r) => r.status === 200,
        'case data complete': (r) => r.json('data.title') === newCase.title,
      });
    }
  });
}

function testEntityOperations(headers) {
  group('Entity Operations', function() {
    // Create multiple entities
    const entities = [];
    for (let i = 0; i < 5; i++) {
      const entity = generateEntity();
      
      const start = Date.now();
      const response = http.post(`${BASE_URL}/api/entities`, JSON.stringify(entity), { headers });
      apiResponseTime.add(Date.now() - start);
      
      const created = check(response, {
        'entity creation status is 201': (r) => r.status === 201,
        'entity ID returned': (r) => r.json('data.id') !== null,
      });

      if (created) {
        entities.push(response.json('data.id'));
      }
    }

    // Batch get entities
    if (entities.length > 0) {
      const start = Date.now();
      const response = http.post(`${BASE_URL}/api/entities/batch`, JSON.stringify({
        entityIds: entities
      }), { headers });
      apiResponseTime.add(Date.now() - start);
      
      check(response, {
        'batch get status is 200': (r) => r.status === 200,
        'all entities returned': (r) => r.json('data').length === entities.length,
      });
    }

    // Entity relationship creation
    if (entities.length >= 2) {
      const start = Date.now();
      const response = http.post(`${BASE_URL}/api/relationships`, JSON.stringify({
        fromEntityId: entities[0],
        toEntityId: entities[1],
        type: 'RELATED_TO',
        confidence: 0.8
      }), { headers });
      apiResponseTime.add(Date.now() - start);
      
      check(response, {
        'relationship creation status is 201': (r) => r.status === 201,
      });
    }
  });
}

function testSearchOperations(headers) {
  group('Search Operations', function() {
    // Full-text search
    const searchTerms = ['investigation', 'suspicious', 'network', 'malware', 'incident'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    let start = Date.now();
    let response = http.post(`${BASE_URL}/api/search`, JSON.stringify({
      query: term,
      filters: {
        entityTypes: ['PERSON', 'ORGANIZATION'],
        dateRange: {
          from: '2024-01-01',
          to: '2024-12-31'
        }
      },
      limit: 20
    }), { headers });
    searchResponseTime.add(Date.now() - start);
    
    check(response, {
      'search status is 200': (r) => r.status === 200,
      'search results returned': (r) => r.json('data.results') !== null,
      'facets included': (r) => r.json('data.facets') !== null,
    });

    // Advanced graph search
    start = Date.now();
    response = http.post(`${BASE_URL}/api/graph/search`, JSON.stringify({
      pattern: {
        nodes: [
          { type: 'PERSON', properties: { role: 'suspect' } },
          { type: 'IP_ADDRESS' }
        ],
        edges: [
          { from: 0, to: 1, type: 'ACCESSED' }
        ]
      },
      limit: 10
    }), { headers });
    searchResponseTime.add(Date.now() - start);
    
    check(response, {
      'graph search status is 200': (r) => r.status === 200,
      'pattern matches returned': (r) => r.json('data.matches') !== null,
    });
  });
}

function testAnalyticsQueries(headers) {
  group('Analytics Queries', function() {
    // Case statistics
    let start = Date.now();
    let response = http.get(`${BASE_URL}/api/analytics/cases/stats`, { headers });
    apiResponseTime.add(Date.now() - start);
    
    check(response, {
      'case stats status is 200': (r) => r.status === 200,
      'stats data returned': (r) => r.json('data.totalCases') !== undefined,
    });

    // Entity distribution
    start = Date.now();
    response = http.get(`${BASE_URL}/api/analytics/entities/distribution`, { headers });
    apiResponseTime.add(Date.now() - start);
    
    check(response, {
      'entity distribution status is 200': (r) => r.status === 200,
      'distribution data returned': (r) => r.json('data.byType') !== null,
    });

    // Network analysis
    start = Date.now();
    response = http.post(`${BASE_URL}/api/analytics/network`, JSON.stringify({
      caseId: 'sample-case-1',
      algorithm: 'community_detection'
    }), { headers });
    apiResponseTime.add(Date.now() - start);
    
    check(response, {
      'network analysis status is 200': (r) => r.status === 200,
      'communities detected': (r) => r.json('data.communities') !== null,
    });
  });
}

function testFileOperations(headers) {
  group('File Operations', function() {
    // Generate test file
    const fileContent = 'Test file content for load testing\n'.repeat(100);
    const formData = {
      file: http.file(Buffer.from(fileContent), 'test-file.txt', 'text/plain'),
      description: 'Load test file upload',
      caseId: 'sample-case-1'
    };

    // File upload
    const start = Date.now();
    const response = http.post(`${BASE_URL}/api/files/upload`, formData, { headers });
    apiResponseTime.add(Date.now() - start);
    
    const uploaded = check(response, {
      'file upload status is 201': (r) => r.status === 201,
      'file ID returned': (r) => r.json('data.fileId') !== null,
    });

    if (uploaded) {
      const fileId = response.json('data.fileId');
      
      // File download
      const downloadStart = Date.now();
      const downloadResponse = http.get(`${BASE_URL}/api/files/${fileId}/download`, { headers });
      apiResponseTime.add(Date.now() - downloadStart);
      
      check(downloadResponse, {
        'file download status is 200': (r) => r.status === 200,
        'file content matches': (r) => r.body.includes('Test file content'),
      });

      // File metadata
      const metaStart = Date.now();
      const metaResponse = http.get(`${BASE_URL}/api/files/${fileId}/metadata`, { headers });
      apiResponseTime.add(Date.now() - metaStart);
      
      check(metaResponse, {
        'file metadata status is 200': (r) => r.status === 200,
        'metadata complete': (r) => r.json('data.filename') === 'test-file.txt',
      });
    }
  });
}

export function teardown(data) {
  console.log('API stress test completed');
  
  // Log summary metrics
  if (data.users) {
    console.log(`Tested with ${data.users.length} concurrent users`);
  }
}
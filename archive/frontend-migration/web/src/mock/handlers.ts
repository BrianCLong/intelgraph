import { rest } from 'msw'
import mockData from './data.json'

export const handlers = [
  // GraphQL endpoint
  rest.post('/graphql', (req, res, ctx) => {
    const { query, variables } = req.body as { query: string; variables?: any }
    const queryString = query.trim()

    // Health check
    if (queryString.includes('query') && queryString.includes('health')) {
      return res(
        ctx.json({
          data: {
            health: 'OK',
          },
        })
      )
    }

    // System status
    if (queryString.includes('systemStatus')) {
      return res(
        ctx.json({
          data: {
            systemStatus: {
              databases: {
                postgres: 'healthy',
                neo4j: 'healthy',
                redis: 'healthy',
              },
              performance: {
                responseTime: 45.2,
                requestsPerSecond: 156.8,
                memoryUsage: 542.1,
                cpuUsage: 23.5,
              },
              uptime: 86400,
            },
          },
        })
      )
    }

    // Entities query
    if (queryString.includes('entities')) {
      return res(
        ctx.json({
          data: {
            entities: mockData.entities,
          },
        })
      )
    }

    // Investigations query
    if (queryString.includes('investigations')) {
      return res(
        ctx.json({
          data: {
            investigations: mockData.investigations,
          },
        })
      )
    }

    // Alerts query
    if (queryString.includes('alerts')) {
      return res(
        ctx.json({
          data: {
            alerts: mockData.alerts,
          },
        })
      )
    }

    // Cases query
    if (queryString.includes('cases')) {
      return res(
        ctx.json({
          data: {
            cases: mockData.cases,
          },
        })
      )
    }

    // KPI metrics query
    if (queryString.includes('kpiMetrics')) {
      return res(
        ctx.json({
          data: {
            kpiMetrics: mockData.kpiMetrics,
          },
        })
      )
    }

    // Timeline events query
    if (queryString.includes('timelineEvents')) {
      return res(
        ctx.json({
          data: {
            timelineEvents: mockData.timelineEvents,
          },
        })
      )
    }

    // AI Analysis query
    if (queryString.includes('aiAnalysis')) {
      const text = variables?.text || 'sample text'
      
      return res(
        ctx.json({
          data: {
            aiAnalysis: {
              status: 'COMPLETED',
              confidence: 0.84,
              threatAssessment: {
                riskLevel: 'MEDIUM',
                probability: 0.68,
                recommendations: ['Enhanced monitoring', 'Access review'],
              },
              entitiesExtracted: [
                { name: 'John Anderson', type: 'PERSON', confidence: 0.95 },
                { name: '192.168.1.100', type: 'IP_ADDRESS', confidence: 0.98 },
              ],
              anomaliesDetected: [
                { type: 'unusual_time_access', description: 'Access outside normal hours', severity: 'medium' },
              ],
              processingTime: 1200,
            },
          },
        })
      )
    }

    // Create investigation mutation
    if (queryString.includes('createInvestigation')) {
      const newInvestigation = {
        id: `inv-${Date.now()}`,
        title: `New Investigation ${Date.now()}`,
        description: 'Created via API',
        status: 'draft',
        priority: 'medium',
        entityCount: 0,
        relationshipCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        metadata: {},
      }
      
      return res(
        ctx.json({
          data: {
            createInvestigation: newInvestigation,
          },
        })
      )
    }

    // Default response
    return res(
      ctx.json({
        data: null,
        errors: [{ message: 'Query not implemented in mock' }],
      })
    )
  }),

  // REST endpoints
  rest.get('/health', (req, res, ctx) => {
    return res(
      ctx.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 86400,
        services: {
          api: 'operational',
          graphql: 'operational',
          websockets: 'operational',
        },
      })
    )
  }),

  rest.get('/metrics', (req, res, ctx) => {
    return res(
      ctx.json({
        timestamp: new Date().toISOString(),
        performance: {
          responseTime: 35 + Math.random() * 20,
          requestsPerSecond: 150 + Math.random() * 50,
          memoryUsage: 500 + Math.random() * 200,
          cpuUsage: 20 + Math.random() * 30,
        },
        data: {
          investigations: mockData.investigations.length,
          entities: mockData.entities.length,
          relationships: mockData.relationships.length,
        },
      })
    )
  }),

  // Auth endpoints
  rest.post('/auth/login', (req, res, ctx) => {
    const { email, password } = req.body as { email: string; password: string }
    
    // Simple mock auth
    if (email && password) {
      return res(
        ctx.json({
          token: 'mock-jwt-token',
          user: mockData.users[0],
          expiresIn: 3600,
        })
      )
    }
    
    return res(
      ctx.status(401),
      ctx.json({ error: 'Invalid credentials' })
    )
  }),

  rest.post('/auth/logout', (req, res, ctx) => {
    return res(ctx.json({ success: true }))
  }),

  // User management
  rest.get('/users/me', (req, res, ctx) => {
    return res(ctx.json(mockData.users[0]))
  }),

  // File upload mock
  rest.post('/upload', (req, res, ctx) => {
    return res(
      ctx.json({
        id: `file-${Date.now()}`,
        filename: 'uploaded-file.csv',
        size: 1024,
        type: 'text/csv',
        url: '/files/uploaded-file.csv',
      })
    )
  }),
]
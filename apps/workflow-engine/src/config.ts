export const config = {
  server: {
    port: parseInt(process.env.WORKFLOW_ENGINE_PORT || '4005'),
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4001'],
    environment: process.env.NODE_ENV || 'development'
  },
  
  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'intelgraph',
      password: process.env.POSTGRES_PASSWORD || 'password',
      database: process.env.POSTGRES_DB || 'intelgraph',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    },
    
    neo4j: {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password'
    }
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '4') // Use different DB from other services
  },
  
  workflow: {
    maxConcurrentExecutions: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '100'),
    defaultExecutionTimeout: parseInt(process.env.DEFAULT_EXECUTION_TIMEOUT || '3600000'), // 1 hour
    maxStepsPerWorkflow: parseInt(process.env.MAX_STEPS_PER_WORKFLOW || '100'),
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '5000')
  },
  
  humanTasks: {
    defaultDueDays: parseInt(process.env.DEFAULT_DUE_DAYS || '7'),
    reminderIntervalHours: parseInt(process.env.REMINDER_INTERVAL_HOURS || '24'),
    escalationDays: parseInt(process.env.ESCALATION_DAYS || '3')
  },
  
  triggers: {
    enableScheduledTriggers: process.env.ENABLE_SCHEDULED_TRIGGERS !== 'false',
    enableWebhookTriggers: process.env.ENABLE_WEBHOOK_TRIGGERS !== 'false',
    enableEventTriggers: process.env.ENABLE_EVENT_TRIGGERS !== 'false',
    webhookSecretKey: process.env.WEBHOOK_SECRET_KEY || 'workflow-webhook-secret'
  },
  
  integrations: {
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      enabled: !!process.env.SLACK_BOT_TOKEN
    },
    jira: {
      url: process.env.JIRA_URL,
      username: process.env.JIRA_USERNAME,
      apiToken: process.env.JIRA_API_TOKEN,
      enabled: !!(process.env.JIRA_URL && process.env.JIRA_USERNAME && process.env.JIRA_API_TOKEN)
    },
    email: {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      fromAddress: process.env.EMAIL_FROM_ADDRESS,
      enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER)
    }
  },
  
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'workflow-engine-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  monitoring: {
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9095'),
    logLevel: process.env.LOG_LEVEL || 'info',
    enableTracing: process.env.ENABLE_TRACING === 'true'
  }
};
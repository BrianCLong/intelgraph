import express from 'express';
import logger from './logger';

// Metrics collection for Active Measures module
class MetricsCollector {
  private metrics: Map<string, any> = new Map();
  private startTime: number = Date.now();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set('operations_total', 0);
    this.metrics.set('operations_success', 0);
    this.metrics.set('operations_failed', 0);
    this.metrics.set('simulations_total', 0);
    this.metrics.set('simulations_completed', 0);
    this.metrics.set('audit_entries_total', 0);
    this.metrics.set('security_violations', 0);
    this.metrics.set('classification_breaches', 0);
    this.metrics.set('effectiveness_scores', []);
    this.metrics.set('response_times', []);
  }

  incrementCounter(metric: string, value: number = 1): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
    logger.debug('Metric incremented', { metric, value, newTotal: current + value });
  }

  recordHistogram(metric: string, value: number): void {
    const values = this.metrics.get(metric) || [];
    values.push(value);
    // Keep only last 1000 values for memory efficiency
    if (values.length > 1000) {
      values.shift();
    }
    this.metrics.set(metric, values);
  }

  setGauge(metric: string, value: number): void {
    this.metrics.set(metric, value);
  }

  getMetric(metric: string): any {
    return this.metrics.get(metric);
  }

  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.metrics.entries()) {
      if (Array.isArray(value)) {
        result[key] = {\n          count: value.length,\n          avg: value.reduce((a, b) => a + b, 0) / value.length || 0,\n          min: Math.min(...value) || 0,\n          max: Math.max(...value) || 0,\n        };\n      } else {\n        result[key] = value;\n      }\n    }\n    \n    result.uptime_seconds = Math.floor((Date.now() - this.startTime) / 1000);\n    return result;\n  }\n\n  // Calculate operation success rate\n  getSuccessRate(): number {\n    const total = this.getMetric('operations_total') || 0;\n    const success = this.getMetric('operations_success') || 0;\n    return total > 0 ? (success / total) * 100 : 0;\n  }\n\n  // Calculate average effectiveness score\n  getAverageEffectiveness(): number {\n    const scores = this.getMetric('effectiveness_scores') || [];\n    return scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;\n  }\n\n  // Get response time percentiles\n  getResponseTimePercentiles(): any {\n    const times = this.getMetric('response_times') || [];\n    if (times.length === 0) return { p50: 0, p95: 0, p99: 0 };\n    \n    const sorted = times.sort((a: number, b: number) => a - b);\n    return {\n      p50: sorted[Math.floor(sorted.length * 0.5)],\n      p95: sorted[Math.floor(sorted.length * 0.95)],\n      p99: sorted[Math.floor(sorted.length * 0.99)],\n    };\n  }\n}\n\nexport const metricsCollector = new MetricsCollector();\n\n// Express middleware for metrics collection\nexport function metricsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {\n  const start = Date.now();\n  \n  res.on('finish', () => {\n    const duration = Date.now() - start;\n    metricsCollector.recordHistogram('response_times', duration);\n    \n    // Track operation-specific metrics\n    if (req.path.includes('/graphql')) {\n      if (res.statusCode >= 200 && res.statusCode < 300) {\n        metricsCollector.incrementCounter('graphql_requests_success');\n      } else {\n        metricsCollector.incrementCounter('graphql_requests_failed');\n      }\n    }\n    \n    // Security metrics\n    if (res.statusCode === 401 || res.statusCode === 403) {\n      metricsCollector.incrementCounter('security_violations');\n    }\n  });\n  \n  next();\n}\n\n// Setup metrics endpoint\nexport function setupMetrics(app: express.Application): void {\n  app.get('/metrics', (req, res) => {\n    try {\n      const metrics = metricsCollector.getAllMetrics();\n      const successRate = metricsCollector.getSuccessRate();\n      const avgEffectiveness = metricsCollector.getAverageEffectiveness();\n      const responseTimePercentiles = metricsCollector.getResponseTimePercentiles();\n      \n      const response = {\n        timestamp: new Date().toISOString(),\n        service: 'active-measures-module',\n        version: '2.0.0-military-spec',\n        metrics,\n        kpis: {\n          success_rate_percent: successRate,\n          average_effectiveness_score: avgEffectiveness,\n          response_time_percentiles: responseTimePercentiles,\n        },\n        health: {\n          status: 'healthy',\n          uptime_seconds: metrics.uptime_seconds,\n        },\n      };\n      \n      res.json(response);\n    } catch (error) {\n      logger.error('Failed to generate metrics', { error: error.message });\n      res.status(500).json({ error: 'Failed to generate metrics' });\n    }\n  });\n  \n  logger.info('Metrics endpoint configured at /metrics');\n}\n\nexport default metricsCollector;
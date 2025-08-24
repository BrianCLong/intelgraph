const axios = require('axios');

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

async function checkSLOs() {
  // This is a placeholder for checking SLOs from Prometheus.
  // A real implementation would query Prometheus for the defined SLOs and compare them to the thresholds.
  console.log('Checking SLOs...');

  const queries = {
    api_latency: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="api"}[1h])))',
    api_error_rate: 'sum(rate(http_requests_total{job="api", code=~"5.."}[1h])) / sum(rate(http_requests_total{job="api"}[1h]))',
    api_query_time: 'histogram_quantile(0.95, sum(rate(graphql_query_duration_seconds_bucket{job="api"}[1h])))',
    client_page_load_time: 'histogram_quantile(0.95, sum(rate(page_load_duration_seconds_bucket{job="client"}[1h])))',
    client_api_error_rate: 'sum(rate(api_requests_total{job="client", status="error"}[1h])) / sum(rate(api_requests_total{job="client"}[1h]))',
  };

  for (const [name, query] of Object.entries(queries)) {
    try {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, { params: { query } });
      const value = parseFloat(response.data.data.result[0].value[1]);
      console.log(`${name}: ${value}`);
    } catch (error) {
      console.error(`Failed to query Prometheus for ${name}: ${error.message}`);
    }
  }
}

checkSLOs();
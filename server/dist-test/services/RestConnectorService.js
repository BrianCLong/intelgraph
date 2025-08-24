/**
 * Generic REST Connector Service
 * Connects to external REST APIs with pagination, authentication, and rate limiting
 */
const logger = require('../utils/logger');
const { trackError } = require('../monitoring/metrics');
class RestConnectorService {
    constructor(config = {}) {
        this.config = {
            timeout: config.timeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            userAgent: config.userAgent || 'IntelGraph-RestConnector/1.0',
            ...config
        };
        this.logger = logger;
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            rateLimitHits: 0
        };
    }
    /**
     * Generic HTTP request with authentication and retries
     */
    async request(options) {
        const { url, method = 'GET', headers = {}, body, auth, timeout = this.config.timeout, retries = this.config.retryAttempts } = options;
        const startTime = Date.now();
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const requestOptions = {
                    method: method.toUpperCase(),
                    headers: {
                        'User-Agent': this.config.userAgent,
                        'Accept': 'application/json',
                        ...headers
                    },
                    signal: AbortSignal.timeout(timeout)
                };
                // Add authentication
                if (auth) {
                    this.addAuthentication(requestOptions, auth);
                }
                // Add body for POST/PUT/PATCH requests
                if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
                    requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
                    requestOptions.headers['Content-Type'] = 'application/json';
                }
                this.logger.debug('Making REST request', {
                    url,
                    method,
                    attempt: attempt + 1,
                    headers: this.sanitizeHeaders(requestOptions.headers)
                });
                const response = await fetch(url, requestOptions);
                const responseTime = Date.now() - startTime;
                this.updateMetrics(responseTime, response.ok);
                if (response.ok) {
                    const contentType = response.headers.get('content-type') || '';
                    let data;
                    if (contentType.includes('application/json')) {
                        data = await response.json();
                    }
                    else {
                        data = await response.text();
                    }
                    this.logger.debug('REST request successful', {
                        url,
                        status: response.status,
                        responseTime
                    });
                    return {
                        success: true,
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries()),
                        data,
                        responseTime
                    };
                }
                else {
                    // Handle rate limiting
                    if (response.status === 429) {
                        this.metrics.rateLimitHits++;
                        const retryAfter = response.headers.get('retry-after');
                        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * this.config.retryDelay;
                        this.logger.warn('Rate limited, waiting before retry', {
                            url,
                            attempt: attempt + 1,
                            retryAfter: delay
                        });
                        if (attempt < retries) {
                            await this.sleep(delay);
                            continue;
                        }
                    }
                    const errorText = await response.text();
                    lastError = new Error(`HTTP ${response.status}: ${errorText}`);
                }
            }
            catch (error) {
                lastError = error;
                if (attempt < retries) {
                    const delay = Math.pow(2, attempt) * this.config.retryDelay;
                    this.logger.warn('Request failed, retrying', {
                        url,
                        attempt: attempt + 1,
                        error: error.message,
                        delay
                    });
                    await this.sleep(delay);
                }
            }
        }
        this.updateMetrics(Date.now() - startTime, false);
        trackError('rest_connector', 'RequestFailed');
        this.logger.error('REST request failed after retries', {
            url,
            method,
            error: lastError.message
        });
        return {
            success: false,
            error: lastError.message
        };
    }
    /**
     * GET request with pagination support
     */
    async get(url, options = {}) {
        return this.request({
            url,
            method: 'GET',
            ...options
        });
    }
    /**
     * POST request
     */
    async post(url, data, options = {}) {
        return this.request({
            url,
            method: 'POST',
            body: data,
            ...options
        });
    }
    /**
     * PUT request
     */
    async put(url, data, options = {}) {
        return this.request({
            url,
            method: 'PUT',
            body: data,
            ...options
        });
    }
    /**
     * DELETE request
     */
    async delete(url, options = {}) {
        return this.request({
            url,
            method: 'DELETE',
            ...options
        });
    }
    /**
     * Paginated data fetching
     */
    async fetchPaginated(config) {
        const { baseUrl, paginationType = 'offset', // 'offset', 'cursor', 'page'
        pageSize = 50, maxPages = 10, auth, headers, queryParams = {} } = config;
        const allData = [];
        let currentPage = 1;
        let hasMore = true;
        let nextCursor = null;
        while (hasMore && currentPage <= maxPages) {
            try {
                const url = this.buildPaginatedUrl(baseUrl, {
                    paginationType,
                    currentPage,
                    pageSize,
                    nextCursor,
                    queryParams
                });
                const response = await this.get(url, { auth, headers });
                if (!response.success) {
                    this.logger.error('Paginated request failed', {
                        url,
                        page: currentPage,
                        error: response.error
                    });
                    break;
                }
                const { data, pagination } = this.extractPaginationData(response.data, paginationType);
                allData.push(...data);
                // Determine if there are more pages
                hasMore = this.hasMorePages(pagination, paginationType, currentPage, maxPages);
                nextCursor = pagination?.nextCursor || null;
                currentPage++;
                this.logger.debug('Fetched paginated data', {
                    page: currentPage - 1,
                    itemCount: data.length,
                    totalFetched: allData.length,
                    hasMore
                });
                // Rate limiting between requests
                if (hasMore) {
                    await this.sleep(100); // 100ms between requests
                }
            }
            catch (error) {
                this.logger.error('Pagination error', {
                    page: currentPage,
                    error: error.message
                });
                break;
            }
        }
        return {
            success: true,
            data: allData,
            totalItems: allData.length,
            pagesFetched: currentPage - 1
        };
    }
    /**
     * Webhook endpoint creation helper
     */
    async setupWebhook(config) {
        const { webhookUrl, targetUrl, events = [], secret, auth, headers } = config;
        const webhookPayload = {
            url: targetUrl,
            events: events,
            active: true,
            ...(secret && { secret })
        };
        const response = await this.post(webhookUrl, webhookPayload, { auth, headers });
        if (response.success) {
            this.logger.info('Webhook created successfully', {
                webhookUrl,
                targetUrl,
                events
            });
        }
        return response;
    }
    /**
     * Batch request processing
     */
    async batchRequests(requests, options = {}) {
        const { concurrency = 5, batchSize = 10, delayBetweenBatches = 1000 } = options;
        const results = [];
        const batches = this.createBatches(requests, batchSize);
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            this.logger.debug('Processing batch', {
                batchIndex: i + 1,
                totalBatches: batches.length,
                batchSize: batch.length
            });
            const batchPromises = batch.map(request => this.request(request).catch(error => ({ success: false, error: error.message })));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            // Delay between batches
            if (i < batches.length - 1) {
                await this.sleep(delayBetweenBatches);
            }
        }
        return {
            success: true,
            results,
            totalRequests: requests.length,
            successfulRequests: results.filter(r => r.success).length,
            failedRequests: results.filter(r => !r.success).length
        };
    }
    /**
     * Helper methods
     */
    addAuthentication(requestOptions, auth) {
        switch (auth.type) {
            case 'bearer':
                requestOptions.headers['Authorization'] = `Bearer ${auth.token}`;
                break;
            case 'basic':
                const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                requestOptions.headers['Authorization'] = `Basic ${credentials}`;
                break;
            case 'apikey':
                if (auth.header) {
                    requestOptions.headers[auth.header] = auth.key;
                }
                else {
                    requestOptions.headers['X-API-Key'] = auth.key;
                }
                break;
            case 'oauth2':
                requestOptions.headers['Authorization'] = `Bearer ${auth.accessToken}`;
                break;
            default:
                this.logger.warn('Unknown authentication type', { type: auth.type });
        }
    }
    buildPaginatedUrl(baseUrl, config) {
        const { paginationType, currentPage, pageSize, nextCursor, queryParams } = config;
        const url = new URL(baseUrl);
        // Add base query params
        Object.entries(queryParams).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        switch (paginationType) {
            case 'offset':
                url.searchParams.set('limit', pageSize.toString());
                url.searchParams.set('offset', ((currentPage - 1) * pageSize).toString());
                break;
            case 'page':
                url.searchParams.set('per_page', pageSize.toString());
                url.searchParams.set('page', currentPage.toString());
                break;
            case 'cursor':
                url.searchParams.set('limit', pageSize.toString());
                if (nextCursor) {
                    url.searchParams.set('cursor', nextCursor);
                }
                break;
        }
        return url.toString();
    }
    extractPaginationData(responseData, paginationType) {
        // This is a generic implementation - specific APIs may need custom logic
        if (Array.isArray(responseData)) {
            return {
                data: responseData,
                pagination: { hasMore: responseData.length > 0 }
            };
        }
        // Common patterns
        if (responseData.data && Array.isArray(responseData.data)) {
            return {
                data: responseData.data,
                pagination: responseData.pagination || responseData.meta || {}
            };
        }
        if (responseData.results && Array.isArray(responseData.results)) {
            return {
                data: responseData.results,
                pagination: responseData
            };
        }
        return {
            data: responseData.items || [],
            pagination: responseData
        };
    }
    hasMorePages(pagination, paginationType, currentPage, maxPages) {
        if (currentPage >= maxPages)
            return false;
        switch (paginationType) {
            case 'cursor':
                return !!pagination.nextCursor || !!pagination.next_cursor;
            case 'offset':
                return pagination.hasMore || (pagination.total && (currentPage * pagination.limit) < pagination.total);
            case 'page':
                return pagination.hasNextPage || (pagination.totalPages && currentPage < pagination.totalPages);
            default:
                return false;
        }
    }
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        if (sanitized.Authorization) {
            sanitized.Authorization = sanitized.Authorization.replace(/Bearer\s+(.+)/, 'Bearer ***');
        }
        return sanitized;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    updateMetrics(responseTime, success) {
        this.metrics.totalRequests++;
        if (success) {
            this.metrics.successfulRequests++;
        }
        else {
            this.metrics.failedRequests++;
        }
        const currentAvg = this.metrics.averageResponseTime;
        this.metrics.averageResponseTime = currentAvg
            ? (currentAvg + responseTime) / 2
            : responseTime;
    }
    /**
     * Health check and metrics
     */
    getHealth() {
        const successRate = this.metrics.totalRequests > 0
            ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(1) + '%'
            : '100%';
        return {
            status: 'healthy',
            metrics: {
                totalRequests: this.metrics.totalRequests,
                successfulRequests: this.metrics.successfulRequests,
                failedRequests: this.metrics.failedRequests,
                successRate,
                averageResponseTime: Math.round(this.metrics.averageResponseTime),
                rateLimitHits: this.metrics.rateLimitHits
            },
            config: {
                timeout: this.config.timeout,
                retryAttempts: this.config.retryAttempts,
                retryDelay: this.config.retryDelay,
                userAgent: this.config.userAgent
            }
        };
    }
}
module.exports = RestConnectorService;
//# sourceMappingURL=RestConnectorService.js.map
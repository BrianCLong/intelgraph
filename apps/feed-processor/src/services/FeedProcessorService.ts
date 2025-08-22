import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';
import { RedisClientType } from 'redis';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosResponse } from 'axios';
import * as xml2js from 'xml2js';
import { pipeline, Transform } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

export interface FeedSource {
  id: string;
  name: string;
  type: 'rss' | 'json' | 'xml' | 'csv' | 'stix' | 'taxii' | 'api' | 'webhook' | 'file';
  url?: string;
  configuration: {
    pollInterval: number; // milliseconds
    authentication?: {
      type: 'none' | 'basic' | 'bearer' | 'api_key';
      credentials: Record<string, string>;
    };
    format: {
      encoding?: string;
      delimiter?: string; // for CSV
      rootElement?: string; // for XML
      mapping: Record<string, string>; // field mapping
    };
    filters?: {
      includePatterns: string[];
      excludePatterns: string[];
      fieldFilters: { field: string; operator: string; value: any }[];
    };
    enrichment?: {
      geoLocation: boolean;
      entityExtraction: boolean;
      threatIntelligence: boolean;
      sentiment: boolean;
    };
  };
  status: 'active' | 'inactive' | 'error' | 'paused';
  lastPoll?: Date;
  lastSuccess?: Date;
  errorCount: number;
  totalProcessed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessedFeedItem {
  id: string;
  sourceId: string;
  originalId?: string;
  title: string;
  description?: string;
  content?: string;
  publishedAt: Date;
  url?: string;
  author?: string;
  category?: string;
  tags: string[];
  rawData: Record<string, any>;
  processedData: {
    entities?: ExtractedEntity[];
    geolocation?: GeolocationData;
    sentiment?: SentimentData;
    threatIndicators?: ThreatIndicator[];
    relevanceScore?: number;
  };
  processingStatus: 'pending' | 'processed' | 'enriched' | 'stored' | 'error';
  processingErrors?: string[];
  processedAt?: Date;
}

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'location' | 'event' | 'product' | 'misc';
  text: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  properties?: Record<string, any>;
}

export interface GeolocationData {
  locations: {
    name: string;
    latitude: number;
    longitude: number;
    countryCode: string;
    confidence: number;
  }[];
}

export interface SentimentData {
  score: number; // -1 to 1
  magnitude: number; // 0 to infinity
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface ThreatIndicator {
  type: 'domain' | 'ip' | 'url' | 'hash' | 'email' | 'cve';
  value: string;
  confidence: number;
  malicious: boolean;
  source: string;
  firstSeen?: Date;
  lastSeen?: Date;
  context?: string;
}

export interface FeedProcessingStats {
  sourceId: string;
  totalItems: number;
  processedItems: number;
  errorItems: number;
  averageProcessingTime: number;
  itemsPerMinute: number;
  lastProcessingTime: Date;
}

export class FeedProcessorService extends EventEmitter {
  private activePollIntervals = new Map<string, NodeJS.Timeout>();
  private processingQueues = new Map<string, ProcessedFeedItem[]>();
  private isProcessing = false;

  constructor(
    private pgPool: Pool,
    private neo4jDriver: Driver,
    private redisClient: RedisClientType
  ) {
    super();
    this.startProcessingLoop();
  }

  async createFeedSource(
    source: Omit<FeedSource, 'id' | 'createdAt' | 'updatedAt' | 'errorCount' | 'totalProcessed'>,
    userId: string
  ): Promise<FeedSource> {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const sourceId = uuidv4();
      const now = new Date();
      
      const feedSource: FeedSource = {
        ...source,
        id: sourceId,
        errorCount: 0,
        totalProcessed: 0,
        createdAt: now,
        updatedAt: now
      };
      
      const query = `
        INSERT INTO feed_sources (
          id, name, type, url, configuration, status, error_count, 
          total_processed, created_at, updated_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      await client.query(query, [
        sourceId,
        source.name,
        source.type,
        source.url,
        JSON.stringify(source.configuration),
        source.status,
        0,
        0,
        now,
        now,
        userId
      ]);
      
      await client.query('COMMIT');
      
      // Start polling if source is active
      if (source.status === 'active') {
        this.startPolling(feedSource);
      }
      
      logger.info(`Feed source created: ${sourceId} (${source.name})`);
      this.emit('feed.source.created', feedSource);
      
      return feedSource;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating feed source:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async startPolling(source: FeedSource): Promise<void> {
    if (this.activePollIntervals.has(source.id)) {
      this.stopPolling(source.id);
    }
    
    logger.info(`Starting polling for feed source: ${source.name} (${source.id})`);
    
    // Initial poll
    this.pollFeedSource(source);
    
    // Set up interval polling
    const interval = setInterval(() => {
      this.pollFeedSource(source);
    }, source.configuration.pollInterval);
    
    this.activePollIntervals.set(source.id, interval);
  }

  async stopPolling(sourceId: string): Promise<void> {
    const interval = this.activePollIntervals.get(sourceId);
    if (interval) {
      clearInterval(interval);
      this.activePollIntervals.delete(sourceId);
      logger.info(`Stopped polling for feed source: ${sourceId}`);
    }
  }

  private async pollFeedSource(source: FeedSource): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.debug(`Polling feed source: ${source.name}`);
      
      let data: any;
      
      switch (source.type) {
        case 'rss':
        case 'xml':
          data = await this.fetchXmlFeed(source);
          break;
        case 'json':
        case 'api':
          data = await this.fetchJsonFeed(source);
          break;
        case 'csv':
          data = await this.fetchCsvFeed(source);
          break;
        case 'stix':
        case 'taxii':
          data = await this.fetchStixFeed(source);
          break;
        default:
          throw new Error(`Unsupported feed type: ${source.type}`);
      }
      
      const items = this.parseFeedData(data, source);
      const filteredItems = this.applyFilters(items, source);
      
      // Queue items for processing
      this.queueItemsForProcessing(filteredItems, source);
      
      // Update source status
      await this.updateSourceStatus(source.id, {
        lastPoll: new Date(),
        lastSuccess: new Date(),
        totalProcessed: source.totalProcessed + filteredItems.length
      });
      
      const processingTime = Date.now() - startTime;
      logger.info(`Polled feed source: ${source.name}, ${filteredItems.length} items, ${processingTime}ms`);
      
      this.emit('feed.poll.completed', {
        sourceId: source.id,
        itemCount: filteredItems.length,
        processingTime
      });
      
    } catch (error) {
      logger.error(`Error polling feed source ${source.name}:`, error);
      
      const newErrorCount = source.errorCount + 1;
      await this.updateSourceStatus(source.id, {
        lastPoll: new Date(),
        errorCount: newErrorCount,
        status: newErrorCount > 5 ? 'error' : source.status
      });
      
      this.emit('feed.poll.error', {
        sourceId: source.id,
        error: error.message,
        errorCount: newErrorCount
      });
    }
  }

  private async fetchXmlFeed(source: FeedSource): Promise<any> {
    const response = await this.makeHttpRequest(source);
    const parser = new xml2js.Parser();
    return parser.parseStringPromise(response.data);
  }

  private async fetchJsonFeed(source: FeedSource): Promise<any> {
    const response = await this.makeHttpRequest(source);
    return response.data;
  }

  private async fetchCsvFeed(source: FeedSource): Promise<any> {
    const response = await this.makeHttpRequest(source);
    // CSV parsing would be implemented here
    return response.data;
  }

  private async fetchStixFeed(source: FeedSource): Promise<any> {
    const response = await this.makeHttpRequest(source);
    return response.data;
  }

  private async makeHttpRequest(source: FeedSource): Promise<AxiosResponse> {
    if (!source.url) {
      throw new Error('Feed source URL is required');
    }
    
    const config: any = {
      url: source.url,
      method: 'GET',
      timeout: 30000,
      headers: {
        'User-Agent': 'IntelGraph-FeedProcessor/1.0'
      }
    };
    
    // Add authentication
    const auth = source.configuration.authentication;
    if (auth && auth.type !== 'none') {
      switch (auth.type) {
        case 'basic':
          config.auth = {
            username: auth.credentials.username,
            password: auth.credentials.password
          };
          break;
        case 'bearer':
          config.headers['Authorization'] = `Bearer ${auth.credentials.token}`;
          break;
        case 'api_key':
          if (auth.credentials.header) {
            config.headers[auth.credentials.header] = auth.credentials.key;
          } else {
            config.params = { api_key: auth.credentials.key };
          }
          break;
      }
    }
    
    return axios(config);
  }

  private parseFeedData(data: any, source: FeedSource): ProcessedFeedItem[] {
    const items: ProcessedFeedItem[] = [];
    const mapping = source.configuration.format.mapping;
    
    try {
      let feedItems: any[] = [];
      
      switch (source.type) {
        case 'rss':
          feedItems = data.rss?.channel?.[0]?.item || [];
          break;
        case 'json':
          feedItems = Array.isArray(data) ? data : data.items || data.results || [data];
          break;
        case 'xml':
          const rootElement = source.configuration.format.rootElement || 'items';
          feedItems = data[rootElement] || [];
          break;
        case 'stix':
          feedItems = data.objects || [];
          break;
        default:
          feedItems = [data];
      }
      
      feedItems.forEach((item, index) => {
        try {
          const processedItem: ProcessedFeedItem = {
            id: uuidv4(),
            sourceId: source.id,
            originalId: this.extractField(item, mapping.id || 'id'),
            title: this.extractField(item, mapping.title || 'title') || `Item ${index}`,
            description: this.extractField(item, mapping.description || 'description'),
            content: this.extractField(item, mapping.content || 'content'),
            publishedAt: this.parseDate(this.extractField(item, mapping.publishedAt || 'pubDate')),
            url: this.extractField(item, mapping.url || 'link'),
            author: this.extractField(item, mapping.author || 'author'),
            category: this.extractField(item, mapping.category || 'category'),
            tags: this.extractTags(item, mapping.tags || 'tags'),
            rawData: item,
            processedData: {},
            processingStatus: 'pending'
          };
          
          items.push(processedItem);
        } catch (error) {
          logger.warn(`Error parsing feed item ${index}:`, error);
        }
      });
      
    } catch (error) {
      logger.error('Error parsing feed data:', error);
      throw error;
    }
    
    return items;
  }

  private extractField(item: any, path: string): any {
    if (!path || !item) return undefined;
    
    return path.split('.').reduce((current, key) => {
      if (Array.isArray(current) && current.length > 0) {
        current = current[0];
      }
      return current?.[key];
    }, item);
  }

  private extractTags(item: any, path: string): string[] {
    const value = this.extractField(item, path);
    if (!value) return [];
    
    if (Array.isArray(value)) {
      return value.map(v => String(v));
    }
    
    if (typeof value === 'string') {
      return value.split(/[,;]/).map(tag => tag.trim()).filter(Boolean);
    }
    
    return [String(value)];
  }

  private parseDate(dateStr: any): Date {
    if (!dateStr) return new Date();
    
    if (dateStr instanceof Date) return dateStr;
    
    try {
      return new Date(dateStr);
    } catch {
      return new Date();
    }
  }

  private applyFilters(items: ProcessedFeedItem[], source: FeedSource): ProcessedFeedItem[] {
    const filters = source.configuration.filters;
    if (!filters) return items;
    
    return items.filter(item => {
      // Include patterns
      if (filters.includePatterns?.length > 0) {
        const content = `${item.title} ${item.description} ${item.content}`.toLowerCase();
        if (!filters.includePatterns.some(pattern => content.includes(pattern.toLowerCase()))) {
          return false;
        }
      }
      
      // Exclude patterns
      if (filters.excludePatterns?.length > 0) {
        const content = `${item.title} ${item.description} ${item.content}`.toLowerCase();
        if (filters.excludePatterns.some(pattern => content.includes(pattern.toLowerCase()))) {
          return false;
        }
      }
      
      // Field filters
      if (filters.fieldFilters?.length > 0) {
        return filters.fieldFilters.every(filter => {
          const value = this.extractField(item, filter.field);
          return this.evaluateFilter(value, filter.operator, filter.value);
        });
      }
      
      return true;
    });
  }

  private evaluateFilter(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'eq': return value === filterValue;
      case 'ne': return value !== filterValue;
      case 'gt': return value > filterValue;
      case 'gte': return value >= filterValue;
      case 'lt': return value < filterValue;
      case 'lte': return value <= filterValue;
      case 'contains': return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'startsWith': return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'endsWith': return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'in': return Array.isArray(filterValue) && filterValue.includes(value);
      case 'regex': return new RegExp(filterValue).test(String(value));
      default: return true;
    }
  }

  private queueItemsForProcessing(items: ProcessedFeedItem[], source: FeedSource): void {
    if (!this.processingQueues.has(source.id)) {
      this.processingQueues.set(source.id, []);
    }
    
    const queue = this.processingQueues.get(source.id)!;
    queue.push(...items);
    
    logger.debug(`Queued ${items.length} items for processing from ${source.name}`);
    this.emit('items.queued', { sourceId: source.id, count: items.length });
  }

  private async startProcessingLoop(): Promise<void> {
    setInterval(async () => {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      
      try {
        for (const [sourceId, queue] of this.processingQueues) {
          if (queue.length === 0) continue;
          
          const batchSize = 10; // Process in batches
          const batch = queue.splice(0, batchSize);
          
          await this.processBatch(batch);
        }
      } catch (error) {
        logger.error('Error in processing loop:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  private async processBatch(items: ProcessedFeedItem[]): Promise<void> {
    const promises = items.map(item => this.processItem(item));
    await Promise.allSettled(promises);
  }

  private async processItem(item: ProcessedFeedItem): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.debug(`Processing item: ${item.title}`);
      
      // Get source configuration for enrichment
      const source = await this.getFeedSource(item.sourceId);
      if (!source) {
        throw new Error('Feed source not found');
      }
      
      const enrichment = source.configuration.enrichment;
      
      // Entity extraction
      if (enrichment?.entityExtraction) {
        item.processedData.entities = await this.extractEntities(item);
      }
      
      // Geolocation
      if (enrichment?.geoLocation) {
        item.processedData.geolocation = await this.extractGeolocation(item);
      }
      
      // Sentiment analysis
      if (enrichment?.sentiment) {
        item.processedData.sentiment = await this.analyzeSentiment(item);
      }
      
      // Threat intelligence
      if (enrichment?.threatIntelligence) {
        item.processedData.threatIndicators = await this.extractThreatIndicators(item);
      }
      
      // Calculate relevance score
      item.processedData.relevanceScore = this.calculateRelevanceScore(item);
      
      // Store processed item
      await this.storeProcessedItem(item);
      
      item.processingStatus = 'stored';
      item.processedAt = new Date();
      
      const processingTime = Date.now() - startTime;
      logger.debug(`Processed item: ${item.title} in ${processingTime}ms`);
      
      this.emit('item.processed', {
        itemId: item.id,
        sourceId: item.sourceId,
        processingTime
      });
      
    } catch (error) {
      logger.error(`Error processing item ${item.id}:`, error);
      
      item.processingStatus = 'error';
      item.processingErrors = [error.message];
      item.processedAt = new Date();
      
      this.emit('item.error', {
        itemId: item.id,
        sourceId: item.sourceId,
        error: error.message
      });
    }
  }

  private async extractEntities(item: ProcessedFeedItem): Promise<ExtractedEntity[]> {
    // Placeholder for entity extraction using NLP
    const content = `${item.title} ${item.description} ${item.content}`.toLowerCase();
    const entities: ExtractedEntity[] = [];
    
    // Simple pattern-based entity extraction (in production, use NLP libraries)
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      ip: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      domain: /\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g,
      cve: /CVE-\d{4}-\d{4,7}/gi
    };
    
    Object.entries(patterns).forEach(([type, pattern]) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        entities.push({
          type: type as any,
          text: match[0],
          confidence: 0.8,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    });
    
    return entities;
  }

  private async extractGeolocation(item: ProcessedFeedItem): Promise<GeolocationData> {
    // Placeholder for geolocation extraction
    return { locations: [] };
  }

  private async analyzeSentiment(item: ProcessedFeedItem): Promise<SentimentData> {
    // Placeholder for sentiment analysis
    const content = `${item.title} ${item.description}`.toLowerCase();
    
    // Simple keyword-based sentiment (in production, use ML models)
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'success'];
    const negativeWords = ['bad', 'terrible', 'negative', 'failure', 'attack', 'breach'];
    
    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;
    
    let score = 0;
    let label: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    if (positiveCount > negativeCount) {
      score = 0.5;
      label = 'positive';
    } else if (negativeCount > positiveCount) {
      score = -0.5;
      label = 'negative';
    }
    
    return {
      score,
      magnitude: Math.abs(score),
      label,
      confidence: 0.6
    };
  }

  private async extractThreatIndicators(item: ProcessedFeedItem): Promise<ThreatIndicator[]> {
    const indicators: ThreatIndicator[] = [];
    const content = `${item.title} ${item.description} ${item.content}`;
    
    // Extract IOCs from entities
    if (item.processedData.entities) {
      item.processedData.entities.forEach(entity => {
        let type: ThreatIndicator['type'] | null = null;
        
        switch (entity.type) {
          case 'email':
            type = 'email';
            break;
          case 'ip':
            type = 'ip';
            break;
          case 'domain':
            type = 'domain';
            break;
        }
        
        if (type) {
          indicators.push({
            type,
            value: entity.text,
            confidence: entity.confidence,
            malicious: false, // Would check against threat intel feeds
            source: item.sourceId,
            context: item.title
          });
        }
      });
    }
    
    return indicators;
  }

  private calculateRelevanceScore(item: ProcessedFeedItem): number {
    let score = 0.5; // Base score
    
    // Boost based on number of entities found
    if (item.processedData.entities) {
      score += Math.min(item.processedData.entities.length * 0.1, 0.3);
    }
    
    // Boost based on threat indicators
    if (item.processedData.threatIndicators) {
      score += Math.min(item.processedData.threatIndicators.length * 0.2, 0.4);
    }
    
    // Adjust based on sentiment (negative content might be more relevant for security)
    if (item.processedData.sentiment?.label === 'negative') {
      score += 0.1;
    }
    
    // Recency boost (newer items are more relevant)
    const ageInDays = (Date.now() - item.publishedAt.getTime()) / (24 * 60 * 60 * 1000);
    if (ageInDays < 1) {
      score += 0.2;
    } else if (ageInDays < 7) {
      score += 0.1;
    }
    
    return Math.min(Math.max(score, 0), 1);
  }

  private async storeProcessedItem(item: ProcessedFeedItem): Promise<void> {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Store feed item
      const insertItemQuery = `
        INSERT INTO feed_items (
          id, source_id, original_id, title, description, content, published_at,
          url, author, category, tags, raw_data, processed_data, 
          processing_status, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;
      
      await client.query(insertItemQuery, [
        item.id,
        item.sourceId,
        item.originalId,
        item.title,
        item.description,
        item.content,
        item.publishedAt,
        item.url,
        item.author,
        item.category,
        JSON.stringify(item.tags),
        JSON.stringify(item.rawData),
        JSON.stringify(item.processedData),
        item.processingStatus,
        item.processedAt
      ]);
      
      // Create entities in graph if extracted
      if (item.processedData.entities && item.processedData.entities.length > 0) {
        await this.createGraphEntities(item);
      }
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error storing processed item:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async createGraphEntities(item: ProcessedFeedItem): Promise<void> {
    const session = this.neo4jDriver.session();
    
    try {
      // Create feed item node
      await session.run(`
        CREATE (item:FeedItem {
          id: $id,
          title: $title,
          source: $source,
          publishedAt: datetime($publishedAt),
          url: $url,
          relevanceScore: $relevanceScore
        })
      `, {
        id: item.id,
        title: item.title,
        source: item.sourceId,
        publishedAt: item.publishedAt.toISOString(),
        url: item.url,
        relevanceScore: item.processedData.relevanceScore || 0
      });
      
      // Create entity nodes and relationships
      for (const entity of item.processedData.entities || []) {
        await session.run(`
          MERGE (e:Entity {value: $value, type: $type})
          ON CREATE SET 
            e.id = randomUUID(),
            e.confidence = $confidence,
            e.createdAt = datetime()
          WITH e
          MATCH (item:FeedItem {id: $itemId})
          CREATE (item)-[:MENTIONS {
            confidence: $confidence,
            startIndex: $startIndex,
            endIndex: $endIndex
          }]->(e)
        `, {
          value: entity.text,
          type: entity.type,
          confidence: entity.confidence,
          itemId: item.id,
          startIndex: entity.startIndex,
          endIndex: entity.endIndex
        });
      }
      
    } catch (error) {
      logger.error('Error creating graph entities:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  private async updateSourceStatus(sourceId: string, updates: Partial<FeedSource>): Promise<void> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClause.push(`${columnName} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });
    
    if (setClause.length === 0) return;
    
    const query = `
      UPDATE feed_sources 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
    `;
    
    values.push(sourceId);
    
    await this.pgPool.query(query, values);
  }

  async getFeedSource(sourceId: string): Promise<FeedSource | null> {
    const query = 'SELECT * FROM feed_sources WHERE id = $1';
    const result = await this.pgPool.query(query, [sourceId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url,
      configuration: row.configuration,
      status: row.status,
      lastPoll: row.last_poll,
      lastSuccess: row.last_success,
      errorCount: row.error_count,
      totalProcessed: row.total_processed,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getFeedStats(sourceId?: string): Promise<FeedProcessingStats[]> {
    let query = `
      SELECT 
        fs.id as source_id,
        fs.name as source_name,
        COUNT(fi.id) as total_items,
        COUNT(CASE WHEN fi.processing_status = 'stored' THEN 1 END) as processed_items,
        COUNT(CASE WHEN fi.processing_status = 'error' THEN 1 END) as error_items,
        AVG(EXTRACT(EPOCH FROM (fi.processed_at - fi.published_at))) as avg_processing_time,
        COUNT(fi.id) FILTER (WHERE fi.processed_at >= NOW() - INTERVAL '1 minute') as items_last_minute,
        MAX(fi.processed_at) as last_processing_time
      FROM feed_sources fs
      LEFT JOIN feed_items fi ON fs.id = fi.source_id
    `;
    
    const params = [];
    if (sourceId) {
      query += ' WHERE fs.id = $1';
      params.push(sourceId);
    }
    
    query += ' GROUP BY fs.id, fs.name ORDER BY fs.name';
    
    const result = await this.pgPool.query(query, params);
    
    return result.rows.map(row => ({
      sourceId: row.source_id,
      totalItems: parseInt(row.total_items),
      processedItems: parseInt(row.processed_items),
      errorItems: parseInt(row.error_items),
      averageProcessingTime: parseFloat(row.avg_processing_time) || 0,
      itemsPerMinute: parseInt(row.items_last_minute),
      lastProcessingTime: row.last_processing_time
    }));
  }

  async pauseSource(sourceId: string): Promise<void> {
    await this.updateSourceStatus(sourceId, { status: 'paused' });
    this.stopPolling(sourceId);
    
    this.emit('feed.source.paused', { sourceId });
    logger.info(`Feed source paused: ${sourceId}`);
  }

  async resumeSource(sourceId: string): Promise<void> {
    const source = await this.getFeedSource(sourceId);
    if (source) {
      await this.updateSourceStatus(sourceId, { status: 'active' });
      await this.startPolling(source);
      
      this.emit('feed.source.resumed', { sourceId });
      logger.info(`Feed source resumed: ${sourceId}`);
    }
  }

  async deleteSource(sourceId: string): Promise<void> {
    this.stopPolling(sourceId);
    
    const client = await this.pgPool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete feed items
      await client.query('DELETE FROM feed_items WHERE source_id = $1', [sourceId]);
      
      // Delete source
      await client.query('DELETE FROM feed_sources WHERE id = $1', [sourceId]);
      
      await client.query('COMMIT');
      
      this.emit('feed.source.deleted', { sourceId });
      logger.info(`Feed source deleted: ${sourceId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
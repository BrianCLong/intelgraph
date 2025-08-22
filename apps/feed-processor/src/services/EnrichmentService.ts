import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import axios from 'axios';
import { ProcessedFeedItem, ExtractedEntity, GeolocationData, SentimentData, ThreatIndicator } from './FeedProcessorService';

export interface EnrichmentProvider {
  id: string;
  name: string;
  type: 'geolocation' | 'sentiment' | 'threat_intel' | 'entity_extraction' | 'translation';
  apiUrl: string;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  isActive: boolean;
  cost?: {
    perRequest: number;
    currency: string;
  };
}

export interface GeocodingResult {
  location: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  countryName: string;
  region: string;
  city: string;
  confidence: number;
  source: string;
}

export interface ThreatIntelResult {
  indicator: string;
  type: 'domain' | 'ip' | 'url' | 'hash' | 'email';
  malicious: boolean;
  confidence: number;
  sources: string[];
  categories: string[];
  lastSeen?: Date;
  firstSeen?: Date;
  reputation?: number;
  context?: {
    family?: string;
    campaign?: string;
    actor?: string;
  };
}

export interface EntityExtractionResult {
  entities: ExtractedEntity[];
  relationships: {
    entity1: string;
    entity2: string;
    relationship: string;
    confidence: number;
  }[];
  topics: {
    topic: string;
    confidence: number;
  }[];
}

export class EnrichmentService {
  private rateLimiters = new Map<string, { requests: number; resetTime: number }>();
  private providers: Map<string, EnrichmentProvider> = new Map();

  constructor(
    private pgPool: Pool,
    private redisClient: RedisClientType
  ) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize built-in enrichment providers
    const builtInProviders: EnrichmentProvider[] = [
      {
        id: 'openstreetmap-geocoding',
        name: 'OpenStreetMap Nominatim',
        type: 'geolocation',
        apiUrl: 'https://nominatim.openstreetmap.org/search',
        rateLimit: { requestsPerMinute: 60, burstLimit: 10 },
        isActive: true
      },
      {
        id: 'virustotal-threat',
        name: 'VirusTotal',
        type: 'threat_intel',
        apiUrl: 'https://www.virustotal.com/vtapi/v2',
        apiKey: process.env.VIRUSTOTAL_API_KEY,
        rateLimit: { requestsPerMinute: 4, burstLimit: 1 },
        isActive: !!process.env.VIRUSTOTAL_API_KEY,
        cost: { perRequest: 0.01, currency: 'USD' }
      },
      {
        id: 'abuseipdb-threat',
        name: 'AbuseIPDB',
        type: 'threat_intel',
        apiUrl: 'https://api.abuseipdb.com/api/v2',
        apiKey: process.env.ABUSEIPDB_API_KEY,
        rateLimit: { requestsPerMinute: 1000, burstLimit: 10 },
        isActive: !!process.env.ABUSEIPDB_API_KEY
      },
      {
        id: 'textrazor-entities',
        name: 'TextRazor',
        type: 'entity_extraction',
        apiUrl: 'https://api.textrazor.com',
        apiKey: process.env.TEXTRAZOR_API_KEY,
        rateLimit: { requestsPerMinute: 500, burstLimit: 20 },
        isActive: !!process.env.TEXTRAZOR_API_KEY,
        cost: { perRequest: 0.001, currency: 'USD' }
      }
    ];

    builtInProviders.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  async enrichItem(item: ProcessedFeedItem): Promise<ProcessedFeedItem> {
    const enrichedItem = { ...item };
    
    try {
      // Entity extraction
      const entities = await this.extractEntitiesAdvanced(item);
      if (entities.entities.length > 0) {
        enrichedItem.processedData.entities = entities.entities;
      }

      // Geolocation enrichment
      const locations = await this.enrichGeolocation(item);
      if (locations.length > 0) {
        enrichedItem.processedData.geolocation = { locations };
      }

      // Threat intelligence enrichment
      const threatIndicators = await this.enrichThreatIntelligence(item);
      if (threatIndicators.length > 0) {
        enrichedItem.processedData.threatIndicators = threatIndicators;
      }

      // Sentiment analysis
      const sentiment = await this.analyzeSentimentAdvanced(item);
      if (sentiment) {
        enrichedItem.processedData.sentiment = sentiment;
      }

      logger.debug(`Enriched item: ${item.title}`, {
        entities: entities.entities.length,
        locations: locations.length,
        threats: threatIndicators.length
      });

    } catch (error) {
      logger.error(`Error enriching item ${item.id}:`, error);
      enrichedItem.processingErrors = [...(enrichedItem.processingErrors || []), error.message];
    }

    return enrichedItem;
  }

  async extractEntitiesAdvanced(item: ProcessedFeedItem): Promise<EntityExtractionResult> {
    const provider = this.providers.get('textrazor-entities');
    if (!provider || !provider.isActive) {
      return this.extractEntitiesBasic(item);
    }

    const text = `${item.title}\n${item.description}\n${item.content}`.slice(0, 200000); // API limit
    
    try {
      if (!await this.checkRateLimit(provider.id)) {
        logger.warn(`Rate limit exceeded for ${provider.name}`);
        return this.extractEntitiesBasic(item);
      }

      const response = await axios.post(provider.apiUrl, 
        `text=${encodeURIComponent(text)}&extractors=entities,relations,topics`,
        {
          headers: {
            'X-TextRazor-Key': provider.apiKey!,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000
        }
      );

      const result = response.data.response;
      
      const entities: ExtractedEntity[] = (result.entities || []).map((entity: any) => ({
        type: this.mapEntityType(entity.type),
        text: entity.matchedText,
        confidence: entity.confidenceScore || 0.5,
        startIndex: entity.startingPos || 0,
        endIndex: entity.endingPos || 0,
        properties: {
          wikipediaLink: entity.wikipediaLink,
          freebaseId: entity.freebaseId,
          types: entity.type
        }
      }));

      const relationships = (result.relations || []).map((rel: any) => ({
        entity1: rel.params?.[0]?.entityId || '',
        entity2: rel.params?.[1]?.entityId || '',
        relationship: rel.predicate || 'RELATED_TO',
        confidence: rel.confidenceScore || 0.5
      }));

      const topics = (result.topics || []).map((topic: any) => ({
        topic: topic.label,
        confidence: topic.score || 0.5
      }));

      await this.updateRateLimit(provider.id);

      return { entities, relationships, topics };

    } catch (error) {
      logger.error(`Error calling TextRazor API:`, error);
      return this.extractEntitiesBasic(item);
    }
  }

  private extractEntitiesBasic(item: ProcessedFeedItem): EntityExtractionResult {
    const text = `${item.title} ${item.description} ${item.content}`.toLowerCase();
    const entities: ExtractedEntity[] = [];

    // Basic regex patterns for common entities
    const patterns = {
      email: {
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        type: 'email' as const
      },
      ip: {
        regex: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
        type: 'ip' as const
      },
      domain: {
        regex: /\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g,
        type: 'domain' as const
      },
      url: {
        regex: /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
        type: 'url' as const
      },
      cve: {
        regex: /CVE-\d{4}-\d{4,7}/gi,
        type: 'vulnerability' as const
      },
      hash_md5: {
        regex: /\b[a-fA-F0-9]{32}\b/g,
        type: 'hash' as const
      },
      hash_sha1: {
        regex: /\b[a-fA-F0-9]{40}\b/g,
        type: 'hash' as const
      },
      hash_sha256: {
        regex: /\b[a-fA-F0-9]{64}\b/g,
        type: 'hash' as const
      }
    };

    Object.entries(patterns).forEach(([patternName, { regex, type }]) => {
      let match;
      const regexCopy = new RegExp(regex.source, regex.flags);
      
      while ((match = regexCopy.exec(text)) !== null) {
        entities.push({
          type: type as any,
          text: match[0],
          confidence: 0.8,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          properties: { extractionMethod: 'regex', pattern: patternName }
        });
      }
    });

    return { entities, relationships: [], topics: [] };
  }

  async enrichGeolocation(item: ProcessedFeedItem): Promise<GeocodingResult[]> {
    const locations: GeocodingResult[] = [];
    const entities = item.processedData.entities || [];
    
    // Find location entities
    const locationEntities = entities.filter(e => 
      e.type === 'location' || 
      e.properties?.types?.includes('City') ||
      e.properties?.types?.includes('Country')
    );

    for (const entity of locationEntities) {
      try {
        const geocoded = await this.geocodeLocation(entity.text);
        if (geocoded) {
          locations.push(geocoded);
        }
      } catch (error) {
        logger.warn(`Error geocoding location ${entity.text}:`, error);
      }
    }

    return locations;
  }

  private async geocodeLocation(location: string): Promise<GeocodingResult | null> {
    const provider = this.providers.get('openstreetmap-geocoding');
    if (!provider || !provider.isActive) {
      return null;
    }

    try {
      if (!await this.checkRateLimit(provider.id)) {
        logger.warn(`Rate limit exceeded for ${provider.name}`);
        return null;
      }

      // Check cache first
      const cacheKey = `geocode:${location.toLowerCase()}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await axios.get(provider.apiUrl, {
        params: {
          q: location,
          format: 'json',
          limit: 1,
          addressdetails: 1
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'IntelGraph-FeedProcessor/1.0'
        }
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const geocoded: GeocodingResult = {
          location,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          countryCode: result.address?.country_code?.toUpperCase() || '',
          countryName: result.address?.country || '',
          region: result.address?.state || result.address?.region || '',
          city: result.address?.city || result.address?.town || result.address?.village || '',
          confidence: parseFloat(result.importance) || 0.5,
          source: provider.name
        };

        // Cache for 24 hours
        await this.redisClient.setEx(cacheKey, 86400, JSON.stringify(geocoded));
        await this.updateRateLimit(provider.id);

        return geocoded;
      }

    } catch (error) {
      logger.error(`Error geocoding location ${location}:`, error);
    }

    return null;
  }

  async enrichThreatIntelligence(item: ProcessedFeedItem): Promise<ThreatIndicator[]> {
    const threatIndicators: ThreatIndicator[] = [];
    const entities = item.processedData.entities || [];

    // Find IOCs in entities
    const iocs = entities.filter(e => 
      ['ip', 'domain', 'url', 'hash', 'email'].includes(e.type)
    );

    for (const ioc of iocs) {
      try {
        const threatInfo = await this.checkThreatIntelligence(ioc.text, ioc.type as any);
        if (threatInfo) {
          threatIndicators.push({
            type: threatInfo.type,
            value: threatInfo.indicator,
            confidence: threatInfo.confidence,
            malicious: threatInfo.malicious,
            source: item.sourceId,
            context: item.title,
            firstSeen: threatInfo.firstSeen,
            lastSeen: threatInfo.lastSeen
          });
        }
      } catch (error) {
        logger.warn(`Error checking threat intel for ${ioc.text}:`, error);
      }
    }

    return threatIndicators;
  }

  private async checkThreatIntelligence(
    indicator: string, 
    type: 'domain' | 'ip' | 'url' | 'hash' | 'email'
  ): Promise<ThreatIntelResult | null> {
    // Check cache first
    const cacheKey = `threat:${type}:${indicator}`;
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let result: ThreatIntelResult | null = null;

    // Try VirusTotal first
    if (type === 'domain' || type === 'ip' || type === 'url' || type === 'hash') {
      result = await this.checkVirusTotal(indicator, type);
    }

    // Try AbuseIPDB for IPs
    if (!result && type === 'ip') {
      result = await this.checkAbuseIPDB(indicator);
    }

    if (result) {
      // Cache for 1 hour
      await this.redisClient.setEx(cacheKey, 3600, JSON.stringify(result));
    }

    return result;
  }

  private async checkVirusTotal(
    indicator: string, 
    type: 'domain' | 'ip' | 'url' | 'hash'
  ): Promise<ThreatIntelResult | null> {
    const provider = this.providers.get('virustotal-threat');
    if (!provider || !provider.isActive || !provider.apiKey) {
      return null;
    }

    try {
      if (!await this.checkRateLimit(provider.id)) {
        logger.warn(`Rate limit exceeded for ${provider.name}`);
        return null;
      }

      let endpoint = '';
      let params: any = { apikey: provider.apiKey };

      switch (type) {
        case 'domain':
          endpoint = '/domain/report';
          params.domain = indicator;
          break;
        case 'ip':
          endpoint = '/ip-address/report';
          params.ip = indicator;
          break;
        case 'url':
          endpoint = '/url/report';
          params.resource = indicator;
          break;
        case 'hash':
          endpoint = '/file/report';
          params.resource = indicator;
          break;
      }

      const response = await axios.get(`${provider.apiUrl}${endpoint}`, {
        params,
        timeout: 30000
      });

      if (response.data && response.data.response_code === 1) {
        const data = response.data;
        const positives = data.positives || 0;
        const total = data.total || 1;
        const malicious = positives > 0;
        const confidence = total > 0 ? positives / total : 0;

        await this.updateRateLimit(provider.id);

        return {
          indicator,
          type,
          malicious,
          confidence,
          sources: ['VirusTotal'],
          categories: data.categories || [],
          lastSeen: data.scan_date ? new Date(data.scan_date) : undefined,
          reputation: malicious ? -confidence : confidence
        };
      }

    } catch (error) {
      logger.error(`Error checking VirusTotal for ${indicator}:`, error);
    }

    return null;
  }

  private async checkAbuseIPDB(ip: string): Promise<ThreatIntelResult | null> {
    const provider = this.providers.get('abuseipdb-threat');
    if (!provider || !provider.isActive || !provider.apiKey) {
      return null;
    }

    try {
      if (!await this.checkRateLimit(provider.id)) {
        logger.warn(`Rate limit exceeded for ${provider.name}`);
        return null;
      }

      const response = await axios.get(`${provider.apiUrl}/check`, {
        params: {
          ipAddress: ip,
          maxAgeInDays: 90,
          verbose: ''
        },
        headers: {
          'Key': provider.apiKey,
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (response.data) {
        const data = response.data;
        const abuseConfidence = data.abuseConfidencePercentage || 0;
        const malicious = abuseConfidence > 25; // Threshold for malicious
        const confidence = abuseConfidence / 100;

        await this.updateRateLimit(provider.id);

        return {
          indicator: ip,
          type: 'ip',
          malicious,
          confidence,
          sources: ['AbuseIPDB'],
          categories: data.usageType ? [data.usageType] : [],
          lastSeen: data.lastReportedAt ? new Date(data.lastReportedAt) : undefined,
          reputation: malicious ? -confidence : confidence
        };
      }

    } catch (error) {
      logger.error(`Error checking AbuseIPDB for ${ip}:`, error);
    }

    return null;
  }

  async analyzeSentimentAdvanced(item: ProcessedFeedItem): Promise<SentimentData | null> {
    // This would integrate with advanced sentiment analysis APIs
    // For now, use basic keyword-based approach
    const text = `${item.title} ${item.description}`.toLowerCase();
    
    const positiveWords = [
      'good', 'great', 'excellent', 'positive', 'success', 'achievement',
      'improvement', 'progress', 'beneficial', 'effective', 'secure'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'negative', 'failure', 'attack', 'breach', 'vulnerability',
      'threat', 'malware', 'hack', 'compromise', 'exploit', 'ransomware', 'phishing'
    ];

    const words = text.split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    const totalSentimentWords = positiveCount + negativeCount;

    if (totalSentimentWords === 0) {
      return {
        score: 0,
        magnitude: 0,
        label: 'neutral',
        confidence: 0.3
      };
    }

    const score = (positiveCount - negativeCount) / totalSentimentWords;
    const magnitude = totalSentimentWords / words.length;
    
    let label: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (score > 0.1) label = 'positive';
    else if (score < -0.1) label = 'negative';

    return {
      score,
      magnitude,
      label,
      confidence: Math.min(0.9, magnitude * 2 + 0.3)
    };
  }

  private mapEntityType(apiType: string[]): ExtractedEntity['type'] {
    if (!apiType || apiType.length === 0) return 'misc';
    
    const type = apiType[0].toLowerCase();
    
    if (type.includes('person') || type.includes('people')) return 'person';
    if (type.includes('organization') || type.includes('company')) return 'organization';
    if (type.includes('location') || type.includes('place') || type.includes('city') || type.includes('country')) return 'location';
    if (type.includes('event')) return 'event';
    if (type.includes('product')) return 'product';
    
    return 'misc';
  }

  private async checkRateLimit(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) return false;

    const now = Date.now();
    const limiter = this.rateLimiters.get(providerId) || { requests: 0, resetTime: now + 60000 };

    // Reset if time window passed
    if (now > limiter.resetTime) {
      limiter.requests = 0;
      limiter.resetTime = now + 60000;
    }

    // Check if under limit
    return limiter.requests < provider.rateLimit.requestsPerMinute;
  }

  private async updateRateLimit(providerId: string): Promise<void> {
    const now = Date.now();
    const limiter = this.rateLimiters.get(providerId) || { requests: 0, resetTime: now + 60000 };
    
    limiter.requests++;
    this.rateLimiters.set(providerId, limiter);
  }

  async getProviderStats(): Promise<Array<{ provider: string; requests: number; resetTime: number }>> {
    return Array.from(this.rateLimiters.entries()).map(([providerId, limiter]) => ({
      provider: providerId,
      requests: limiter.requests,
      resetTime: limiter.resetTime
    }));
  }
}
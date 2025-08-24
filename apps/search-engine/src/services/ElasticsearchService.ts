import { Client } from '@elastic/elasticsearch';
import { SearchQuery, SearchResponse, SearchResult, SearchIndex, QueryBuilder } from '../types';
import { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';

export class ElasticsearchService {
  private client: Client;
  private logger: Logger;

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_AUTH ? {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
      } : undefined,
      requestTimeout: 30000,
      maxRetries: 3,
      resurrectStrategy: 'ping'
    });

    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      ),
      transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/search-engine.log' })
      ]
    });
  }

  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      const elasticQuery = this.buildElasticsearchQuery(query);
      
      this.logger.info('Executing search query', {
        query: query.query,
        searchType: query.searchType,
        filters: query.filters
      });

      const response = await this.client.search({
        index: this.getSearchIndices(query),
        body: elasticQuery,
        track_total_hits: true,
        request_cache: true,
        timeout: '30s'
      });

      const searchResponse: SearchResponse = {
        query,
        results: this.transformHits(response.body.hits.hits),
        total: {
          value: response.body.hits.total.value,
          relation: response.body.hits.total.relation
        },
        took: response.body.took,
        timedOut: response.body.timed_out,
        facets: this.transformAggregations(response.body.aggregations),
        suggestions: this.transformSuggestions(response.body.suggest),
        scrollId: response.body._scroll_id
      };

      this.logger.info('Search completed', {
        query: query.query,
        resultCount: searchResponse.results.length,
        totalHits: searchResponse.total.value,
        took: searchResponse.took,
        executionTime: Date.now() - startTime
      });

      return searchResponse;
    } catch (error) {
      this.logger.error('Search failed', {
        query: query.query,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      });
      throw error;
    }
  }

  private buildElasticsearchQuery(query: SearchQuery): any {
    const esQuery: any = {
      query: this.buildQueryClause(query),
      size: query.pagination?.size || 20,
      from: ((query.pagination?.page || 1) - 1) * (query.pagination?.size || 20)
    };

    // Add sorting
    if (query.sort) {
      esQuery.sort = [{
        [query.sort.field]: {
          order: query.sort.order,
          mode: query.sort.mode
        }
      }];
    } else {
      esQuery.sort = [{ _score: { order: 'desc' } }];
    }

    // Add highlighting
    if (query.highlight) {
      esQuery.highlight = {
        fields: query.highlight.fields.reduce((acc, field) => {
          acc[field] = {
            fragment_size: query.highlight!.fragmentSize || 150,
            number_of_fragments: query.highlight!.numberOfFragments || 3,
            pre_tags: query.highlight!.preTags || ['<mark>'],
            post_tags: query.highlight!.postTags || ['</mark>']
          };
          return acc;
        }, {} as any)
      };
    }

    // Add aggregations/facets
    if (query.facets && query.facets.length > 0) {
      esQuery.aggs = this.buildAggregations(query.facets);
    }

    // Add scroll for pagination
    if (query.pagination?.scroll) {
      esQuery.scroll = query.pagination.scroll;
    }

    return esQuery;
  }

  private buildQueryClause(query: SearchQuery): any {
    const boolQuery: any = {
      bool: {
        must: [],
        should: [],
        filter: [],
        must_not: []
      }
    };

    // Main query
    if (query.query && query.query.trim()) {
      switch (query.searchType) {
        case 'semantic':
          boolQuery.bool.must.push(this.buildSemanticQuery(query.query));
          break;
        case 'fuzzy':
          boolQuery.bool.must.push(this.buildFuzzyQuery(query.query));
          break;
        case 'hybrid':
          boolQuery.bool.should.push(this.buildFullTextQuery(query.query));
          boolQuery.bool.should.push(this.buildSemanticQuery(query.query));
          boolQuery.bool.minimum_should_match = 1;
          break;
        default:
          boolQuery.bool.must.push(this.buildFullTextQuery(query.query));
      }
    } else {
      boolQuery.bool.must.push({ match_all: {} });
    }

    // Add filters
    if (query.filters) {
      if (query.filters.dateRange) {
        boolQuery.bool.filter.push({
          range: {
            [query.filters.dateRange.field]: {
              ...(query.filters.dateRange.from && { gte: query.filters.dateRange.from }),
              ...(query.filters.dateRange.to && { lte: query.filters.dateRange.to })
            }
          }
        });
      }

      if (query.filters.entityTypes && query.filters.entityTypes.length > 0) {
        boolQuery.bool.filter.push({
          terms: { 'entityType.keyword': query.filters.entityTypes }
        });
      }

      if (query.filters.sources && query.filters.sources.length > 0) {
        boolQuery.bool.filter.push({
          terms: { 'source.keyword': query.filters.sources }
        });
      }

      if (query.filters.tags && query.filters.tags.length > 0) {
        boolQuery.bool.filter.push({
          terms: { 'tags.keyword': query.filters.tags }
        });
      }

      if (query.filters.confidence) {
        boolQuery.bool.filter.push({
          range: {
            confidence: {
              ...(query.filters.confidence.min !== undefined && { gte: query.filters.confidence.min }),
              ...(query.filters.confidence.max !== undefined && { lte: query.filters.confidence.max })
            }
          }
        });
      }

      if (query.filters.custom) {
        Object.entries(query.filters.custom).forEach(([field, value]) => {
          if (Array.isArray(value)) {
            boolQuery.bool.filter.push({
              terms: { [`${field}.keyword`]: value }
            });
          } else {
            boolQuery.bool.filter.push({
              term: { [`${field}.keyword`]: value }
            });
          }
        });
      }
    }

    // Apply boosts
    if (query.boost) {
      if (query.boost.fields) {
        Object.entries(query.boost.fields).forEach(([field, boost]) => {
          const fieldQuery = boolQuery.bool.must.find((q: any) => q.multi_match);
          if (fieldQuery && fieldQuery.multi_match) {
            fieldQuery.multi_match.fields = fieldQuery.multi_match.fields || [];
            fieldQuery.multi_match.fields.push(`${field}^${boost}`);
          }
        });
      }

      if (query.boost.functions && query.boost.functions.length > 0) {
        return {
          function_score: {
            query: boolQuery,
            functions: query.boost.functions.map(func => ({
              field_value_factor: {
                field: func.field,
                factor: func.factor || 1.2,
                modifier: func.modifier || 'log1p',
                missing: func.missing || 1
              }
            })),
            score_mode: 'sum',
            boost_mode: 'multiply'
          }
        };
      }
    }

    return boolQuery;
  }

  private buildFullTextQuery(queryText: string): any {
    return {
      multi_match: {
        query: queryText,
        fields: [
          'title^3',
          'content^2',
          'description^1.5',
          'tags^2',
          'metadata.*'
        ],
        type: 'best_fields',
        operator: 'or',
        fuzziness: 'AUTO',
        prefix_length: 2,
        max_expansions: 50
      }
    };
  }

  private buildSemanticQuery(queryText: string): any {
    return {
      script_score: {
        query: { match_all: {} },
        script: {
          source: `
            if (doc['embedding_vector'].size() == 0) return 0;
            def queryVector = params.query_vector;
            def docVector = doc['embedding_vector'].value;
            return cosineSimilarity(queryVector, docVector) + 1.0;
          `,
          params: {
            query_vector: this.getQueryEmbedding(queryText)
          }
        }
      }
    };
  }

  private buildFuzzyQuery(queryText: string): any {
    const words = queryText.split(/\s+/);
    return {
      bool: {
        should: words.map(word => ({
          fuzzy: {
            content: {
              value: word,
              fuzziness: 'AUTO',
              max_expansions: 50,
              prefix_length: 2
            }
          }
        })),
        minimum_should_match: Math.ceil(words.length * 0.6)
      }
    };
  }

  private buildAggregations(facets: string[]): any {
    const aggs: any = {};
    
    facets.forEach(facet => {
      switch (facet) {
        case 'entityTypes':
          aggs.entityTypes = {
            terms: {
              field: 'entityType.keyword',
              size: 20
            }
          };
          break;
        case 'sources':
          aggs.sources = {
            terms: {
              field: 'source.keyword',
              size: 20
            }
          };
          break;
        case 'tags':
          aggs.tags = {
            terms: {
              field: 'tags.keyword',
              size: 20
            }
          };
          break;
        case 'dateHistogram':
          aggs.dateHistogram = {
            date_histogram: {
              field: 'createdAt',
              calendar_interval: 'day',
              min_doc_count: 1
            }
          };
          break;
        case 'confidence':
          aggs.confidence = {
            histogram: {
              field: 'confidence',
              interval: 0.1,
              min_doc_count: 1
            }
          };
          break;
      }
    });

    return aggs;
  }

  private getSearchIndices(query: SearchQuery): string[] {
    const indices = ['entities', 'cases', 'documents', 'comments', 'events'];
    
    if (query.filters?.entityTypes) {
      return query.filters.entityTypes.map(type => `${type}s`);
    }
    
    return indices;
  }

  private transformHits(hits: any[]): SearchResult[] {
    return hits.map(hit => ({
      id: hit._id,
      type: hit._index.slice(0, -1) as any,
      score: hit._score,
      source: hit._source,
      highlight: hit.highlight,
      explanation: hit._explanation
    }));
  }

  private transformAggregations(aggs: any): Record<string, any> | undefined {
    if (!aggs) return undefined;
    
    const facets: Record<string, any> = {};
    
    Object.entries(aggs).forEach(([key, value]: [string, any]) => {
      if (value.buckets) {
        facets[key] = {
          buckets: value.buckets.map((bucket: any) => ({
            key: bucket.key,
            docCount: bucket.doc_count,
            subAggregations: bucket.aggregations ? this.transformAggregations(bucket.aggregations) : undefined
          })),
          docCountErrorUpperBound: value.doc_count_error_upper_bound || 0,
          sumOtherDocCount: value.sum_other_doc_count || 0
        };
      }
    });
    
    return facets;
  }

  private transformSuggestions(suggestions: any): any[] | undefined {
    if (!suggestions) return undefined;
    
    const results: any[] = [];
    
    Object.values(suggestions).forEach((suggestion: any) => {
      if (Array.isArray(suggestion)) {
        suggestion.forEach(s => {
          if (s.options) {
            results.push(...s.options.map((option: any) => ({
              text: option.text,
              score: option.score,
              freq: option.freq
            })));
          }
        });
      }
    });
    
    return results;
  }

  private getQueryEmbedding(queryText: string): number[] {
    return new Array(384).fill(0).map(() => Math.random());
  }

  async createIndex(index: SearchIndex): Promise<void> {
    try {
      await this.client.indices.create({
        index: index.name,
        body: {
          mappings: index.mappings,
          settings: index.settings
        }
      });

      if (index.aliases.length > 0) {
        const aliasActions = index.aliases.map(alias => ({
          add: { index: index.name, alias }
        }));
        
        await this.client.indices.updateAliases({
          body: { actions: aliasActions }
        });
      }

      this.logger.info('Index created successfully', { indexName: index.name });
    } catch (error) {
      this.logger.error('Failed to create index', {
        indexName: index.name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    try {
      await this.client.indices.delete({ index: indexName });
      this.logger.info('Index deleted successfully', { indexName });
    } catch (error) {
      this.logger.error('Failed to delete index', {
        indexName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async indexDocument(indexName: string, id: string, document: any): Promise<void> {
    try {
      await this.client.index({
        index: indexName,
        id,
        body: document,
        refresh: 'wait_for'
      });
      
      this.logger.debug('Document indexed successfully', { indexName, id });
    } catch (error) {
      this.logger.error('Failed to index document', {
        indexName,
        id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async bulkIndex(operations: any[]): Promise<void> {
    try {
      const response = await this.client.bulk({
        body: operations,
        refresh: 'wait_for'
      });

      if (response.body.errors) {
        const erroredDocuments: any[] = [];
        response.body.items.forEach((action: any, i: number) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              status: action[operation].status,
              error: action[operation].error,
              operation: operations[i * 2],
              document: operations[i * 2 + 1]
            });
          }
        });

        this.logger.error('Bulk indexing partially failed', {
          errorCount: erroredDocuments.length,
          errors: erroredDocuments
        });
      }

      this.logger.info('Bulk indexing completed', {
        took: response.body.took,
        errors: response.body.errors
      });
    } catch (error) {
      this.logger.error('Bulk indexing failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getIndexStats(): Promise<Record<string, any>> {
    try {
      const response = await this.client.indices.stats({
        index: '_all',
        metric: ['docs', 'store', 'indexing', 'search']
      });
      
      return response.body.indices;
    } catch (error) {
      this.logger.error('Failed to get index stats', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const health = await this.client.cluster.health();
      const info = await this.client.info();
      
      return {
        status: health.body.status,
        details: {
          cluster: health.body,
          version: info.body.version
        }
      };
    } catch (error) {
      return {
        status: 'red',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
}
import { SearchQuery, QueryBuilder, SearchFilters } from '../types';
import { natural, stopword } from '../utils/nlp';

export class QueryBuilderService {
  private synonyms: Map<string, string[]> = new Map();
  private fieldMappings: Map<string, string[]> = new Map();

  constructor() {
    this.initializeSynonyms();
    this.initializeFieldMappings();
  }

  private initializeSynonyms(): void {
    this.synonyms.set('person', ['individual', 'human', 'people', 'personnel']);
    this.synonyms.set('organization', ['company', 'corp', 'enterprise', 'business', 'org']);
    this.synonyms.set('location', ['place', 'address', 'geo', 'position', 'site']);
    this.synonyms.set('event', ['incident', 'occurrence', 'happening', 'activity']);
    this.synonyms.set('threat', ['danger', 'risk', 'vulnerability', 'attack', 'malware']);
    this.synonyms.set('document', ['file', 'report', 'paper', 'record', 'publication']);
  }

  private initializeFieldMappings(): void {
    this.fieldMappings.set('name', ['title', 'label', 'identifier', 'alias']);
    this.fieldMappings.set('description', ['content', 'summary', 'details', 'notes']);
    this.fieldMappings.set('date', ['timestamp', 'created', 'modified', 'updated']);
    this.fieldMappings.set('type', ['category', 'classification', 'kind']);
    this.fieldMappings.set('source', ['origin', 'provider', 'system', 'feed']);
  }

  buildQuery(naturalLanguageQuery: string): SearchQuery {
    const analyzed = this.analyzeQuery(naturalLanguageQuery);
    
    return {
      query: analyzed.mainQuery,
      searchType: analyzed.searchType,
      filters: analyzed.filters,
      sort: analyzed.sort,
      pagination: { page: 1, size: 20 },
      facets: analyzed.facets,
      highlight: {
        fields: ['title', 'content', 'description'],
        fragmentSize: 150,
        numberOfFragments: 3
      }
    };
  }

  private analyzeQuery(query: string): {
    mainQuery: string;
    searchType: 'fulltext' | 'semantic' | 'hybrid' | 'fuzzy';
    filters: SearchFilters;
    sort?: any;
    facets: string[];
  } {
    const tokens = this.tokenizeQuery(query);
    const processed = this.processTokens(tokens);
    
    return {
      mainQuery: processed.mainTerms.join(' '),
      searchType: this.determineSearchType(query, processed),
      filters: this.extractFilters(processed),
      sort: this.extractSortCriteria(processed),
      facets: this.suggestFacets(processed)
    };
  }

  private tokenizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  private processTokens(tokens: string[]): {
    mainTerms: string[];
    entityTypes: string[];
    dateExpressions: string[];
    operators: string[];
    modifiers: string[];
  } {
    const processed = {
      mainTerms: [] as string[],
      entityTypes: [] as string[],
      dateExpressions: [] as string[],
      operators: [] as string[],
      modifiers: [] as string[]
    };

    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const entityTypeTerms = new Set(['person', 'people', 'organization', 'company', 'location', 'event', 'document', 'threat']);
    const dateTerms = new Set(['today', 'yesterday', 'week', 'month', 'year', 'recent', 'latest', 'since', 'before', 'after']);
    const operatorTerms = new Set(['and', 'or', 'not', 'near', 'within']);
    const modifierTerms = new Set(['similar', 'like', 'related', 'associated', 'connected']);

    tokens.forEach(token => {
      if (stopWords.has(token) && token !== 'and' && token !== 'or' && token !== 'not') {
        return;
      }

      if (entityTypeTerms.has(token)) {
        processed.entityTypes.push(token);
      } else if (dateTerms.has(token)) {
        processed.dateExpressions.push(token);
      } else if (operatorTerms.has(token)) {
        processed.operators.push(token);
      } else if (modifierTerms.has(token)) {
        processed.modifiers.push(token);
      } else {
        processed.mainTerms.push(token);
      }
    });

    return processed;
  }

  private determineSearchType(originalQuery: string, processed: any): 'fulltext' | 'semantic' | 'hybrid' | 'fuzzy' {
    const semanticIndicators = ['similar', 'like', 'related', 'associated', 'meaning', 'concept'];
    const fuzzyIndicators = ['approximate', 'fuzzy', 'close', 'near'];
    
    if (semanticIndicators.some(indicator => originalQuery.includes(indicator))) {
      return 'semantic';
    }
    
    if (fuzzyIndicators.some(indicator => originalQuery.includes(indicator))) {
      return 'fuzzy';
    }
    
    if (processed.modifiers.length > 0) {
      return 'hybrid';
    }
    
    return 'fulltext';
  }

  private extractFilters(processed: any): SearchFilters {
    const filters: SearchFilters = {};

    if (processed.entityTypes.length > 0) {
      filters.entityTypes = processed.entityTypes.map(type => {
        const synonyms = this.synonyms.get(type);
        return synonyms ? [type, ...synonyms] : [type];
      }).flat();
    }

    if (processed.dateExpressions.length > 0) {
      filters.dateRange = this.parseDateExpressions(processed.dateExpressions);
    }

    return filters;
  }

  private parseDateExpressions(dateExpressions: string[]): { field: string; from?: string; to?: string } {
    const now = new Date();
    let from: string | undefined;
    let to: string | undefined;

    dateExpressions.forEach(expr => {
      switch (expr) {
        case 'today':
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
          break;
        case 'yesterday':
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
          to = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          break;
        case 'week':
        case 'recent':
          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'month':
          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'year':
          from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }
    });

    return {
      field: 'createdAt',
      from,
      to
    };
  }

  private extractSortCriteria(processed: any): any {
    if (processed.dateExpressions.includes('latest') || processed.dateExpressions.includes('recent')) {
      return { field: 'createdAt', order: 'desc' };
    }
    
    return undefined;
  }

  private suggestFacets(processed: any): string[] {
    const facets = ['entityTypes', 'sources'];
    
    if (processed.entityTypes.length > 0) {
      facets.push('tags');
    }
    
    if (processed.dateExpressions.length > 0) {
      facets.push('dateHistogram');
    }
    
    return facets;
  }

  buildAdvancedQuery(queryBuilder: QueryBuilder): any {
    return this.convertQueryBuilderToElastic(queryBuilder);
  }

  private convertQueryBuilderToElastic(qb: QueryBuilder): any {
    switch (qb.type) {
      case 'bool':
        return {
          bool: {
            ...(qb.must && { must: qb.must.map(q => this.convertQueryBuilderToElastic(q)) }),
            ...(qb.should && { should: qb.should.map(q => this.convertQueryBuilderToElastic(q)) }),
            ...(qb.must_not && { must_not: qb.must_not.map(q => this.convertQueryBuilderToElastic(q)) }),
            ...(qb.filter && { filter: qb.filter.map(q => this.convertQueryBuilderToElastic(q)) }),
            ...(qb.minimum_should_match && { minimum_should_match: qb.minimum_should_match })
          }
        };

      case 'match':
        return {
          match: {
            [qb.field!]: {
              query: qb.value,
              operator: qb.operator || 'or',
              ...(qb.boost && { boost: qb.boost })
            }
          }
        };

      case 'term':
        return {
          term: {
            [qb.field!]: {
              value: qb.value,
              ...(qb.boost && { boost: qb.boost })
            }
          }
        };

      case 'range':
        return {
          range: {
            [qb.field!]: {
              ...qb.value,
              ...(qb.boost && { boost: qb.boost })
            }
          }
        };

      case 'wildcard':
        return {
          wildcard: {
            [qb.field!]: {
              value: qb.value,
              ...(qb.boost && { boost: qb.boost })
            }
          }
        };

      case 'fuzzy':
        return {
          fuzzy: {
            [qb.field!]: {
              value: qb.value,
              fuzziness: 'AUTO',
              ...(qb.boost && { boost: qb.boost })
            }
          }
        };

      case 'nested':
        return {
          nested: {
            path: qb.field!,
            query: this.convertQueryBuilderToElastic(qb.value),
            ...(qb.boost && { boost: qb.boost })
          }
        };

      case 'geo_distance':
        return {
          geo_distance: {
            distance: qb.value.distance,
            [qb.field!]: qb.value.location,
            ...(qb.boost && { boost: qb.boost })
          }
        };

      default:
        throw new Error(`Unsupported query type: ${qb.type}`);
    }
  }

  expandQuery(query: string): string {
    const words = query.split(/\s+/);
    const expandedWords: string[] = [];

    words.forEach(word => {
      expandedWords.push(word);
      
      const synonyms = this.synonyms.get(word.toLowerCase());
      if (synonyms) {
        expandedWords.push(...synonyms);
      }
    });

    return expandedWords.join(' ');
  }

  suggestCorrections(query: string): string[] {
    const suggestions: string[] = [];
    const words = query.split(/\s+/);

    words.forEach(word => {
      if (word.length < 3) return;

      for (const [key, synonyms] of this.synonyms.entries()) {
        const allTerms = [key, ...synonyms];
        const closeMatches = allTerms.filter(term => 
          this.levenshteinDistance(word.toLowerCase(), term) <= 2
        );
        
        if (closeMatches.length > 0) {
          suggestions.push(...closeMatches);
        }
      }
    });

    return [...new Set(suggestions)];
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }

    return matrix[b.length][a.length];
  }

  parseFilterExpression(expression: string): SearchFilters {
    const filters: SearchFilters = {};
    
    const dateRangeRegex = /date\s*:\s*(\d{4}-\d{2}-\d{2})\s*to\s*(\d{4}-\d{2}-\d{2})/i;
    const dateMatch = expression.match(dateRangeRegex);
    if (dateMatch) {
      filters.dateRange = {
        field: 'createdAt',
        from: dateMatch[1],
        to: dateMatch[2]
      };
    }

    const typeRegex = /type\s*:\s*([^\s,]+)/gi;
    const typeMatches = [...expression.matchAll(typeRegex)];
    if (typeMatches.length > 0) {
      filters.entityTypes = typeMatches.map(match => match[1]);
    }

    const sourceRegex = /source\s*:\s*([^\s,]+)/gi;
    const sourceMatches = [...expression.matchAll(sourceRegex)];
    if (sourceMatches.length > 0) {
      filters.sources = sourceMatches.map(match => match[1]);
    }

    const tagRegex = /tag\s*:\s*([^\s,]+)/gi;
    const tagMatches = [...expression.matchAll(tagRegex)];
    if (tagMatches.length > 0) {
      filters.tags = tagMatches.map(match => match[1]);
    }

    const confidenceRegex = /confidence\s*:\s*(\d*\.?\d+)\s*to\s*(\d*\.?\d+)/i;
    const confidenceMatch = expression.match(confidenceRegex);
    if (confidenceMatch) {
      filters.confidence = {
        min: parseFloat(confidenceMatch[1]),
        max: parseFloat(confidenceMatch[2])
      };
    }

    return filters;
  }

  generateSearchTemplates(): Record<string, string> {
    return {
      'threat-intelligence': 'type:threat AND (malware OR vulnerability OR attack) AND date:{{date_range}}',
      'entity-relationships': 'entity:"{{entity_name}}" AND related:true',
      'case-documents': 'type:document AND case:"{{case_id}}" AND date:{{date_range}}',
      'recent-events': 'type:event AND date:last_{{days}}_days ORDER BY date DESC',
      'high-confidence': 'confidence:0.8_to_1.0 AND verified:true',
      'geospatial': 'location:within_{{distance}}_of_{{coordinates}} AND type:{{entity_type}}'
    };
  }
}
import { Router } from 'express';
import { ElasticsearchService } from '../services/ElasticsearchService';
import { QueryBuilderService } from '../services/QueryBuilderService';
import { SavedSearchService } from '../services/SavedSearchService';
import { SearchQuery, QueryBuilder } from '../types';
import { authMiddleware } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();
const elasticsearchService = new ElasticsearchService();
const queryBuilderService = new QueryBuilderService();
const savedSearchService = new SavedSearchService();

const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many search requests, please try again later' }
});

router.use(authMiddleware);
router.use(searchRateLimit);

router.post('/search', async (req, res) => {
  try {
    const searchQuery: SearchQuery = req.body;
    
    if (!searchQuery.query || searchQuery.query.trim().length === 0) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    const startTime = Date.now();
    const result = await elasticsearchService.search(searchQuery);
    const executionTime = Date.now() - startTime;

    res.json({
      ...result,
      executionTime
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/search/natural', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Natural language query is required'
      });
    }

    const searchQuery = queryBuilderService.buildQuery(query);
    const result = await elasticsearchService.search(searchQuery);

    res.json({
      originalQuery: query,
      parsedQuery: searchQuery,
      ...result
    });
  } catch (error) {
    console.error('Natural language search error:', error);
    res.status(500).json({
      error: 'Natural language search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/search/advanced', async (req, res) => {
  try {
    const queryBuilder: QueryBuilder = req.body;
    
    const elasticQuery = queryBuilderService.buildAdvancedQuery(queryBuilder);
    
    const searchQuery: SearchQuery = {
      query: '',
      searchType: 'fulltext',
      pagination: { page: 1, size: 20 }
    };

    const startTime = Date.now();
    const response = await elasticsearchService.search(searchQuery);
    const executionTime = Date.now() - startTime;

    res.json({
      queryBuilder,
      elasticQuery,
      ...response,
      executionTime
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      error: 'Advanced search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/suggestions', async (req, res) => {
  try {
    const { q, field } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: 'Query parameter "q" is required'
      });
    }

    const suggestions = queryBuilderService.suggestCorrections(q);
    const expanded = queryBuilderService.expandQuery(q);

    res.json({
      query: q,
      suggestions,
      expanded,
      field: field || 'all'
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/autocomplete', async (req, res) => {
  try {
    const { q, size = 10 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: 'Query parameter "q" is required'
      });
    }

    const autocompleteQuery: SearchQuery = {
      query: q,
      searchType: 'fulltext',
      pagination: { page: 1, size: parseInt(size as string) },
      highlight: {
        fields: ['title', 'content'],
        fragmentSize: 50,
        numberOfFragments: 1
      }
    };

    const result = await elasticsearchService.search(autocompleteQuery);
    
    const suggestions = result.results.map(item => ({
      text: item.source.title || item.source.name || item.id,
      type: item.type,
      score: item.score,
      highlight: item.highlight
    }));

    res.json({
      query: q,
      suggestions
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({
      error: 'Autocomplete failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/filters/parse', async (req, res) => {
  try {
    const { expression } = req.body;
    
    if (!expression || typeof expression !== 'string') {
      return res.status(400).json({
        error: 'Filter expression is required'
      });
    }

    const filters = queryBuilderService.parseFilterExpression(expression);
    
    res.json({
      expression,
      filters
    });
  } catch (error) {
    console.error('Filter parsing error:', error);
    res.status(500).json({
      error: 'Failed to parse filter expression',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/templates', async (req, res) => {
  try {
    const templates = queryBuilderService.generateSearchTemplates();
    
    res.json({
      templates: Object.entries(templates).map(([key, template]) => ({
        id: key,
        name: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        template
      }))
    });
  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({
      error: 'Failed to get search templates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/saved', async (req, res) => {
  try {
    const { name, description, query, isPublic = false, tags = [] } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!name || !query) {
      return res.status(400).json({
        error: 'Name and query are required'
      });
    }

    const savedSearch = await savedSearchService.createSavedSearch(
      name,
      description,
      query,
      userId,
      isPublic,
      tags
    );

    res.status(201).json(savedSearch);
  } catch (error) {
    console.error('Save search error:', error);
    res.status(500).json({
      error: 'Failed to save search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/saved', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { includePublic = 'false', tags, limit = '50', offset = '0' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const options = {
      includePublic: includePublic === 'true',
      tags: tags ? (tags as string).split(',') : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const result = await savedSearchService.listSavedSearches(userId, options);
    
    res.json(result);
  } catch (error) {
    console.error('List saved searches error:', error);
    res.status(500).json({
      error: 'Failed to list saved searches',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const savedSearch = await savedSearchService.getSavedSearch(id, userId);
    
    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    res.json(savedSearch);
  } catch (error) {
    console.error('Get saved search error:', error);
    res.status(500).json({
      error: 'Failed to get saved search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.put('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const updatedSearch = await savedSearchService.updateSavedSearch(id, updates, userId);
    
    if (!updatedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    res.json(updatedSearch);
  } catch (error) {
    console.error('Update saved search error:', error);
    res.status(500).json({
      error: 'Failed to update saved search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const deleted = await savedSearchService.deleteSavedSearch(id, userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete saved search error:', error);
    res.status(500).json({
      error: 'Failed to delete saved search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/saved/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const savedSearch = await savedSearchService.executeSavedSearch(id, userId);
    
    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    const result = await elasticsearchService.search(savedSearch.query);

    res.json({
      savedSearch,
      ...result
    });
  } catch (error) {
    console.error('Execute saved search error:', error);
    res.status(500).json({
      error: 'Failed to execute saved search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/saved/popular', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = '10' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const popularSearches = await savedSearchService.getPopularSearches(
      userId, 
      parseInt(limit as string)
    );

    res.json(popularSearches);
  } catch (error) {
    console.error('Get popular searches error:', error);
    res.status(500).json({
      error: 'Failed to get popular searches',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/saved/recent', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = '10' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const recentSearches = await savedSearchService.getRecentSearches(
      userId, 
      parseInt(limit as string)
    );

    res.json(recentSearches);
  } catch (error) {
    console.error('Get recent searches error:', error);
    res.status(500).json({
      error: 'Failed to get recent searches',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/health', async (req, res) => {
  try {
    const health = await elasticsearchService.healthCheck();
    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
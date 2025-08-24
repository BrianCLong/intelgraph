import { Pool } from 'pg';
import { SavedSearch, SearchQuery, SearchTemplate } from '../types';
import { createLogger, Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

export class SavedSearchService {
  private db: Pool;
  private logger: Logger;

  constructor() {
    this.db = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'intelgraph',
      user: process.env.POSTGRES_USER || 'intelgraph',
      password: process.env.POSTGRES_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: require('winston').format.combine(
        require('winston').format.timestamp(),
        require('winston').format.json()
      ),
      transports: [
        new require('winston').transports.Console(),
        new require('winston').transports.File({ filename: 'logs/saved-search.log' })
      ]
    });
  }

  async createSavedSearch(
    name: string,
    description: string | undefined,
    query: SearchQuery,
    userId: string,
    isPublic: boolean = false,
    tags: string[] = []
  ): Promise<SavedSearch> {
    const id = uuidv4();
    const now = new Date();

    try {
      const result = await this.db.query(`
        INSERT INTO saved_searches (
          id, name, description, query, user_id, is_public, tags, 
          created_at, updated_at, execution_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        id, name, description, JSON.stringify(query), userId, isPublic, 
        JSON.stringify(tags), now, now, 0
      ]);

      const savedSearch = this.mapRowToSavedSearch(result.rows[0]);
      
      this.logger.info('Saved search created', {
        id: savedSearch.id,
        name: savedSearch.name,
        userId
      });

      return savedSearch;
    } catch (error) {
      this.logger.error('Failed to create saved search', {
        name,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getSavedSearch(id: string, userId: string): Promise<SavedSearch | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM saved_searches 
        WHERE id = $1 AND (user_id = $2 OR is_public = true)
      `, [id, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSavedSearch(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to get saved search', {
        id,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async updateSavedSearch(
    id: string,
    updates: Partial<Pick<SavedSearch, 'name' | 'description' | 'query' | 'tags' | 'isPublic'>>,
    userId: string
  ): Promise<SavedSearch | null> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCounter = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCounter++}`);
        updateValues.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCounter++}`);
        updateValues.push(updates.description);
      }

      if (updates.query !== undefined) {
        updateFields.push(`query = $${paramCounter++}`);
        updateValues.push(JSON.stringify(updates.query));
      }

      if (updates.tags !== undefined) {
        updateFields.push(`tags = $${paramCounter++}`);
        updateValues.push(JSON.stringify(updates.tags));
      }

      if (updates.isPublic !== undefined) {
        updateFields.push(`is_public = $${paramCounter++}`);
        updateValues.push(updates.isPublic);
      }

      updateFields.push(`updated_at = $${paramCounter++}`);
      updateValues.push(new Date());

      updateValues.push(id, userId);

      const result = await this.db.query(`
        UPDATE saved_searches 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter++} AND user_id = $${paramCounter++}
        RETURNING *
      `, updateValues);

      if (result.rows.length === 0) {
        return null;
      }

      const updatedSearch = this.mapRowToSavedSearch(result.rows[0]);
      
      this.logger.info('Saved search updated', {
        id: updatedSearch.id,
        name: updatedSearch.name,
        userId
      });

      return updatedSearch;
    } catch (error) {
      this.logger.error('Failed to update saved search', {
        id,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async deleteSavedSearch(id: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.query(`
        DELETE FROM saved_searches 
        WHERE id = $1 AND user_id = $2
      `, [id, userId]);

      const deleted = result.rowCount === 1;
      
      if (deleted) {
        this.logger.info('Saved search deleted', { id, userId });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete saved search', {
        id,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async listSavedSearches(
    userId: string,
    options: {
      includePublic?: boolean;
      tags?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ searches: SavedSearch[]; total: number }> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCounter = 1;

      if (options.includePublic) {
        conditions.push(`(user_id = $${paramCounter++} OR is_public = true)`);
        params.push(userId);
      } else {
        conditions.push(`user_id = $${paramCounter++}`);
        params.push(userId);
      }

      if (options.tags && options.tags.length > 0) {
        conditions.push(`tags ?| $${paramCounter++}`);
        params.push(options.tags);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      const countResult = await this.db.query(`
        SELECT COUNT(*) as total FROM saved_searches ${whereClause}
      `, params);

      const searchResult = await this.db.query(`
        SELECT * FROM saved_searches ${whereClause}
        ORDER BY updated_at DESC
        LIMIT $${paramCounter++} OFFSET $${paramCounter++}
      `, [...params, limit, offset]);

      const searches = searchResult.rows.map(row => this.mapRowToSavedSearch(row));
      const total = parseInt(countResult.rows[0].total);

      return { searches, total };
    } catch (error) {
      this.logger.error('Failed to list saved searches', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async executeSavedSearch(id: string, userId: string): Promise<SavedSearch | null> {
    try {
      const result = await this.db.query(`
        UPDATE saved_searches 
        SET execution_count = execution_count + 1, last_executed = $1
        WHERE id = $2 AND (user_id = $3 OR is_public = true)
        RETURNING *
      `, [new Date(), id, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const savedSearch = this.mapRowToSavedSearch(result.rows[0]);
      
      this.logger.info('Saved search executed', {
        id: savedSearch.id,
        name: savedSearch.name,
        userId,
        executionCount: savedSearch.executionCount
      });

      return savedSearch;
    } catch (error) {
      this.logger.error('Failed to execute saved search', {
        id,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async createSearchTemplate(
    name: string,
    description: string | undefined,
    template: string,
    params: Record<string, any>,
    userId: string,
    category: string,
    isPublic: boolean = false
  ): Promise<SearchTemplate> {
    const id = uuidv4();
    const now = new Date();

    try {
      const result = await this.db.query(`
        INSERT INTO search_templates (
          id, name, description, template, params, user_id, category, is_public, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        id, name, description, template, JSON.stringify(params), 
        userId, category, isPublic, now, now
      ]);

      const searchTemplate = this.mapRowToSearchTemplate(result.rows[0]);
      
      this.logger.info('Search template created', {
        id: searchTemplate.id,
        name: searchTemplate.name,
        category,
        userId
      });

      return searchTemplate;
    } catch (error) {
      this.logger.error('Failed to create search template', {
        name,
        category,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getSearchTemplate(id: string, userId: string): Promise<SearchTemplate | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM search_templates 
        WHERE id = $1 AND (user_id = $2 OR is_public = true)
      `, [id, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSearchTemplate(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to get search template', {
        id,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async listSearchTemplates(
    userId: string,
    options: {
      category?: string;
      includePublic?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ templates: SearchTemplate[]; total: number }> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCounter = 1;

      if (options.includePublic) {
        conditions.push(`(user_id = $${paramCounter++} OR is_public = true)`);
        params.push(userId);
      } else {
        conditions.push(`user_id = $${paramCounter++}`);
        params.push(userId);
      }

      if (options.category) {
        conditions.push(`category = $${paramCounter++}`);
        params.push(options.category);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      const countResult = await this.db.query(`
        SELECT COUNT(*) as total FROM search_templates ${whereClause}
      `, params);

      const templateResult = await this.db.query(`
        SELECT * FROM search_templates ${whereClause}
        ORDER BY category, name
        LIMIT $${paramCounter++} OFFSET $${paramCounter++}
      `, [...params, limit, offset]);

      const templates = templateResult.rows.map(row => this.mapRowToSearchTemplate(row));
      const total = parseInt(countResult.rows[0].total);

      return { templates, total };
    } catch (error) {
      this.logger.error('Failed to list search templates', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async renderTemplate(templateId: string, params: Record<string, any>, userId: string): Promise<string> {
    try {
      const template = await this.getSearchTemplate(templateId, userId);
      if (!template) {
        throw new Error('Template not found');
      }

      let renderedTemplate = template.template;
      
      Object.entries(params).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        renderedTemplate = renderedTemplate.replace(new RegExp(placeholder, 'g'), String(value));
      });

      const unresolvedPlaceholders = renderedTemplate.match(/\{\{[^}]+\}\}/g);
      if (unresolvedPlaceholders) {
        throw new Error(`Unresolved template parameters: ${unresolvedPlaceholders.join(', ')}`);
      }

      return renderedTemplate;
    } catch (error) {
      this.logger.error('Failed to render template', {
        templateId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private mapRowToSavedSearch(row: any): SavedSearch {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      query: JSON.parse(row.query),
      userId: row.user_id,
      isPublic: row.is_public,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      executionCount: row.execution_count,
      lastExecuted: row.last_executed
    };
  }

  private mapRowToSearchTemplate(row: any): SearchTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      template: row.template,
      params: JSON.parse(row.params),
      userId: row.user_id,
      isPublic: row.is_public,
      category: row.category,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getPopularSearches(userId: string, limit: number = 10): Promise<SavedSearch[]> {
    try {
      const result = await this.db.query(`
        SELECT * FROM saved_searches 
        WHERE (user_id = $1 OR is_public = true) AND execution_count > 0
        ORDER BY execution_count DESC, last_executed DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows.map(row => this.mapRowToSavedSearch(row));
    } catch (error) {
      this.logger.error('Failed to get popular searches', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getRecentSearches(userId: string, limit: number = 10): Promise<SavedSearch[]> {
    try {
      const result = await this.db.query(`
        SELECT * FROM saved_searches 
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows.map(row => this.mapRowToSavedSearch(row));
    } catch (error) {
      this.logger.error('Failed to get recent searches', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async searchSavedSearches(userId: string, searchTerm: string): Promise<SavedSearch[]> {
    try {
      const result = await this.db.query(`
        SELECT * FROM saved_searches 
        WHERE (user_id = $1 OR is_public = true)
        AND (
          name ILIKE $2 OR 
          description ILIKE $2 OR
          tags::text ILIKE $2
        )
        ORDER BY 
          CASE WHEN name ILIKE $2 THEN 1 ELSE 2 END,
          execution_count DESC
      `, [userId, `%${searchTerm}%`]);

      return result.rows.map(row => this.mapRowToSavedSearch(row));
    } catch (error) {
      this.logger.error('Failed to search saved searches', {
        userId,
        searchTerm,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
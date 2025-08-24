import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface Widget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'graph' | 'map' | 'text';
  title: string;
  description?: string;
  config: WidgetConfig;
  dataSource: DataSource;
  position: { x: number; y: number; w: number; h: number };
  refreshInterval?: number; // seconds
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'heatmap';
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
  timeRange?: { start: Date; end: Date; interval: string };
  groupBy?: string[];
  filters?: Record<string, any>;
  visualization?: {
    showLegend?: boolean;
    showAxes?: boolean;
    colorScheme?: string;
    customColors?: string[];
    animations?: boolean;
  };
  styling?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: number;
  };
}

export interface DataSource {
  id: string;
  type: 'sql' | 'cypher' | 'api' | 'static';
  query: string;
  parameters?: Record<string, any>;
  cacheTTL?: number; // seconds
  transformations?: DataTransformation[];
}

export interface DataTransformation {
  type: 'filter' | 'aggregate' | 'sort' | 'map' | 'pivot' | 'join';
  config: Record<string, any>;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
  layout: 'grid' | 'flex' | 'custom';
  theme: 'light' | 'dark' | 'auto';
  isPublic: boolean;
  shareToken?: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  accessControl: {
    viewers: string[];
    editors: string[];
    owners: string[];
  };
  settings: {
    autoRefresh?: boolean;
    refreshInterval?: number;
    timezone?: string;
    dateFormat?: string;
    showTitle?: boolean;
    allowExport?: boolean;
  };
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  widgets: Omit<Widget, 'id' | 'createdAt' | 'updatedAt'>[];
  tags: string[];
  isBuiltIn: boolean;
  preview?: string; // Base64 image or URL
}

export class DashboardService {
  constructor(
    private pgPool: Pool,
    private neo4jDriver: Driver,
    private redisClient: RedisClientType
  ) {}

  async createDashboard(
    dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<Dashboard> {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const dashboardId = uuidv4();
      const now = new Date();
      
      // Insert dashboard
      const dashboardQuery = `
        INSERT INTO dashboards (
          id, name, description, layout, theme, is_public, share_token,
          tags, created_by, created_at, updated_at, access_control, settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const shareToken = dashboard.isPublic ? uuidv4() : null;
      
      await client.query(dashboardQuery, [
        dashboardId,
        dashboard.name,
        dashboard.description,
        dashboard.layout,
        dashboard.theme,
        dashboard.isPublic,
        shareToken,
        JSON.stringify(dashboard.tags),
        userId,
        now,
        now,
        JSON.stringify(dashboard.accessControl),
        JSON.stringify(dashboard.settings)
      ]);
      
      // Insert widgets
      for (const widget of dashboard.widgets) {
        await this.createWidget(client, dashboardId, widget);
      }
      
      await client.query('COMMIT');
      
      const createdDashboard = await this.getDashboard(dashboardId, userId);
      if (!createdDashboard) {
        throw new Error('Failed to retrieve created dashboard');
      }
      
      // Clear cache
      await this.invalidateDashboardCache(dashboardId);
      
      logger.info(`Dashboard created: ${dashboardId} by user ${userId}`);
      return createdDashboard;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating dashboard:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getDashboard(dashboardId: string, userId: string): Promise<Dashboard | null> {
    // Check cache first
    const cacheKey = `dashboard:${dashboardId}:${userId}`;
    const cached = await this.redisClient.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      // Get dashboard
      const dashboardQuery = `
        SELECT d.*, 
               CASE 
                 WHEN d.created_by = $2 THEN true
                 WHEN d.is_public = true THEN true
                 WHEN d.access_control->'viewers' ? $2 THEN true
                 WHEN d.access_control->'editors' ? $2 THEN true
                 WHEN d.access_control->'owners' ? $2 THEN true
                 ELSE false
               END as has_access
        FROM dashboards d
        WHERE d.id = $1
      `;
      
      const dashboardResult = await this.pgPool.query(dashboardQuery, [dashboardId, userId]);
      
      if (dashboardResult.rows.length === 0 || !dashboardResult.rows[0].has_access) {
        return null;
      }
      
      const row = dashboardResult.rows[0];
      
      // Get widgets
      const widgets = await this.getDashboardWidgets(dashboardId);
      
      const dashboard: Dashboard = {
        id: row.id,
        name: row.name,
        description: row.description,
        widgets,
        layout: row.layout,
        theme: row.theme,
        isPublic: row.is_public,
        shareToken: row.share_token,
        tags: row.tags || [],
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        accessControl: row.access_control || { viewers: [], editors: [], owners: [] },
        settings: row.settings || {}
      };
      
      // Cache for 5 minutes
      await this.redisClient.setEx(cacheKey, 300, JSON.stringify(dashboard));
      
      return dashboard;
      
    } catch (error) {
      logger.error('Error getting dashboard:', error);
      throw error;
    }
  }

  async updateDashboard(
    dashboardId: string,
    updates: Partial<Dashboard>,
    userId: string
  ): Promise<Dashboard> {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check permissions
      const hasEditAccess = await this.checkDashboardAccess(dashboardId, userId, 'edit');
      if (!hasEditAccess) {
        throw new Error('Insufficient permissions to edit dashboard');
      }
      
      // Update dashboard
      const updateQuery = `
        UPDATE dashboards 
        SET 
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          layout = COALESCE($4, layout),
          theme = COALESCE($5, theme),
          is_public = COALESCE($6, is_public),
          tags = COALESCE($7, tags),
          updated_at = CURRENT_TIMESTAMP,
          access_control = COALESCE($8, access_control),
          settings = COALESCE($9, settings)
        WHERE id = $1
      `;
      
      await client.query(updateQuery, [
        dashboardId,
        updates.name,
        updates.description,
        updates.layout,
        updates.theme,
        updates.isPublic,
        updates.tags ? JSON.stringify(updates.tags) : null,
        updates.accessControl ? JSON.stringify(updates.accessControl) : null,
        updates.settings ? JSON.stringify(updates.settings) : null
      ]);
      
      // Update widgets if provided
      if (updates.widgets) {
        // Delete existing widgets
        await client.query('DELETE FROM dashboard_widgets WHERE dashboard_id = $1', [dashboardId]);
        
        // Insert new widgets
        for (const widget of updates.widgets) {
          await this.createWidget(client, dashboardId, widget);
        }
      }
      
      await client.query('COMMIT');
      
      // Clear cache
      await this.invalidateDashboardCache(dashboardId);
      
      const updatedDashboard = await this.getDashboard(dashboardId, userId);
      if (!updatedDashboard) {
        throw new Error('Failed to retrieve updated dashboard');
      }
      
      logger.info(`Dashboard updated: ${dashboardId} by user ${userId}`);
      return updatedDashboard;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating dashboard:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteDashboard(dashboardId: string, userId: string): Promise<void> {
    try {
      // Check permissions
      const hasOwnerAccess = await this.checkDashboardAccess(dashboardId, userId, 'owner');
      if (!hasOwnerAccess) {
        throw new Error('Insufficient permissions to delete dashboard');
      }
      
      // Delete dashboard (cascade will handle widgets)
      await this.pgPool.query('DELETE FROM dashboards WHERE id = $1', [dashboardId]);
      
      // Clear cache
      await this.invalidateDashboardCache(dashboardId);
      
      logger.info(`Dashboard deleted: ${dashboardId} by user ${userId}`);
      
    } catch (error) {
      logger.error('Error deleting dashboard:', error);
      throw error;
    }
  }

  async getWidgetData(widgetId: string, userId: string): Promise<any> {
    try {
      // Get widget configuration
      const widget = await this.getWidget(widgetId);
      if (!widget) {
        throw new Error('Widget not found');
      }
      
      // Check cache
      const cacheKey = `widget_data:${widgetId}`;
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached && widget.dataSource.cacheTTL) {
        return JSON.parse(cached);
      }
      
      // Execute data source query
      let data = await this.executeDataSource(widget.dataSource, userId);
      
      // Apply transformations
      if (widget.dataSource.transformations) {
        for (const transformation of widget.dataSource.transformations) {
          data = await this.applyTransformation(data, transformation);
        }
      }
      
      // Cache result if TTL specified
      if (widget.dataSource.cacheTTL && widget.dataSource.cacheTTL > 0) {
        await this.redisClient.setEx(
          cacheKey,
          widget.dataSource.cacheTTL,
          JSON.stringify(data)
        );
      }
      
      return data;
      
    } catch (error) {
      logger.error('Error getting widget data:', error);
      throw error;
    }
  }

  private async createWidget(
    client: any,
    dashboardId: string,
    widget: Omit<Widget, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const widgetId = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO dashboard_widgets (
        id, dashboard_id, type, title, description, config, data_source,
        position, refresh_interval, is_visible, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    
    await client.query(query, [
      widgetId,
      dashboardId,
      widget.type,
      widget.title,
      widget.description,
      JSON.stringify(widget.config),
      JSON.stringify(widget.dataSource),
      JSON.stringify(widget.position),
      widget.refreshInterval,
      widget.isVisible,
      now,
      now
    ]);
  }

  private async getDashboardWidgets(dashboardId: string): Promise<Widget[]> {
    const query = `
      SELECT * FROM dashboard_widgets 
      WHERE dashboard_id = $1 
      ORDER BY created_at ASC
    `;
    
    const result = await this.pgPool.query(query, [dashboardId]);
    
    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      config: row.config || {},
      dataSource: row.data_source || {},
      position: row.position || { x: 0, y: 0, w: 4, h: 4 },
      refreshInterval: row.refresh_interval,
      isVisible: row.is_visible,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  private async getWidget(widgetId: string): Promise<Widget | null> {
    const query = `SELECT * FROM dashboard_widgets WHERE id = $1`;
    const result = await this.pgPool.query(query, [widgetId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      config: row.config || {},
      dataSource: row.data_source || {},
      position: row.position || { x: 0, y: 0, w: 4, h: 4 },
      refreshInterval: row.refresh_interval,
      isVisible: row.is_visible,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private async executeDataSource(dataSource: DataSource, userId: string): Promise<any> {
    switch (dataSource.type) {
      case 'sql':
        return this.executeSqlDataSource(dataSource, userId);
      case 'cypher':
        return this.executeCypherDataSource(dataSource, userId);
      case 'api':
        return this.executeApiDataSource(dataSource, userId);
      case 'static':
        return dataSource.query ? JSON.parse(dataSource.query) : [];
      default:
        throw new Error(`Unsupported data source type: ${dataSource.type}`);
    }
  }

  private async executeSqlDataSource(dataSource: DataSource, userId: string): Promise<any> {
    // Security: Only allow SELECT statements and safe operations
    const query = dataSource.query.trim().toLowerCase();
    if (!query.startsWith('select') && !query.startsWith('with')) {
      throw new Error('Only SELECT queries are allowed for SQL data sources');
    }
    
    // Replace parameters
    let finalQuery = dataSource.query;
    if (dataSource.parameters) {
      for (const [key, value] of Object.entries(dataSource.parameters)) {
        finalQuery = finalQuery.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
    }
    
    // Add user context
    finalQuery = finalQuery.replace(/{{USER_ID}}/g, userId);
    
    const result = await this.pgPool.query(finalQuery);
    return result.rows;
  }

  private async executeCypherDataSource(dataSource: DataSource, userId: string): Promise<any> {
    const session = this.neo4jDriver.session();
    
    try {
      // Replace parameters
      let finalQuery = dataSource.query;
      const params = { ...dataSource.parameters };
      
      if (dataSource.parameters) {
        for (const [key, value] of Object.entries(dataSource.parameters)) {
          finalQuery = finalQuery.replace(new RegExp(`{{${key}}}`, 'g'), `$${key}`);
          params[key] = value;
        }
      }
      
      // Add user context
      finalQuery = finalQuery.replace(/{{USER_ID}}/g, `$userId`);
      params.userId = userId;
      
      const result = await session.run(finalQuery, params);
      return result.records.map(record => record.toObject());
      
    } finally {
      await session.close();
    }
  }

  private async executeApiDataSource(dataSource: DataSource, userId: string): Promise<any> {
    // This would implement API calls to external services
    // For security, only allow whitelisted endpoints
    throw new Error('API data sources not implemented yet');
  }

  private async applyTransformation(data: any[], transformation: DataTransformation): Promise<any[]> {
    switch (transformation.type) {
      case 'filter':
        return this.applyFilterTransformation(data, transformation.config);
      case 'aggregate':
        return this.applyAggregateTransformation(data, transformation.config);
      case 'sort':
        return this.applySortTransformation(data, transformation.config);
      case 'map':
        return this.applyMapTransformation(data, transformation.config);
      default:
        return data;
    }
  }

  private applyFilterTransformation(data: any[], config: any): any[] {
    const { field, operator, value } = config;
    
    return data.filter(item => {
      const fieldValue = item[field];
      
      switch (operator) {
        case 'eq': return fieldValue === value;
        case 'ne': return fieldValue !== value;
        case 'gt': return fieldValue > value;
        case 'gte': return fieldValue >= value;
        case 'lt': return fieldValue < value;
        case 'lte': return fieldValue <= value;
        case 'contains': return String(fieldValue).includes(value);
        case 'startsWith': return String(fieldValue).startsWith(value);
        case 'endsWith': return String(fieldValue).endsWith(value);
        default: return true;
      }
    });
  }

  private applyAggregateTransformation(data: any[], config: any): any[] {
    const { groupBy, aggregations } = config;
    
    if (!groupBy || !aggregations) {
      return data;
    }
    
    const groups = new Map();
    
    // Group data
    for (const item of data) {
      const key = Array.isArray(groupBy) 
        ? groupBy.map(field => item[field]).join('|')
        : item[groupBy];
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    }
    
    // Apply aggregations
    const result = [];
    for (const [key, items] of groups.entries()) {
      const aggregated: any = {};
      
      // Add groupBy fields
      if (Array.isArray(groupBy)) {
        groupBy.forEach((field, index) => {
          aggregated[field] = key.split('|')[index];
        });
      } else {
        aggregated[groupBy] = key;
      }
      
      // Apply aggregation functions
      for (const [field, func] of Object.entries(aggregations)) {
        const values = items.map(item => item[field]).filter(v => v != null);
        
        switch (func) {
          case 'sum':
            aggregated[field] = values.reduce((sum, val) => sum + Number(val), 0);
            break;
          case 'avg':
            aggregated[field] = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
            break;
          case 'count':
            aggregated[field] = values.length;
            break;
          case 'min':
            aggregated[field] = Math.min(...values.map(Number));
            break;
          case 'max':
            aggregated[field] = Math.max(...values.map(Number));
            break;
          case 'distinct':
            aggregated[field] = [...new Set(values)].length;
            break;
        }
      }
      
      result.push(aggregated);
    }
    
    return result;
  }

  private applySortTransformation(data: any[], config: any): any[] {
    const { field, direction = 'asc' } = config;
    
    return [...data].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private applyMapTransformation(data: any[], config: any): any[] {
    const { mapping } = config;
    
    return data.map(item => {
      const mapped: any = {};
      
      for (const [newField, oldField] of Object.entries(mapping)) {
        mapped[newField] = item[oldField];
      }
      
      return { ...item, ...mapped };
    });
  }

  private async checkDashboardAccess(
    dashboardId: string, 
    userId: string, 
    accessType: 'view' | 'edit' | 'owner'
  ): Promise<boolean> {
    const query = `
      SELECT 
        created_by,
        is_public,
        access_control
      FROM dashboards 
      WHERE id = $1
    `;
    
    const result = await this.pgPool.query(query, [dashboardId]);
    
    if (result.rows.length === 0) {
      return false;
    }
    
    const row = result.rows[0];
    const accessControl = row.access_control || { viewers: [], editors: [], owners: [] };
    
    // Owner has all access
    if (row.created_by === userId) {
      return true;
    }
    
    // Check access control lists
    switch (accessType) {
      case 'view':
        return row.is_public || 
               accessControl.viewers?.includes(userId) ||
               accessControl.editors?.includes(userId) ||
               accessControl.owners?.includes(userId);
      case 'edit':
        return accessControl.editors?.includes(userId) ||
               accessControl.owners?.includes(userId);
      case 'owner':
        return accessControl.owners?.includes(userId);
      default:
        return false;
    }
  }

  private async invalidateDashboardCache(dashboardId: string): Promise<void> {
    const keys = await this.redisClient.keys(`dashboard:${dashboardId}:*`);
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
    
    // Also invalidate widget data cache
    const widgetKeys = await this.redisClient.keys(`widget_data:*`);
    for (const key of widgetKeys) {
      // This could be optimized to only clear widgets for this dashboard
      await this.redisClient.del(key);
    }
  }

  async listDashboards(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      tags?: string[];
      sortBy?: 'name' | 'created_at' | 'updated_at';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ dashboards: Dashboard[]; total: number }> {
    const {
      limit = 20,
      offset = 0,
      search,
      tags,
      sortBy = 'updated_at',
      sortOrder = 'desc'
    } = options;
    
    let whereConditions = [
      `(
        d.created_by = $1 OR 
        d.is_public = true OR
        d.access_control->'viewers' ? $1 OR
        d.access_control->'editors' ? $1 OR
        d.access_control->'owners' ? $1
      )`
    ];
    
    let params = [userId];
    let paramIndex = 2;
    
    if (search) {
      whereConditions.push(`(d.name ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (tags && tags.length > 0) {
      whereConditions.push(`d.tags @> $${paramIndex}`);
      params.push(JSON.stringify(tags));
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dashboards d
      ${whereClause}
    `;
    
    const countResult = await this.pgPool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Data query
    const dataQuery = `
      SELECT 
        d.*,
        (
          SELECT COUNT(*)
          FROM dashboard_widgets dw
          WHERE dw.dashboard_id = d.id
        ) as widget_count
      FROM dashboards d
      ${whereClause}
      ORDER BY d.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const result = await this.pgPool.query(dataQuery, params);
    
    const dashboards = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      widgets: [], // Don't load widgets for list view
      layout: row.layout,
      theme: row.theme,
      isPublic: row.is_public,
      shareToken: row.share_token,
      tags: row.tags || [],
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      accessControl: row.access_control || { viewers: [], editors: [], owners: [] },
      settings: row.settings || {},
      _widgetCount: row.widget_count
    }));
    
    return { dashboards, total };
  }

  async getDashboardTemplates(category?: string): Promise<DashboardTemplate[]> {
    let query = 'SELECT * FROM dashboard_templates';
    const params = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    query += ' ORDER BY is_built_in DESC, name ASC';
    
    const result = await this.pgPool.query(query, params);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      widgets: row.widgets || [],
      tags: row.tags || [],
      isBuiltIn: row.is_built_in,
      preview: row.preview
    }));
  }

  async createDashboardFromTemplate(
    templateId: string,
    name: string,
    userId: string,
    customizations?: Record<string, any>
  ): Promise<Dashboard> {
    try {
      // Get template
      const templateQuery = 'SELECT * FROM dashboard_templates WHERE id = $1';
      const templateResult = await this.pgPool.query(templateQuery, [templateId]);
      
      if (templateResult.rows.length === 0) {
        throw new Error('Template not found');
      }
      
      const template = templateResult.rows[0];
      
      // Create dashboard from template
      const dashboardData: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        description: template.description,
        widgets: template.widgets.map((widget: any) => ({
          ...widget,
          id: uuidv4(),
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        layout: 'grid',
        theme: 'light',
        isPublic: false,
        tags: template.tags || [],
        createdBy: userId,
        accessControl: {
          viewers: [],
          editors: [],
          owners: []
        },
        settings: {
          autoRefresh: true,
          refreshInterval: 300,
          timezone: 'UTC'
        }
      };
      
      // Apply customizations
      if (customizations) {
        Object.assign(dashboardData, customizations);
      }
      
      return await this.createDashboard(dashboardData, userId);
      
    } catch (error) {
      logger.error('Error creating dashboard from template:', error);
      throw error;
    }
  }
}
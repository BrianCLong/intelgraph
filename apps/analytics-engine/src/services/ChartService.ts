import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';
import { logger } from '../utils/logger';

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  metadata?: {
    total?: number;
    aggregation?: string;
    timeRange?: { start: Date; end: Date };
    generatedAt: Date;
  };
}

export interface ChartDataset {
  label: string;
  data: number[] | { x: any; y: any }[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
}

export interface ChartQuery {
  type: 'time-series' | 'categorical' | 'comparison' | 'distribution' | 'relationship';
  dataSource: 'postgres' | 'neo4j';
  query: string;
  parameters?: Record<string, any>;
  groupBy?: string | string[];
  aggregateBy?: string;
  aggregateFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  timeField?: string;
  timeInterval?: 'hour' | 'day' | 'week' | 'month' | 'year';
  limit?: number;
  colorScheme?: string;
}

export class ChartService {
  private colorSchemes = {
    default: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'],
    blues: ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'],
    greens: ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
    reds: ['#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FED7D7'],
    purples: ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#E0E7FF'],
    categorical: [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ]
  };

  constructor(
    private pgPool: Pool,
    private neo4jDriver: Driver
  ) {}

  async generateChartData(chartQuery: ChartQuery): Promise<ChartData> {
    try {
      let rawData: any[];
      
      if (chartQuery.dataSource === 'postgres') {
        rawData = await this.executePostgresQuery(chartQuery);
      } else if (chartQuery.dataSource === 'neo4j') {
        rawData = await this.executeNeo4jQuery(chartQuery);
      } else {
        throw new Error(`Unsupported data source: ${chartQuery.dataSource}`);
      }

      return this.transformDataForChart(rawData, chartQuery);

    } catch (error) {
      logger.error('Error generating chart data:', error);
      throw error;
    }
  }

  private async executePostgresQuery(chartQuery: ChartQuery): Promise<any[]> {
    const result = await this.pgPool.query(chartQuery.query, 
      chartQuery.parameters ? Object.values(chartQuery.parameters) : undefined
    );
    return result.rows;
  }

  private async executeNeo4jQuery(chartQuery: ChartQuery): Promise<any[]> {
    const session = this.neo4jDriver.session();
    
    try {
      const result = await session.run(chartQuery.query, chartQuery.parameters);
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  private transformDataForChart(rawData: any[], chartQuery: ChartQuery): ChartData {
    switch (chartQuery.type) {
      case 'time-series':
        return this.transformTimeSeriesData(rawData, chartQuery);
      case 'categorical':
        return this.transformCategoricalData(rawData, chartQuery);
      case 'comparison':
        return this.transformComparisonData(rawData, chartQuery);
      case 'distribution':
        return this.transformDistributionData(rawData, chartQuery);
      case 'relationship':
        return this.transformRelationshipData(rawData, chartQuery);
      default:
        return this.transformCategoricalData(rawData, chartQuery);
    }
  }

  private transformTimeSeriesData(rawData: any[], chartQuery: ChartQuery): ChartData {
    const timeField = chartQuery.timeField || 'date';
    const valueField = chartQuery.aggregateBy || 'value';
    
    // Sort by time
    rawData.sort((a, b) => new Date(a[timeField]).getTime() - new Date(b[timeField]).getTime());
    
    const labels = rawData.map(row => {
      const date = new Date(row[timeField]);
      return this.formatDateLabel(date, chartQuery.timeInterval || 'day');
    });
    
    const data = rawData.map(row => Number(row[valueField]) || 0);
    
    const colors = this.getColorScheme(chartQuery.colorScheme || 'blues');
    
    return {
      labels,
      datasets: [{
        label: chartQuery.aggregateFunction || 'Value',
        data,
        backgroundColor: colors[0] + '20', // 20% opacity
        borderColor: colors[0],
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6
      }],
      metadata: {
        total: rawData.length,
        aggregation: chartQuery.aggregateFunction,
        timeRange: rawData.length > 0 ? {
          start: new Date(rawData[0][timeField]),
          end: new Date(rawData[rawData.length - 1][timeField])
        } : undefined,
        generatedAt: new Date()
      }
    };
  }

  private transformCategoricalData(rawData: any[], chartQuery: ChartQuery): ChartData {
    const labelField = chartQuery.groupBy as string || 'category';
    const valueField = chartQuery.aggregateBy || 'count';
    
    // Group and aggregate if needed
    const grouped = this.groupAndAggregate(rawData, labelField, valueField, chartQuery.aggregateFunction || 'sum');
    
    // Sort by value descending and limit
    const sorted = Object.entries(grouped)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, chartQuery.limit || 10);
    
    const labels = sorted.map(([label]) => String(label));
    const data = sorted.map(([, value]) => Number(value));
    
    const colors = this.getColorScheme(chartQuery.colorScheme || 'categorical');
    
    return {
      labels,
      datasets: [{
        label: chartQuery.aggregateFunction || 'Count',
        data,
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(color => this.darkenColor(color, 0.2)),
        borderWidth: 1
      }],
      metadata: {
        total: Object.values(grouped).reduce((sum, val) => sum + Number(val), 0),
        aggregation: chartQuery.aggregateFunction,
        generatedAt: new Date()
      }
    };
  }

  private transformComparisonData(rawData: any[], chartQuery: ChartQuery): ChartData {
    const groupFields = Array.isArray(chartQuery.groupBy) ? chartQuery.groupBy : [chartQuery.groupBy || 'category'];
    const valueField = chartQuery.aggregateBy || 'value';
    
    if (groupFields.length < 2) {
      return this.transformCategoricalData(rawData, chartQuery);
    }
    
    const [primaryGroup, secondaryGroup] = groupFields;
    
    // Create nested grouping
    const nested: Record<string, Record<string, number>> = {};
    
    for (const row of rawData) {
      const primary = String(row[primaryGroup]);
      const secondary = String(row[secondaryGroup]);
      const value = Number(row[valueField]) || 0;
      
      if (!nested[primary]) {
        nested[primary] = {};
      }
      
      nested[primary][secondary] = (nested[primary][secondary] || 0) + value;
    }
    
    // Get unique secondary categories
    const secondaryCategories = [...new Set(
      Object.values(nested).flatMap(group => Object.keys(group))
    )];
    
    const labels = Object.keys(nested);
    const colors = this.getColorScheme(chartQuery.colorScheme || 'default');
    
    const datasets = secondaryCategories.map((category, index) => ({
      label: category,
      data: labels.map(label => nested[label][category] || 0),
      backgroundColor: colors[index % colors.length] + '80', // 50% opacity
      borderColor: colors[index % colors.length],
      borderWidth: 1
    }));
    
    return {
      labels,
      datasets,
      metadata: {
        total: Object.values(nested).reduce((sum, group) => 
          sum + Object.values(group).reduce((groupSum, val) => groupSum + val, 0), 0
        ),
        aggregation: chartQuery.aggregateFunction,
        generatedAt: new Date()
      }
    };
  }

  private transformDistributionData(rawData: any[], chartQuery: ChartQuery): ChartData {
    const valueField = chartQuery.aggregateBy || 'value';
    const values = rawData.map(row => Number(row[valueField])).filter(v => !isNaN(v));
    
    if (values.length === 0) {
      return {
        labels: [],
        datasets: [],
        metadata: { total: 0, generatedAt: new Date() }
      };
    }
    
    // Calculate histogram bins
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = Math.min(20, Math.ceil(Math.sqrt(values.length)));
    const binWidth = (max - min) / binCount;
    
    const bins = Array.from({ length: binCount }, (_, i) => ({
      start: min + i * binWidth,
      end: min + (i + 1) * binWidth,
      count: 0
    }));
    
    // Fill bins
    for (const value of values) {
      const binIndex = Math.min(binCount - 1, Math.floor((value - min) / binWidth));
      bins[binIndex].count++;
    }
    
    const labels = bins.map(bin => 
      `${bin.start.toFixed(1)}-${bin.end.toFixed(1)}`
    );
    const data = bins.map(bin => bin.count);
    
    const colors = this.getColorScheme(chartQuery.colorScheme || 'blues');
    
    return {
      labels,
      datasets: [{
        label: 'Frequency',
        data,
        backgroundColor: colors[0] + '60', // 40% opacity
        borderColor: colors[0],
        borderWidth: 1
      }],
      metadata: {
        total: values.length,
        aggregation: 'distribution',
        generatedAt: new Date()
      }
    };
  }

  private transformRelationshipData(rawData: any[], chartQuery: ChartQuery): ChartData {
    const xField = Array.isArray(chartQuery.groupBy) ? chartQuery.groupBy[0] : 'x';
    const yField = chartQuery.aggregateBy || 'y';
    
    const data = rawData.map(row => ({
      x: Number(row[xField]) || 0,
      y: Number(row[yField]) || 0
    }));
    
    const colors = this.getColorScheme(chartQuery.colorScheme || 'default');
    
    return {
      labels: [],
      datasets: [{
        label: 'Data Points',
        data,
        backgroundColor: colors[0] + '60', // 40% opacity
        borderColor: colors[0],
        borderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 8
      }],
      metadata: {
        total: data.length,
        aggregation: 'scatter',
        generatedAt: new Date()
      }
    };
  }

  private groupAndAggregate(
    data: any[],
    groupField: string,
    valueField: string,
    aggregateFunction: string
  ): Record<string, number> {
    const grouped: Record<string, number[]> = {};
    
    for (const row of data) {
      const key = String(row[groupField]);
      const value = Number(row[valueField]) || 0;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(value);
    }
    
    const result: Record<string, number> = {};
    
    for (const [key, values] of Object.entries(grouped)) {
      switch (aggregateFunction) {
        case 'sum':
          result[key] = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          result[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'count':
          result[key] = values.length;
          break;
        case 'min':
          result[key] = Math.min(...values);
          break;
        case 'max':
          result[key] = Math.max(...values);
          break;
        default:
          result[key] = values.length;
      }
    }
    
    return result;
  }

  private formatDateLabel(date: Date, interval: string): string {
    switch (interval) {
      case 'hour':
        return date.toLocaleDateString() + ' ' + date.getHours().toString().padStart(2, '0') + ':00';
      case 'day':
        return date.toLocaleDateString();
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `Week of ${weekStart.toLocaleDateString()}`;
      case 'month':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      case 'year':
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString();
    }
  }

  private getColorScheme(schemeName: string): string[] {
    return this.colorSchemes[schemeName] || this.colorSchemes.default;
  }

  private darkenColor(color: string, amount: number): string {
    // Simple color darkening for hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const num = parseInt(hex, 16);
      const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
      const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)));
      const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
    return color;
  }

  // Predefined chart queries for common use cases
  async getEntityGrowthChart(timeRange: { start: Date; end: Date }): Promise<ChartData> {
    const query: ChartQuery = {
      type: 'time-series',
      dataSource: 'postgres',
      query: `
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as count
        FROM entities 
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date
      `,
      parameters: { start: timeRange.start, end: timeRange.end },
      timeField: 'date',
      aggregateBy: 'count',
      aggregateFunction: 'sum',
      timeInterval: 'day',
      colorScheme: 'blues'
    };

    return this.generateChartData(query);
  }

  async getEntityTypeDistribution(): Promise<ChartData> {
    const query: ChartQuery = {
      type: 'categorical',
      dataSource: 'postgres',
      query: `
        SELECT 
          type,
          COUNT(*) as count
        FROM entities 
        GROUP BY type
        ORDER BY count DESC
      `,
      groupBy: 'type',
      aggregateBy: 'count',
      aggregateFunction: 'sum',
      limit: 10,
      colorScheme: 'categorical'
    };

    return this.generateChartData(query);
  }

  async getCaseStatusComparison(): Promise<ChartData> {
    const query: ChartQuery = {
      type: 'comparison',
      dataSource: 'postgres',
      query: `
        SELECT 
          status,
          priority,
          COUNT(*) as count
        FROM cases 
        GROUP BY status, priority
        ORDER BY status, priority
      `,
      groupBy: ['status', 'priority'],
      aggregateBy: 'count',
      aggregateFunction: 'sum',
      colorScheme: 'default'
    };

    return this.generateChartData(query);
  }

  async getRelationshipStrengthDistribution(): Promise<ChartData> {
    const query: ChartQuery = {
      type: 'distribution',
      dataSource: 'neo4j',
      query: `
        MATCH ()-[r]->()
        WHERE r.strength IS NOT NULL
        RETURN r.strength as strength
      `,
      aggregateBy: 'strength',
      colorScheme: 'greens'
    };

    return this.generateChartData(query);
  }

  async getActivityHeatmapData(days: number = 30): Promise<any> {
    const query = `
      SELECT 
        EXTRACT(hour FROM created_at) as hour,
        EXTRACT(dow FROM created_at) as day_of_week,
        COUNT(*) as activity_count
      FROM audit_events 
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY EXTRACT(hour FROM created_at), EXTRACT(dow FROM created_at)
      ORDER BY day_of_week, hour
    `;

    const result = await this.pgPool.query(query);
    
    // Transform to heatmap format
    const heatmapData = Array.from({ length: 7 }, () => Array(24).fill(0));
    
    for (const row of result.rows) {
      const hour = parseInt(row.hour);
      const day = parseInt(row.day_of_week);
      heatmapData[day][hour] = parseInt(row.activity_count);
    }

    return {
      data: heatmapData,
      labels: {
        hours: Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00'),
        days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      },
      metadata: {
        days,
        generatedAt: new Date()
      }
    };
  }
}
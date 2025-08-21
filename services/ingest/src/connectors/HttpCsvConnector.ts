/**
 * IntelGraph HTTP/CSV Connector
 * Reference implementation for CSV data ingestion over HTTP
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { BaseConnector, ConnectorConfig, IngestRecord, ConnectorParameter } from '../sdk/ConnectorSDK.js';
import axios, { AxiosResponse } from 'axios';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { logger } from '../utils/logger.js';

interface CsvRow {
  [key: string]: string;
}

export class HttpCsvConnector extends BaseConnector {
  private connection: any = null;
  private totalRecords = 0;

  constructor() {
    const config: ConnectorConfig = {
      id: 'http-csv',
      name: 'HTTP CSV Connector',
      version: '1.0.0',
      description: 'Ingest CSV data from HTTP endpoints with configurable field mapping and transformations',
      supportedFormats: ['text/csv', 'application/csv'],
      batchSize: 100,
      maxRetries: 3,
      timeout: 1000,
      parameters: [
        {
          name: 'url',
          type: 'string',
          required: true,
          description: 'HTTP URL to fetch CSV data from',
          validation: {
            pattern: '^https?://.+'
          }
        },
        {
          name: 'headers',
          type: 'string',
          required: false,
          description: 'HTTP headers as JSON string (e.g., {"Authorization": "Bearer token"})',
          defaultValue: '{}'
        },
        {
          name: 'delimiter',
          type: 'select',
          required: false,
          description: 'CSV delimiter character',
          defaultValue: ',',
          options: [
            { label: 'Comma (,)', value: ',' },
            { label: 'Semicolon (;)', value: ';' },
            { label: 'Tab', value: '\t' },
            { label: 'Pipe (|)', value: '|' }
          ]
        },
        {
          name: 'hasHeaders',
          type: 'boolean',
          required: false,
          description: 'Whether the first row contains column headers',
          defaultValue: true
        },
        {
          name: 'entityType',
          type: 'string',
          required: true,
          description: 'Default entity type for created records',
          defaultValue: 'CUSTOM'
        },
        {
          name: 'idField',
          type: 'string',
          required: false,
          description: 'CSV field to use as record ID (if empty, UUIDs will be generated)'
        },
        {
          name: 'nameField',
          type: 'string',
          required: false,
          description: 'CSV field to use as entity name'
        },
        {
          name: 'fieldMapping',
          type: 'string',
          required: false,
          description: 'JSON object mapping CSV fields to entity properties (e.g., {"csv_field": "entity_property"})',
          defaultValue: '{}'
        },
        {
          name: 'filters',
          type: 'string',
          required: false,
          description: 'JSON array of filter conditions (e.g., [{"field": "status", "operator": "equals", "value": "active"}])',
          defaultValue: '[]'
        },
        {
          name: 'transformations',
          type: 'string',
          required: false,
          description: 'JSON array of field transformations (e.g., [{"field": "email", "transform": "toLowerCase"}])',
          defaultValue: '[]'
        },
        {
          name: 'skipRows',
          type: 'number',
          required: false,
          description: 'Number of rows to skip at the beginning',
          defaultValue: 0,
          validation: {
            min: 0
          }
        },
        {
          name: 'maxRows',
          type: 'number',
          required: false,
          description: 'Maximum number of rows to process (0 = unlimited)',
          defaultValue: 0,
          validation: {
            min: 0
          }
        },
        {
          name: 'timeout',
          type: 'number',
          required: false,
          description: 'HTTP request timeout in milliseconds',
          defaultValue: 30000,
          validation: {
            min: 1000,
            max: 300000
          }
        }
      ]
    };

    super(config);
  }

  async validate(parameters: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Validate required fields
    if (!parameters.url) {
      errors.push('URL is required');
    } else if (!parameters.url.match(/^https?:\/\/.+/)) {
      errors.push('URL must be a valid HTTP/HTTPS URL');
    }

    if (!parameters.entityType) {
      errors.push('Entity type is required');
    }

    // Validate JSON parameters
    try {
      JSON.parse(parameters.headers || '{}');
    } catch {
      errors.push('Headers must be valid JSON');
    }

    try {
      JSON.parse(parameters.fieldMapping || '{}');
    } catch {
      errors.push('Field mapping must be valid JSON');
    }

    try {
      JSON.parse(parameters.filters || '[]');
    } catch {
      errors.push('Filters must be valid JSON array');
    }

    try {
      JSON.parse(parameters.transformations || '[]');
    } catch {
      errors.push('Transformations must be valid JSON array');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const headers = JSON.parse(this.parameters.headers || '{}');
      
      const response = await axios.head(this.parameters.url, {
        headers,
        timeout: this.parameters.timeout || 30000,
        validateStatus: (status) => status < 500 // Accept redirects and client errors for testing
      });

      const contentType = response.headers['content-type'] || '';
      const isValidContentType = this.config.supportedFormats.some(format => 
        contentType.includes(format.split('/')[1])
      );

      if (!isValidContentType && !contentType.includes('text/plain')) {
        return {
          success: false,
          message: `Unexpected content type: ${contentType}. Expected CSV format.`
        };
      }

      return {
        success: true,
        message: 'Connection successful'
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  async connect(): Promise<void> {
    try {
      const headers = JSON.parse(this.parameters.headers || '{}');
      
      logger.info({
        message: 'Fetching CSV data from HTTP endpoint',
        url: this.parameters.url,
        timeout: this.parameters.timeout
      });

      const response: AxiosResponse = await axios.get(this.parameters.url, {
        headers,
        timeout: this.parameters.timeout || 30000,
        responseType: 'stream'
      });

      if (response.status !== 200) {
        throw new Error(`HTTP request failed with status ${response.status}`);
      }

      this.connection = response.data;
      
      // Try to get total size for progress tracking
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        // Rough estimate: assume average of 50 chars per row
        this.totalRecords = Math.floor(parseInt(contentLength) / 50);
        this.status.progress.total = this.totalRecords;
      }

      logger.info('Successfully connected to HTTP CSV source');

    } catch (error) {
      logger.error({
        message: 'Failed to connect to HTTP CSV source',
        url: this.parameters.url,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
    logger.info('Disconnected from HTTP CSV source');
  }

  async* fetchData(): AsyncGenerator<IngestRecord[], void, unknown> {
    if (!this.connection) {
      throw new Error('Not connected - call connect() first');
    }

    const records: IngestRecord[] = [];
    const batchSize = this.config.batchSize || 100;
    let rowCount = 0;
    let skippedRows = 0;
    const skipRows = parseInt(this.parameters.skipRows) || 0;
    const maxRows = parseInt(this.parameters.maxRows) || 0;

    const fieldMapping = JSON.parse(this.parameters.fieldMapping || '{}');
    const filters = JSON.parse(this.parameters.filters || '[]');
    const transformations = JSON.parse(this.parameters.transformations || '[]');

    return new Promise<void>((resolve, reject) => {
      const csvStream = this.connection
        .pipe(csv({
          separator: this.parameters.delimiter || ',',
          headers: this.parameters.hasHeaders !== false
        }))
        .on('data', (row: CsvRow) => {
          try {
            // Skip rows if configured
            if (skippedRows < skipRows) {
              skippedRows++;
              return;
            }

            // Check max rows limit
            if (maxRows > 0 && rowCount >= maxRows) {
              csvStream.destroy();
              return;
            }

            // Apply filters
            if (!this.passesFilters(row, filters)) {
              return;
            }

            // Create and transform record
            const record = this.createRecordFromRow(row, fieldMapping, transformations);
            if (record) {
              records.push(record);
              rowCount++;

              // Emit batch when full
              if (records.length >= batchSize) {
                const batchRecords = records.splice(0, batchSize);
                setImmediate(() => {
                  this.emit('batchReady', batchRecords);
                });
              }
            }

          } catch (error) {
            logger.error({
              message: 'Error processing CSV row',
              rowNumber: rowCount + skippedRows + 1,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        })
        .on('end', () => {
          // Emit remaining records
          if (records.length > 0) {
            setImmediate(() => {
              this.emit('batchReady', [...records]);
            });
          }
          resolve();
        })
        .on('error', reject);

      // Handle batch emissions
      this.on('batchReady', async (batchRecords: IngestRecord[]) => {
        yield batchRecords;
      });

    }).then(async function*() {
      // This ensures the generator properly handles the async resolution
    });
  }

  private createRecordFromRow(
    row: CsvRow, 
    fieldMapping: Record<string, string>,
    transformations: Array<{ field: string; transform: string; params?: any }>
  ): IngestRecord | null {
    try {
      // Generate ID
      const id = this.parameters.idField && row[this.parameters.idField] 
        ? row[this.parameters.idField]
        : `csv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Map fields
      const mappedData = Object.keys(fieldMapping).length > 0 
        ? this.mapFields(row, fieldMapping)
        : row;

      // Apply transformations
      const transformedData = this.applyFieldTransformations(mappedData, transformations);

      // Determine entity name
      const name = this.parameters.nameField && transformedData[this.parameters.nameField]
        ? transformedData[this.parameters.nameField]
        : id;

      return this.createRecord(
        id,
        this.parameters.entityType || 'CUSTOM',
        transformedData,
        {
          source: this.config.name,
          originalRow: row,
          rowNumber: this.metrics.recordsProcessed + 1
        }
      );

    } catch (error) {
      logger.error({
        message: 'Failed to create record from CSV row',
        row,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private passesFilters(row: CsvRow, filters: Array<{
    field: string;
    operator: string;
    value: any;
    caseSensitive?: boolean;
  }>): boolean {
    return filters.every(filter => {
      const fieldValue = row[filter.field];
      const filterValue = filter.value;
      const caseSensitive = filter.caseSensitive !== false;

      if (fieldValue === undefined) return false;

      const compareValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
      const targetValue = caseSensitive ? filterValue : String(filterValue).toLowerCase();

      switch (filter.operator) {
        case 'equals':
          return compareValue === targetValue;
        case 'not_equals':
          return compareValue !== targetValue;
        case 'contains':
          return compareValue.includes(targetValue);
        case 'not_contains':
          return !compareValue.includes(targetValue);
        case 'starts_with':
          return compareValue.startsWith(targetValue);
        case 'ends_with':
          return compareValue.endsWith(targetValue);
        case 'regex':
          return new RegExp(filterValue, caseSensitive ? 'g' : 'gi').test(fieldValue);
        case 'greater_than':
          return parseFloat(fieldValue) > parseFloat(filterValue);
        case 'less_than':
          return parseFloat(fieldValue) < parseFloat(filterValue);
        case 'greater_equal':
          return parseFloat(fieldValue) >= parseFloat(filterValue);
        case 'less_equal':
          return parseFloat(fieldValue) <= parseFloat(filterValue);
        case 'is_empty':
          return !fieldValue.trim();
        case 'is_not_empty':
          return fieldValue.trim().length > 0;
        default:
          logger.warn(`Unknown filter operator: ${filter.operator}`);
          return true;
      }
    });
  }

  private applyFieldTransformations(
    data: Record<string, any>, 
    transformations: Array<{ field: string; transform: string; params?: any }>
  ): Record<string, any> {
    const transformed = { ...data };

    for (const { field, transform, params } of transformations) {
      if (transformed[field] !== undefined) {
        try {
          const value = transformed[field];
          
          switch (transform) {
            case 'toLowerCase':
              transformed[field] = String(value).toLowerCase();
              break;
            case 'toUpperCase':
              transformed[field] = String(value).toUpperCase();
              break;
            case 'trim':
              transformed[field] = String(value).trim();
              break;
            case 'parseNumber':
              transformed[field] = parseFloat(value) || 0;
              break;
            case 'parseDate':
              transformed[field] = new Date(value);
              break;
            case 'replace':
              if (params?.pattern && params?.replacement !== undefined) {
                transformed[field] = String(value).replace(
                  new RegExp(params.pattern, params.flags || 'g'), 
                  params.replacement
                );
              }
              break;
            case 'split':
              if (params?.delimiter) {
                transformed[field] = String(value).split(params.delimiter);
              }
              break;
            case 'substring':
              if (params?.start !== undefined) {
                transformed[field] = String(value).substring(params.start, params.end);
              }
              break;
            case 'prefix':
              if (params?.prefix) {
                transformed[field] = params.prefix + String(value);
              }
              break;
            case 'suffix':
              if (params?.suffix) {
                transformed[field] = String(value) + params.suffix;
              }
              break;
            default:
              logger.warn(`Unknown transformation: ${transform}`);
          }

        } catch (error) {
          logger.warn({
            message: 'Transformation failed',
            field,
            transform,
            value: transformed[field],
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return transformed;
  }
}
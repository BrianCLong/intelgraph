/**
 * CSV Bulk Import Service for IntelGraph
 *
 * Features:
 * - Streaming CSV/Parquet import for large files
 * - Field mapping UI support
 * - Deduplication based on composite keys
 * - Progress tracking via Socket.IO
 * - Provenance metadata storage
 * - Error handling, validation, and resume support
 */
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
let parquet;
try {
    parquet = require("parquetjs-lite");
}
catch (err) {
    parquet = null;
}
const { v4: uuid } = require("uuid");
const { Transform } = require("stream");
class CSVImportService {
    constructor(neo4jDriver, pgClient, socketIO) {
        this.neo4j = neo4jDriver;
        this.pg = pgClient;
        this.io = socketIO;
        this.activeJobs = new Map();
    }
    /**
     * Start a CSV import job
     */
    async startImport(options) {
        const { filePath, investigationId, mapping, dedupeKey, userId, tenantId = "default", } = options;
        const jobId = uuid();
        const job = {
            id: jobId,
            status: "pending",
            filePath,
            investigationId,
            mapping,
            dedupeKey,
            userId,
            tenantId,
            stats: {
                totalRows: 0,
                processedRows: 0,
                createdNodes: 0,
                updatedNodes: 0,
                createdRelationships: 0,
                errors: 0,
                skippedRows: 0,
            },
            errors: [],
            createdAt: new Date().toISOString(),
            startedAt: null,
            finishedAt: null,
        };
        // Save job to database
        await this.saveJob(job);
        this.activeJobs.set(jobId, job);
        // Start processing asynchronously
        setImmediate(() => this.processFile(job));
        return job;
    }
    /**
     * Process CSV file with streaming
     */
    async processFile(job) {
        const session = this.neo4j.session();
        try {
            job.status = "running";
            job.startedAt = new Date().toISOString();
            await this.updateJob(job);
            await this.emitProgress(job);
            await this.countRows(job);
            const ext = path.extname(job.filePath).toLowerCase();
            if (ext === ".parquet") {
                await this.processParquetData(job, session);
            }
            else {
                await this.processCsvData(job, session);
            }
            job.status = "completed";
            job.finishedAt = new Date().toISOString();
            await this.updateJob(job);
            await this.emitProgress(job);
        }
        catch (error) {
            job.status = "failed";
            job.finishedAt = new Date().toISOString();
            job.errors.push({
                type: "FATAL_ERROR",
                message: error.message,
                timestamp: new Date().toISOString(),
            });
            await this.updateJob(job);
            await this.emitProgress(job);
        }
        finally {
            await session.close();
            this.activeJobs.delete(job.id);
        }
    }
    async countRows(job) {
        const ext = path.extname(job.filePath).toLowerCase();
        if (ext === ".parquet") {
            return this.countParquetRows(job);
        }
        return this.countCsvRows(job);
    }
    async countCsvRows(job) {
        return new Promise((resolve, reject) => {
            let count = 0;
            fs.createReadStream(job.filePath)
                .pipe(csv())
                .on("data", () => count++)
                .on("end", () => {
                job.stats.totalRows = count;
                resolve(count);
            })
                .on("error", reject);
        });
    }
    async countParquetRows(job) {
        if (!parquet)
            throw new Error("Parquet support not installed");
        const reader = await parquet.ParquetReader.openFile(job.filePath);
        const cursor = reader.getCursor();
        let count = 0;
        while (await cursor.next()) {
            count++;
        }
        await reader.close();
        job.stats.totalRows = count;
        return count;
    }
    async processCsvData(job, session) {
        const batchSize = 1000;
        let batch = [];
        const startRow = job.stats.processedRows || 0;
        let rowIndex = 0;
        return new Promise((resolve, reject) => {
            const stream = fs
                .createReadStream(job.filePath)
                .pipe(csv())
                .pipe(new Transform({
                objectMode: true,
                transform: async (row, encoding, callback) => {
                    try {
                        if (rowIndex < startRow) {
                            rowIndex++;
                            job.stats.processedRows = rowIndex;
                            return callback();
                        }
                        const processedRow = await this.validateAndTransformRow(row, job, rowIndex);
                        if (processedRow) {
                            batch.push(processedRow);
                        }
                        else {
                            job.stats.skippedRows++;
                        }
                        rowIndex++;
                        job.stats.processedRows = rowIndex;
                        if (batch.length >= batchSize) {
                            await this.processBatch(batch, job, session);
                            batch = [];
                            await this.updateJob(job);
                            await this.emitProgress(job);
                        }
                        callback();
                    }
                    catch (error) {
                        this.handleRowError(error, row, rowIndex, job);
                        callback();
                    }
                },
            }));
            stream.on("finish", async () => {
                try {
                    if (batch.length > 0) {
                        await this.processBatch(batch, job, session);
                    }
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            });
            stream.on("error", reject);
        });
    }
    async processParquetData(job, session) {
        if (!parquet)
            throw new Error("Parquet support not installed");
        const batchSize = 1000;
        let batch = [];
        const startRow = job.stats.processedRows || 0;
        let rowIndex = 0;
        const reader = await parquet.ParquetReader.openFile(job.filePath);
        const cursor = reader.getCursor();
        let record;
        while ((record = await cursor.next())) {
            if (rowIndex < startRow) {
                rowIndex++;
                job.stats.processedRows = rowIndex;
                continue;
            }
            try {
                const processedRow = await this.validateAndTransformRow(record, job, rowIndex);
                if (processedRow) {
                    batch.push(processedRow);
                }
                else {
                    job.stats.skippedRows++;
                }
                rowIndex++;
                job.stats.processedRows = rowIndex;
                if (batch.length >= batchSize) {
                    await this.processBatch(batch, job, session);
                    batch = [];
                    await this.updateJob(job);
                    await this.emitProgress(job);
                }
            }
            catch (error) {
                this.handleRowError(error, record, rowIndex, job);
            }
        }
        if (batch.length > 0) {
            await this.processBatch(batch, job, session);
        }
        await reader.close();
    }
    /**
     * Validate and transform a CSV row based on mapping
     */
    async validateAndTransformRow(row, job, index) {
        const { mapping } = job;
        // Skip empty rows
        if (Object.values(row).every((val) => !val || val.trim() === "")) {
            return null;
        }
        const transformed = {
            _index: index,
            _sourceFile: path.basename(job.filePath),
            _importJobId: job.id,
            _tenantId: job.tenantId,
            _investigationId: job.investigationId,
            type: mapping.entityType || "UNKNOWN",
            properties: {},
        };
        // Apply field mappings
        for (const [csvField, domainField] of Object.entries(mapping.fieldMapping || {})) {
            const value = row[csvField];
            if (value !== undefined && value !== null && value !== "") {
                transformed.properties[domainField] = this.parseValue(value, domainField);
            }
        }
        // Generate composite key for deduplication
        if (job.dedupeKey && job.dedupeKey.length > 0) {
            const keyParts = job.dedupeKey
                .map((field) => transformed.properties[field] || "")
                .filter(Boolean);
            if (keyParts.length > 0) {
                transformed._compositeKey = `${job.tenantId}:${transformed.type}:${keyParts.join(":")}`;
            }
        }
        return transformed;
    }
    /**
     * Parse value based on field type hints
     */
    parseValue(value, fieldName) {
        const stringValue = String(value).trim();
        // Try to detect and parse different types
        if (fieldName.toLowerCase().includes("date") ||
            fieldName.toLowerCase().includes("time")) {
            const date = new Date(stringValue);
            return isNaN(date.getTime()) ? stringValue : date.toISOString();
        }
        if (fieldName.toLowerCase().includes("lat") ||
            fieldName.toLowerCase().includes("lon") ||
            fieldName.toLowerCase().includes("coordinate")) {
            const num = parseFloat(stringValue);
            return isNaN(num) ? stringValue : num;
        }
        // Try to parse as number
        if (/^\-?\d+(\.\d+)?$/.test(stringValue)) {
            return parseFloat(stringValue);
        }
        // Try to parse as boolean
        if (/^(true|false|yes|no|1|0)$/i.test(stringValue)) {
            return /^(true|yes|1)$/i.test(stringValue);
        }
        return stringValue;
    }
    /**
     * Process a batch of rows with Neo4j
     */
    async processBatch(batch, job, session) {
        if (batch.length === 0)
            return;
        // Group by entity type for efficient processing
        const byType = batch.reduce((acc, item) => {
            if (!acc[item.type])
                acc[item.type] = [];
            acc[item.type].push(item);
            return acc;
        }, {});
        for (const [type, items] of Object.entries(byType)) {
            await this.processBatchByType(type, items, job, session);
        }
    }
    /**
     * Process batch of same entity type
     */
    async processBatchByType(entityType, items, job, session) {
        const cypher = `
      UNWIND $items AS item
      MERGE (n:${entityType} {
        _compositeKey: item._compositeKey,
        _tenantId: item._tenantId
      })
      ON CREATE SET
        n += item.properties,
        n._createdAt = datetime(),
        n._ingestedAt = datetime(), // Add ingestedAt
        n._createdBy = $userId,
        n._importJobId = item._importJobId,
        n._investigationId = item._investigationId,
        n._sourceFile = item._sourceFile,
        n._provenance = item._sourceFile,
        n._source = 'CSV', // Add source
        n._confidence = 1.0, // Add confidence
        n._version = 1
      ON MATCH SET
        n += item.properties,
        n._updatedAt = datetime(),
        n._updatedBy = $userId,
        n._version = n._version + 1
      RETURN n._compositeKey AS key, 
             CASE WHEN n._createdAt = datetime() THEN 'created' ELSE 'updated' END AS action
    `;
        try {
            const result = await session.run(cypher, {
                items: items.map((item) => ({
                    _compositeKey: item._compositeKey || uuid(),
                    _tenantId: item._tenantId,
                    _importJobId: item._importJobId,
                    _investigationId: item._investigationId,
                    _sourceFile: item._sourceFile,
                    properties: item.properties,
                })),
                userId: job.userId,
            });
            // Update statistics
            result.records.forEach((record) => {
                const action = record.get("action");
                if (action === "created") {
                    job.stats.createdNodes++;
                }
                else {
                    job.stats.updatedNodes++;
                }
            });
        }
        catch (error) {
            job.stats.errors++;
            job.errors.push({
                type: "BATCH_ERROR",
                entityType,
                batchSize: items.length,
                message: error.message,
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * Handle individual row errors
     */
    handleRowError(error, row, index, job) {
        job.stats.errors++;
        job.errors.push({
            type: "ROW_ERROR",
            rowIndex: index,
            row: row,
            message: error.message,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Save import job to database
     */
    async saveJob(job) {
        const query = `
      INSERT INTO csv_import_jobs (
        id, investigation_id, user_id, tenant_id, status, file_path,
        mapping, stats, errors, created_at, started_at, finished_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        stats = EXCLUDED.stats,
        errors = EXCLUDED.errors,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at
    `;
        const values = [
            job.id,
            job.investigationId,
            job.userId,
            job.tenantId,
            job.status,
            job.filePath,
            JSON.stringify(job.mapping),
            JSON.stringify(job.stats),
            JSON.stringify(job.errors),
            job.createdAt,
            job.startedAt,
            job.finishedAt,
        ];
        await this.pg.query(query, values);
    }
    /**
     * Update job in database
     */
    async updateJob(job) {
        await this.saveJob(job);
    }
    /**
     * Emit progress via Socket.IO
     */
    async emitProgress(job) {
        if (this.io) {
            const progress = {
                jobId: job.id,
                status: job.status,
                progress: job.stats.totalRows > 0
                    ? (job.stats.processedRows / job.stats.totalRows) * 100
                    : 0,
                stats: job.stats,
                recentErrors: job.errors.slice(-5), // Last 5 errors
            };
            this.io.to(`import:job:${job.id}`).emit("import:progress", progress);
            this.io
                .to(`investigation:${job.investigationId}`)
                .emit("import:progress", progress);
        }
    }
    /**
     * Get job status
     */
    async getJob(jobId) {
        const query = `
      SELECT * FROM csv_import_jobs WHERE id = $1
    `;
        const result = await this.pg.query(query, [jobId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            investigationId: row.investigation_id,
            userId: row.user_id,
            tenantId: row.tenant_id,
            status: row.status,
            filePath: row.file_path,
            mapping: JSON.parse(row.mapping || "{}"),
            stats: JSON.parse(row.stats || "{}"),
            errors: JSON.parse(row.errors || "[]"),
            createdAt: row.created_at,
            startedAt: row.started_at,
            finishedAt: row.finished_at,
        };
    }
    /**
     * List import jobs for an investigation
     */
    async listJobs(investigationId, limit = 20) {
        const query = `
      SELECT * FROM csv_import_jobs 
      WHERE investigation_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
        const result = await this.pg.query(query, [investigationId, limit]);
        return result.rows.map((row) => ({
            id: row.id,
            investigationId: row.investigation_id,
            userId: row.user_id,
            tenantId: row.tenant_id,
            status: row.status,
            filePath: row.file_path,
            mapping: JSON.parse(row.mapping || "{}"),
            stats: JSON.parse(row.stats || "{}"),
            errors: JSON.parse(row.errors || "[]"),
            createdAt: row.created_at,
            startedAt: row.started_at,
            finishedAt: row.finished_at,
        }));
    }
    /**
     * Resume a failed or paused import job
     */
    async resumeImport(jobId) {
        const job = await this.getJob(jobId);
        if (!job || (job.status !== "failed" && job.status !== "paused")) {
            throw new Error("Job cannot be resumed");
        }
        this.activeJobs.set(jobId, job);
        setImmediate(() => this.processFile(job));
        return job;
    }
    /**
     * Cancel a running import job
     */
    async cancelJob(jobId) {
        const job = this.activeJobs.get(jobId);
        if (job && (job.status === "running" || job.status === "pending")) {
            job.status = "cancelled";
            job.finishedAt = new Date().toISOString();
            await this.updateJob(job);
            await this.emitProgress(job);
            this.activeJobs.delete(jobId);
            return true;
        }
        return false;
    }
}
module.exports = CSVImportService;
//# sourceMappingURL=CSVImportService.js.map
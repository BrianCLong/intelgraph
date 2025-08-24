/**
 * STIX 2.1 + TAXII Import Service for IntelGraph
 *
 * Features:
 * - TAXII 2.1 client with collection support
 * - STIX 2.1 bundle parsing
 * - Common SDO/SRO mapping to domain schema
 * - Cursor-based pagination and resume
 * - Provenance metadata preservation
 * - Deduplication based on STIX IDs
 */
const axios = require("axios");
const { v4: uuid } = require("uuid");
class STIXImportService {
    constructor(neo4jDriver, pgClient, socketIO) {
        this.neo4j = neo4jDriver;
        this.pg = pgClient;
        this.io = socketIO;
        this.activeJobs = new Map();
    }
    /**
     * Start TAXII collection import
     */
    async startTaxiiImport(options) {
        const { taxiiUrl, collectionId, investigationId, auth, userId, tenantId = "default", addedAfter = null, limit = 1000, } = options;
        const jobId = uuid();
        const job = {
            id: jobId,
            type: "TAXII",
            status: "pending",
            taxiiUrl,
            collectionId,
            investigationId,
            auth,
            userId,
            tenantId,
            cursor: null,
            addedAfter,
            limit,
            stats: {
                totalObjects: 0,
                processedObjects: 0,
                createdNodes: 0,
                updatedNodes: 0,
                createdRelationships: 0,
                errors: 0,
                skippedObjects: 0,
            },
            errors: [],
            createdAt: new Date().toISOString(),
            startedAt: null,
            finishedAt: null,
        };
        await this.saveJob(job);
        this.activeJobs.set(jobId, job);
        setImmediate(() => this.processTaxiiCollection(job));
        return job;
    }
    /**
     * Start STIX bundle import from file
     */
    async startStixBundleImport(options) {
        const { bundlePath, investigationId, userId, tenantId = "default", } = options;
        const jobId = uuid();
        const job = {
            id: jobId,
            type: "STIX_BUNDLE",
            status: "pending",
            bundlePath,
            investigationId,
            userId,
            tenantId,
            stats: {
                totalObjects: 0,
                processedObjects: 0,
                createdNodes: 0,
                updatedNodes: 0,
                createdRelationships: 0,
                errors: 0,
                skippedObjects: 0,
            },
            errors: [],
            createdAt: new Date().toISOString(),
            startedAt: null,
            finishedAt: null,
        };
        await this.saveJob(job);
        this.activeJobs.set(jobId, job);
        setImmediate(() => this.processStixBundle(job));
        return job;
    }
    /**
     * Process TAXII collection with pagination
     */
    async processTaxiiCollection(job) {
        const session = this.neo4j.session();
        try {
            job.status = "running";
            job.startedAt = new Date().toISOString();
            await this.updateJob(job);
            await this.emitProgress(job);
            const client = this.createTaxiiClient(job.taxiiUrl, job.auth);
            let hasMore = true;
            while (hasMore && job.status === "running") {
                const response = await this.fetchTaxiiObjects(client, job);
                if (response.objects && response.objects.length > 0) {
                    await this.processStixObjects(response.objects, job, session);
                    job.cursor = response.next;
                    job.stats.totalObjects += response.objects.length;
                }
                hasMore = !!response.more && !!response.next;
                await this.updateJob(job);
                await this.emitProgress(job);
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
                type: "TAXII_ERROR",
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
    /**
     * Process STIX bundle from file
     */
    async processStixBundle(job) {
        const session = this.neo4j.session();
        const fs = require("fs");
        try {
            job.status = "running";
            job.startedAt = new Date().toISOString();
            await this.updateJob(job);
            await this.emitProgress(job);
            const bundleData = JSON.parse(fs.readFileSync(job.bundlePath, "utf8"));
            if (bundleData.type !== "bundle") {
                throw new Error('Invalid STIX bundle: missing type "bundle"');
            }
            if (bundleData.objects && Array.isArray(bundleData.objects)) {
                job.stats.totalObjects = bundleData.objects.length;
                await this.processStixObjects(bundleData.objects, job, session);
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
                type: "BUNDLE_ERROR",
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
    /**
     * Create TAXII client with authentication
     */
    createTaxiiClient(baseUrl, auth) {
        const headers = {
            Accept: "application/taxii+json;version=2.1",
            "Content-Type": "application/taxii+json;version=2.1",
        };
        if (auth) {
            if (auth.type === "basic") {
                const token = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
                headers["Authorization"] = `Basic ${token}`;
            }
            else if (auth.type === "bearer") {
                headers["Authorization"] = `Bearer ${auth.token}`;
            }
        }
        return axios.create({
            baseURL: baseUrl,
            headers,
            timeout: 30000,
        });
    }
    /**
     * Fetch STIX objects from TAXII collection
     */
    async fetchTaxiiObjects(client, job) {
        const params = {
            limit: job.limit,
        };
        if (job.cursor) {
            params.next = job.cursor;
        }
        if (job.addedAfter) {
            params.added_after = job.addedAfter;
        }
        const response = await client.get(`/collections/${job.collectionId}/objects/`, { params });
        return response.data;
    }
    /**
     * Process array of STIX objects
     */
    async processStixObjects(objects, job, session) {
        const batchSize = 100;
        for (let i = 0; i < objects.length; i += batchSize) {
            const batch = objects.slice(i, i + batchSize);
            await this.processStixBatch(batch, job, session);
            job.stats.processedObjects += batch.length;
            if (i % (batchSize * 5) === 0) {
                // Update every 5 batches
                await this.emitProgress(job);
            }
        }
    }
    /**
     * Process batch of STIX objects
     */
    async processStixBatch(batch, job, session) {
        // Separate SDOs and SROs for different processing
        const sdos = batch.filter((obj) => this.isStixDomainObject(obj));
        const sros = batch.filter((obj) => this.isStixRelationshipObject(obj));
        // Process SDOs first
        for (const sdo of sdos) {
            try {
                const confidence = typeof sdo.confidence === "number" ? sdo.confidence / 100 : 1.0;
                await this.processStixDomainObject(sdo, job, session, confidence);
                job.stats.createdNodes++;
            }
            catch (error) {
                this.handleObjectError(error, sdo, job);
            }
        }
        // Then process SROs
        for (const sro of sros) {
            try {
                const confidence = typeof sro.confidence === "number" ? sro.confidence / 100 : 1.0;
                await this.processStixRelationshipObject(sro, job, session, confidence);
                job.stats.createdRelationships++;
            }
            catch (error) {
                this.handleObjectError(error, sro, job);
            }
        }
    }
    /**
     * Check if object is a STIX Domain Object (SDO)
     */
    isStixDomainObject(obj) {
        const sdoTypes = [
            "attack-pattern",
            "campaign",
            "course-of-action",
            "grouping",
            "identity",
            "incident",
            "indicator",
            "infrastructure",
            "intrusion-set",
            "location",
            "malware",
            "malware-analysis",
            "note",
            "observed-data",
            "opinion",
            "report",
            "threat-actor",
            "tool",
            "vulnerability",
        ];
        return sdoTypes.includes(obj.type);
    }
    /**
     * Check if object is a STIX Relationship Object (SRO)
     */
    isStixRelationshipObject(obj) {
        return obj.type === "relationship" || obj.type === "sighting";
    }
    /**
     * Process STIX Domain Object
     */
    async processStixDomainObject(sdo, job, session, confidence = 1.0) {
        const domainMapping = this.mapStixToDomain(sdo);
        const provenance = job.taxiiUrl || job.bundlePath || sdo.created_by_ref || "STIX";
        const cypher = `
      MERGE (n:${domainMapping.label} {
        stix_id: $stixId,
        _tenantId: $tenantId
      })
      ON CREATE SET
        n += $properties,
        n._createdAt = datetime(),
        n._ingestedAt = datetime(), // Add ingestedAt
        n._createdBy = $userId,
        n._importJobId = $jobId,
        n._investigationId = $investigationId,
        n._source = 'STIX',
        n._sourceVersion = $sourceVersion,
        n._provenance = $provenance,
        n._confidence = $confidence,
        n._version = 1
      ON MATCH SET
        n += $properties,
        n._updatedAt = datetime(),
        n._updatedBy = $userId,
        n._version = n._version + 1
      RETURN n.stix_id AS stixId
    `;
        await session.run(cypher, {
            stixId: sdo.id,
            tenantId: job.tenantId,
            properties: domainMapping.properties,
            userId: job.userId,
            jobId: job.id,
            investigationId: job.investigationId,
            sourceVersion: sdo.spec_version || "2.1",
            provenance,
            confidence,
        });
    }
    /**
     * Process STIX Relationship Object
     */
    async processStixRelationshipObject(sro, job, session, confidence = 1.0) {
        const relationshipType = this.mapStixRelationshipType(sro.relationship_type || sro.type);
        const provenance = job.taxiiUrl || job.bundlePath || sro.created_by_ref || "STIX";
        const cypher = `
      MATCH (source {stix_id: $sourceRef, _tenantId: $tenantId})
      MATCH (target {stix_id: $targetRef, _tenantId: $tenantId})
      MERGE (source)-[r:${relationshipType} {
        stix_id: $stixId,
        _tenantId: $tenantId
      }]->(target)
      ON CREATE SET
        r += $properties,
        r._createdAt = datetime(),
        r._ingestedAt = datetime(), // Add ingestedAt
        r._createdBy = $userId,
        r._importJobId = $jobId,
        r._investigationId = $investigationId,
        r._source = 'STIX',
        r._provenance = $provenance,
        r._confidence = $confidence,
        r._version = 1
      ON MATCH SET
        r += $properties,
        r._updatedAt = datetime(),
        r._updatedBy = $userId,
        r._version = r._version + 1
      RETURN r.stix_id AS stixId
    `;
        const properties = {
            stix_type: sro.type,
            relationship_type: sro.relationship_type,
            created: sro.created,
            modified: sro.modified,
        };
        if (sro.type === "sighting") {
            properties.count = sro.count || 1;
            properties.first_seen = sro.first_seen;
            properties.last_seen = sro.last_seen;
        }
        await session.run(cypher, {
            stixId: sro.id,
            sourceRef: sro.source_ref,
            targetRef: sro.target_ref,
            tenantId: job.tenantId,
            properties,
            userId: job.userId,
            jobId: job.id,
            investigationId: job.investigationId,
            provenance,
            confidence,
        });
    }
    /**
     * Map STIX object to domain model
     */
    mapStixToDomain(stixObj) {
        const typeMapping = {
            "threat-actor": "THREAT_ACTOR",
            malware: "MALWARE",
            "attack-pattern": "ATTACK_PATTERN",
            campaign: "CAMPAIGN",
            indicator: "INDICATOR",
            identity: "IDENTITY",
            infrastructure: "INFRASTRUCTURE",
            "intrusion-set": "INTRUSION_SET",
            tool: "TOOL",
            vulnerability: "VULNERABILITY",
            report: "REPORT",
            "observed-data": "OBSERVED_DATA",
        };
        const label = typeMapping[stixObj.type] || "STIX_OBJECT";
        const properties = {
            stix_type: stixObj.type,
            name: stixObj.name,
            description: stixObj.description,
            created: stixObj.created,
            modified: stixObj.modified,
            spec_version: stixObj.spec_version || "2.1",
        };
        // Add type-specific properties
        switch (stixObj.type) {
            case "threat-actor":
                properties.aliases = stixObj.aliases;
                properties.threat_actor_types = stixObj.threat_actor_types;
                properties.sophistication = stixObj.sophistication;
                break;
            case "malware":
                properties.malware_types = stixObj.malware_types;
                properties.is_family = stixObj.is_family;
                break;
            case "indicator":
                properties.pattern = stixObj.pattern;
                properties.indicator_types = stixObj.indicator_types;
                properties.valid_from = stixObj.valid_from;
                properties.valid_until = stixObj.valid_until;
                break;
            case "vulnerability":
                properties.cve_id = this.extractCveId(stixObj.external_references);
                properties.cvss_score = this.extractCvssScore(stixObj.external_references);
                break;
        }
        // Add external references
        if (stixObj.external_references) {
            properties.external_references = stixObj.external_references;
        }
        // Add labels/tags
        if (stixObj.labels) {
            properties.labels = stixObj.labels;
        }
        return { label, properties };
    }
    /**
     * Map STIX relationship types to domain relationships
     */
    mapStixRelationshipType(stixType) {
        const mapping = {
            uses: "USES",
            indicates: "INDICATES",
            targets: "TARGETS",
            "attributed-to": "ATTRIBUTED_TO",
            mitigates: "MITIGATES",
            impersonates: "IMPERSONATES",
            compromises: "COMPROMISES",
            "communicates-with": "COMMUNICATES_WITH",
            delivers: "DELIVERS",
            downloads: "DOWNLOADS",
            drops: "DROPS",
            exploits: "EXPLOITS",
            "variant-of": "VARIANT_OF",
            sighting: "SIGHTING",
        };
        return mapping[stixType] || "RELATED_TO";
    }
    /**
     * Extract CVE ID from external references
     */
    extractCveId(externalRefs) {
        if (!externalRefs)
            return null;
        const cveRef = externalRefs.find((ref) => ref.source_name === "cve" || ref.external_id?.startsWith("CVE-"));
        return cveRef?.external_id || null;
    }
    /**
     * Extract CVSS score from external references
     */
    extractCvssScore(externalRefs) {
        if (!externalRefs)
            return null;
        const cvssRef = externalRefs.find((ref) => ref.source_name?.includes("cvss") || ref.description?.includes("CVSS"));
        return cvssRef?.score || null;
    }
    /**
     * Handle object processing errors
     */
    handleObjectError(error, stixObj, job) {
        job.stats.errors++;
        job.errors.push({
            type: "OBJECT_ERROR",
            stixId: stixObj.id,
            stixType: stixObj.type,
            message: error.message,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Save import job to database
     */
    async saveJob(job) {
        const query = `
      INSERT INTO stix_import_jobs (
        id, type, investigation_id, user_id, tenant_id, status,
        taxii_url, collection_id, bundle_path, cursor, stats, errors,
        created_at, started_at, finished_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        cursor = EXCLUDED.cursor,
        stats = EXCLUDED.stats,
        errors = EXCLUDED.errors,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at
    `;
        const values = [
            job.id,
            job.type,
            job.investigationId,
            job.userId,
            job.tenantId,
            job.status,
            job.taxiiUrl || null,
            job.collectionId || null,
            job.bundlePath || null,
            job.cursor || null,
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
                type: job.type,
                status: job.status,
                progress: job.stats.totalObjects > 0
                    ? (job.stats.processedObjects / job.stats.totalObjects) * 100
                    : 0,
                stats: job.stats,
                recentErrors: job.errors.slice(-5),
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
        const query = `SELECT * FROM stix_import_jobs WHERE id = $1`;
        const result = await this.pg.query(query, [jobId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            type: row.type,
            investigationId: row.investigation_id,
            userId: row.user_id,
            tenantId: row.tenant_id,
            status: row.status,
            taxiiUrl: row.taxii_url,
            collectionId: row.collection_id,
            bundlePath: row.bundle_path,
            cursor: row.cursor,
            stats: JSON.parse(row.stats || "{}"),
            errors: JSON.parse(row.errors || "[]"),
            createdAt: row.created_at,
            startedAt: row.started_at,
            finishedAt: row.finished_at,
        };
    }
    /**
     * List STIX import jobs for an investigation
     */
    async listJobs(investigationId, limit = 20) {
        const query = `
      SELECT * FROM stix_import_jobs
      WHERE investigation_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
        const result = await this.pg.query(query, [investigationId, limit]);
        return result.rows.map((row) => ({
            id: row.id,
            type: row.type,
            investigationId: row.investigation_id,
            userId: row.user_id,
            tenantId: row.tenant_id,
            status: row.status,
            taxiiUrl: row.taxii_url,
            collectionId: row.collection_id,
            bundlePath: row.bundle_path,
            cursor: row.cursor,
            stats: JSON.parse(row.stats || "{}"),
            errors: JSON.parse(row.errors || "[]"),
            createdAt: row.created_at,
            startedAt: row.started_at,
            finishedAt: row.finished_at,
        }));
    }
    /**
     * Resume TAXII import from cursor
     */
    async resumeTaxiiImport(jobId) {
        const job = await this.getJob(jobId);
        if (!job || job.type !== "TAXII") {
            throw new Error("Invalid or non-TAXII job");
        }
        if (job.status !== "failed" && job.status !== "paused") {
            throw new Error("Job cannot be resumed");
        }
        this.activeJobs.set(jobId, job);
        setImmediate(() => this.processTaxiiCollection(job));
        return job;
    }
}
module.exports = STIXImportService;
//# sourceMappingURL=STIXImportService.js.map
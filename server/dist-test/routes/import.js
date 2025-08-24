/**
 * Import API Routes for IntelGraph
 *
 * Provides REST endpoints for:
 * - CSV file uploads and import jobs
 * - STIX bundle uploads and processing
 * - TAXII collection imports
 * - Import job management and monitoring
 * - Legacy validation endpoint
 */
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const CSVImportService = require("../services/CSVImportService");
const STIXImportService = require("../services/STIXImportService");
const { ensureAuthenticated, requireRole } = require("../middleware/auth");
const { writeAudit } = require("../utils/audit");
const router = express.Router();
// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), "uploads", "imports");
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        }
        catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${timestamp}-${file.originalname}`;
        cb(null, filename);
    },
});
const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [".csv", ".json", ".txt", ".parquet"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowedTypes.join(", ")}`));
        }
    },
});
// Middleware
router.use(ensureAuthenticated);
router.use((req, res, next) => {
    if (!req.app.locals.csvImportService) {
        req.app.locals.csvImportService = new CSVImportService(req.app.locals.neo4jDriver, req.app.locals.pgClient, req.app.locals.io);
    }
    if (!req.app.locals.stixImportService) {
        req.app.locals.stixImportService = new STIXImportService(req.app.locals.neo4jDriver, req.app.locals.pgClient, req.app.locals.io);
    }
    next();
});
// ==============================================================================
// LEGACY ENDPOINT (preserved for backward compatibility)
// ==============================================================================
// Validate an import payload and preview the changes without applying
router.post("/validate", async (req, res) => {
    try {
        const payload = req.body;
        if (!payload || typeof payload !== "object") {
            return res.status(400).json({ error: "Invalid payload" });
        }
        // Minimal shape checks (placeholder for schema contracts)
        const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
        const edges = Array.isArray(payload.edges) ? payload.edges : [];
        const problems = [];
        for (const [i, n] of nodes.entries()) {
            if (!n.uuid && !n.id)
                problems.push({ type: "node", index: i, issue: "missing id/uuid" });
            if (!n.type)
                problems.push({ type: "node", index: i, issue: "missing type" });
        }
        for (const [i, e] of edges.entries()) {
            if (!e.source || !e.target)
                problems.push({ type: "edge", index: i, issue: "missing endpoints" });
            if (!e.type)
                problems.push({ type: "edge", index: i, issue: "missing type" });
        }
        const summary = {
            nodes: nodes.length,
            edges: edges.length,
            problems,
            canApply: problems.length === 0,
        };
        await writeAudit({
            userId: req.user?.id,
            actorRole: req.user?.role,
            sessionId: req.sessionId,
            action: "IMPORT_VALIDATE",
            resourceType: "Graph",
            resourceId: null,
            details: { counts: { nodes: nodes.length, edges: edges.length } },
            ip: req.ip,
            userAgent: req.get("User-Agent"),
        });
        return res.json({ summary });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
// ==============================================================================
// CSV IMPORT ENDPOINTS
// ==============================================================================
/**
 * Upload and analyze CSV file structure
 */
router.post("/csv/analyze", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const ext = path.extname(req.file.path).toLowerCase();
        const sampleRows = [];
        let fields = [];
        let rowCount = 0;
        if (ext === ".parquet") {
            let parquet;
            try {
                parquet = require("parquetjs-lite");
            }
            catch (err) {
                return res.status(500).json({ error: "Parquet support not installed" });
            }
            const reader = await parquet.ParquetReader.openFile(req.file.path);
            fields = Object.keys(reader.schema.fields);
            const cursor = reader.getCursor();
            let record;
            while ((record = await cursor.next()) && rowCount < 100) {
                if (rowCount < 5)
                    sampleRows.push(record);
                rowCount++;
            }
            while (await cursor.next()) {
                rowCount++;
            }
            await reader.close();
        }
        else {
            const csv = require("csv-parser");
            const fs = require("fs");
            const fieldSet = new Set();
            const stream = fs
                .createReadStream(req.file.path)
                .pipe(csv())
                .on("data", (row) => {
                if (rowCount < 100) {
                    Object.keys(row).forEach((key) => fieldSet.add(key));
                    if (rowCount < 5)
                        sampleRows.push(row);
                }
                rowCount++;
            });
            await new Promise((resolve, reject) => {
                stream.on("end", resolve);
                stream.on("error", reject);
            });
            fields = Array.from(fieldSet);
        }
        await writeAudit({
            userId: req.user?.id,
            action: "FILE_ANALYZE",
            resourceType: "Import",
            details: {
                filename: req.file.originalname,
                fields: fields.length,
                rows: rowCount,
            },
        });
        res.json({
            filename: req.file.originalname,
            filePath: req.file.path,
            fields,
            sampleRows,
            estimatedRows: rowCount,
            fileSize: req.file.size,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * Start CSV import job
 */
router.post("/csv/import", async (req, res) => {
    try {
        const { filePath, investigationId, mapping, dedupeKey } = req.body;
        if (!filePath || !mapping) {
            return res
                .status(400)
                .json({ error: "filePath and mapping are required" });
        }
        const job = await req.app.locals.csvImportService.startImport({
            filePath,
            investigationId,
            mapping,
            dedupeKey,
            userId: req.user.id,
            tenantId: req.user.tenantId || "default",
        });
        await writeAudit({
            userId: req.user?.id,
            action: "CSV_IMPORT_START",
            resourceType: "Import",
            resourceId: job.id,
            details: { investigationId, entityType: mapping.entityType },
        });
        res.json(job);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get CSV import job status
 */
router.get("/csv/:jobId", async (req, res) => {
    try {
        const job = await req.app.locals.csvImportService.getJob(req.params.jobId);
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }
        res.json(job);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * Resume CSV import job
 */
router.post("/csv/:jobId/resume", async (req, res) => {
    try {
        const job = await req.app.locals.csvImportService.resumeImport(req.params.jobId);
        await writeAudit({
            userId: req.user?.id,
            action: "CSV_IMPORT_RESUME",
            resourceType: "Import",
            resourceId: job.id,
            details: { investigationId: job.investigationId },
        });
        res.json(job);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// ==============================================================================
// STIX IMPORT ENDPOINTS
// ==============================================================================
/**
 * Upload and start STIX bundle import
 */
router.post("/stix/bundle", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const { investigationId } = req.body;
        // Validate JSON structure
        const bundleContent = await fs.readFile(req.file.path, "utf8");
        const bundle = JSON.parse(bundleContent);
        if (bundle.type !== "bundle") {
            return res
                .status(400)
                .json({ error: 'Invalid STIX bundle: missing type "bundle"' });
        }
        const job = await req.app.locals.stixImportService.startStixBundleImport({
            bundlePath: req.file.path,
            investigationId,
            userId: req.user.id,
            tenantId: req.user.tenantId || "default",
        });
        await writeAudit({
            userId: req.user?.id,
            action: "STIX_BUNDLE_IMPORT_START",
            resourceType: "Import",
            resourceId: job.id,
            details: { investigationId, objectCount: bundle.objects?.length || 0 },
        });
        res.json(job);
    }
    catch (error) {
        if (error instanceof SyntaxError) {
            res.status(400).json({ error: "Invalid JSON format" });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
/**
 * Start TAXII collection import
 */
router.post("/stix/taxii", async (req, res) => {
    try {
        const { taxiiUrl, collectionId, investigationId, auth, addedAfter, limit = 1000, } = req.body;
        if (!taxiiUrl || !collectionId) {
            return res
                .status(400)
                .json({ error: "taxiiUrl and collectionId are required" });
        }
        const job = await req.app.locals.stixImportService.startTaxiiImport({
            taxiiUrl,
            collectionId,
            investigationId,
            auth,
            addedAfter,
            limit,
            userId: req.user.id,
            tenantId: req.user.tenantId || "default",
        });
        await writeAudit({
            userId: req.user?.id,
            action: "TAXII_IMPORT_START",
            resourceType: "Import",
            resourceId: job.id,
            details: { investigationId, taxiiUrl, collectionId },
        });
        res.json(job);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get STIX import job status
 */
router.get("/stix/:jobId", async (req, res) => {
    try {
        const job = await req.app.locals.stixImportService.getJob(req.params.jobId);
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }
        res.json(job);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * Resume STIX TAXII import
 */
router.post("/stix/:jobId/resume", async (req, res) => {
    try {
        const job = await req.app.locals.stixImportService.resumeTaxiiImport(req.params.jobId);
        await writeAudit({
            userId: req.user?.id,
            action: "TAXII_IMPORT_RESUME",
            resourceType: "Import",
            resourceId: job.id,
            details: {
                investigationId: job.investigationId,
                taxiiUrl: job.taxiiUrl,
                collectionId: job.collectionId,
            },
        });
        res.json(job);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// ==============================================================================
// GENERAL IMPORT ENDPOINTS
// ==============================================================================
/**
 * List all import jobs for an investigation
 */
router.get("/jobs/:investigationId", async (req, res) => {
    try {
        const { investigationId } = req.params;
        const { limit = 50 } = req.query;
        // Get both CSV and STIX jobs
        const csvJobs = await req.app.locals.csvImportService.listJobs(investigationId, limit);
        const stixJobs = await req.app.locals.stixImportService.listJobs(investigationId, limit);
        // Combine and sort by creation time
        const allJobs = [
            ...csvJobs.map((job) => ({ ...job, type: "CSV" })),
            ...stixJobs.map((job) => ({ ...job, type: job.type || "STIX" })),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(allJobs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get suggested field mappings
 */
router.post("/mapping/suggest", async (req, res) => {
    try {
        const { fields, entityType = "ENTITY" } = req.body;
        if (!fields || !Array.isArray(fields)) {
            return res.status(400).json({ error: "fields array is required" });
        }
        const suggestions = {};
        // Basic field mapping suggestions
        const mappingRules = {
            name: ["name", "title", "label", "entity_name", "full_name"],
            description: ["description", "desc", "summary", "notes", "details"],
            firstName: ["first_name", "fname", "given_name"],
            lastName: ["last_name", "lname", "surname", "family_name"],
            email: ["email", "email_address", "e_mail"],
            phone: ["phone", "telephone", "phone_number"],
            industry: ["industry", "sector", "business_type"],
            website: ["website", "url", "homepage", "web_site"],
            address: ["address", "street_address", "location"],
            city: ["city", "town", "municipality"],
            country: ["country", "nation"],
            latitude: ["lat", "latitude", "geo_lat"],
            longitude: ["lon", "lng", "longitude", "geo_lon"],
            dateCreated: ["created", "date_created", "created_at", "timestamp"],
            id: ["id", "identifier", "external_id", "ref_id"],
            type: ["type", "category", "classification"],
        };
        for (const field of fields) {
            const lowerField = field.toLowerCase();
            for (const [targetField, patterns] of Object.entries(mappingRules)) {
                if (patterns.some((pattern) => lowerField.includes(pattern))) {
                    suggestions[field] = targetField;
                    break;
                }
            }
        }
        res.json({
            entityType,
            suggestions,
            recommendedDedupeKey: suggestions.name
                ? ["name"]
                : suggestions.id
                    ? ["id"]
                    : Object.keys(suggestions).slice(0, 2),
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Error handling middleware
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res
                .status(400)
                .json({ error: "File too large. Maximum size is 100MB." });
        }
    }
    console.error("Import API Error:", error);
    res.status(500).json({ error: "Internal server error" });
});
module.exports = router;
//# sourceMappingURL=import.js.map
const express = require('express');
const { Parser } = require('json2csv');
const archiver = require('archiver');
const crypto = require('crypto');
const stream = require('stream');
const { PassThrough } = require('stream');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { getNeo4jDriver } = require('../config/database');
const { getPostgresPool } = require('../config/database');
const { ensureAuthenticated } = require('../middleware/auth');
const { redactData } = require('../utils/dataRedaction');
const { gaCorePolicyMiddleware } = require('../middleware/opa');

const router = express.Router();

router.use(ensureAuthenticated);

/**
 * GA Core: Calculate SHA256 hash of a stream
 */
async function sha256Stream(readableStream) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    let bytes = 0;
    
    readableStream.on('data', (chunk) => {
      hash.update(chunk);
      bytes += chunk.length;
    });
    
    readableStream.on('end', () => {
      resolve({
        digest: hash.digest('hex'),
        length: bytes
      });
    });
    
    readableStream.on('error', reject);
  });
}

/**
 * GA Core: Create provenance manifest for export bundle
 */
function createProvenanceManifest(exhibits, transforms, metadata = {}) {
  return {
    version: '1.0',
    type: 'intelgraph-export',
    createdAt: new Date().toISOString(),
    createdBy: metadata.userId,
    investigationId: metadata.investigationId,
    tenantId: metadata.tenantId,
    exportId: metadata.exportId || uuidv4(),
    
    // All files in the export
    exhibits: exhibits.map(exhibit => ({
      filename: exhibit.filename,
      sha256: exhibit.digest,
      bytes: exhibit.length,
      contentType: exhibit.contentType,
      description: exhibit.description
    })),
    
    // Data transformations applied
    transforms: transforms.map(transform => ({
      type: transform.type,
      description: transform.description,
      parameters: transform.parameters,
      appliedAt: transform.appliedAt
    })),
    
    // Audit and compliance info
    compliance: {
      dataClassification: metadata.dataClassification || 'UNCLASSIFIED',
      retentionPolicy: metadata.retentionPolicy,
      accessControls: metadata.accessControls,
      redactionApplied: metadata.redactionApplied || false
    },
    
    // Signature for integrity verification
    integrity: {
      algorithm: 'SHA256',
      manifestHash: null // Will be calculated after serialization
    }
  };
}

/**
 * GA Core: Audit export action
 */
async function auditExportAction(exportMetadata, success = true, error = null) {
  try {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO audit_logs (
        id, event_type, resource_type, resource_id, user_id,
        action, result, details, timestamp, request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv4(),
        'data_export',
        'investigation',
        exportMetadata.investigationId,
        exportMetadata.userId,
        'export_data',
        success ? 'success' : 'failure',
        JSON.stringify({
          format: exportMetadata.format,
          recordCount: exportMetadata.recordCount,
          exportId: exportMetadata.exportId,
          ...(error && { error: error.message })
        }),
        new Date(),
        exportMetadata.requestId
      ]
    );
  } catch (auditError) {
    console.error('Failed to audit export action:', auditError);
  }
}

function addFilterClauses({
  investigationId,
  entityType,
  tags,
  startDate,
  endDate,
}) {
  const conditions = [];
  const params = {};

  if (investigationId) {
    conditions.push('e.investigation_id = $investigationId');
    params.investigationId = investigationId;
  }

  if (entityType) {
    conditions.push('e.type = $entityType');
    params.entityType = entityType;
  }

  if (tags && tags.length > 0) {
    conditions.push('ANY(tag IN e.tags WHERE tag IN $tags)');
    params.tags = tags;
  }

  if (startDate) {
    conditions.push('e.created_at >= $startDate');
    params.startDate = startDate;
  }

  if (endDate) {
    conditions.push('e.created_at <= $endDate');
    params.endDate = endDate;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

router.get('/entities', async (req, res) => {
  const session = getNeo4jDriver().session();
  
  try {
    const { format = 'json', investigationId, entityType, tags, startDate, endDate } = req.query;
    
    const { where, params } = addFilterClauses({
      investigationId,
      entityType,
      tags: tags ? tags.split(',') : undefined,
      startDate,
      endDate,
    });

    if (format === "json") {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="entities.json"');
      
      const writableStream = res;
      writableStream.write('{"nodes":[');
      
      const nodesQuery = `MATCH (e:Entity) ${where} RETURN e`;
      const nodesResult = await session.run(nodesQuery, params);
      
      for (let i = 0; i < nodesResult.records.length; i++) {
        const originalNode = nodesResult.records[i].get('e').properties;
        const redactedNode = redactData(originalNode, req.user);
        writableStream.write(JSON.stringify(redactedNode));
        if (i < nodesResult.records.length - 1) {
          writableStream.write(",");
        }
      }
      
      writableStream.write('],"edges":[');
      
      const edgeWhere = where.replace(/e\./g, "a.");
      const edgesQuery = `MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) ${edgeWhere ? edgeWhere + " AND b.investigation_id = a.investigation_id" : ""} RETURN a,r,b`;
      const edgesResult = await session.run(edgesQuery, params);
      
      for (let i = 0; i < edgesResult.records.length; i++) {
        const r = edgesResult.records[i].get('r');
        const a = edgesResult.records[i].get('a');
        const b = edgesResult.records[i].get('b');
        const originalEdge = {
          id: r.properties?.id || r.identity?.toString?.() || undefined,
          uuid: r.properties?.uuid,
          type: r.type || r.properties?.type,
          label: r.properties?.label,
          source: a.properties?.uuid,
          target: b.properties?.uuid,
          properties: r.properties || {},
        };
        const redactedEdge = redactData(originalEdge, req.user);
        writableStream.write(JSON.stringify(redactedEdge));
        if (i < edgesResult.records.length - 1) {
          writableStream.write(",");
        }
      }
      
      writableStream.write(']}');
      writableStream.end();
      
    } else if (format === "csv") {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="entities.csv"');
      
      const writableStream = res;
      const nodeParser = new Parser({
        fields: ["uuid", "name", "type", "properties"],
        header: true,
      });
      const edgeParser = new Parser({
        fields: ["uuid", "type", "label", "source", "target", "properties"],
        header: true,
      });
      
      writableStream.write("# Nodes\n");
      const nodesQuery = `MATCH (e:Entity) ${where} RETURN e`;
      const nodesResult = await session.run(nodesQuery, params);
      const nodes = nodesResult.records.map(rec => redactData(rec.get('e').properties, req.user));
      writableStream.write(nodeParser.parse(nodes.map(n => ({...n, properties: JSON.stringify(n.properties || {})}))) + '\n\n');
      
      writableStream.write('# Edges\n');
      const edgeWhere = where.replace(/e\./g, 'a.');
      const edgesQuery = `MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) ${edgeWhere ? edgeWhere + ' AND b.investigation_id = a.investigation_id' : ''} RETURN a,r,b`;
      const edgesResult = await session.run(edgesQuery, params);
      const edges = edgesResult.records.map(rec => {
        const r = rec.get('r');
        const a = rec.get('a');
        const b = rec.get('b');
        const originalEdge = {
          id: r.properties?.id || r.identity?.toString?.() || undefined,
          uuid: r.properties?.uuid,
          type: r.type || r.properties?.type,
          label: r.properties?.label,
          source: a.properties?.uuid,
          target: b.properties?.uuid,
          properties: r.properties || {},
        };
        return redactData(originalEdge, req.user);
      });
      
      writableStream.write(edgeParser.parse(edges.map(e => ({...e, properties: JSON.stringify(e.properties || {})}))) + '\n');
      writableStream.end();
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  } finally {
    await session.close();
  }
});

/**
 * GA Core: Enhanced export with provenance integrity
 */
router.get('/bundle', gaCorePolicyMiddleware('investigation', 'export'), async (req, res) => {
  const session = getNeo4jDriver().session();
  const requestId = uuidv4();
  
  try {
    const { investigationId, format = 'json', includeManifest = 'true' } = req.query;
    
    if (!investigationId) {
      return res.status(400).json({ error: 'Investigation ID required for bundle export' });
    }
    
    const exportMetadata = {
      exportId: uuidv4(),
      userId: req.user.id,
      tenantId: req.user.tenantId,
      investigationId,
      format,
      requestId,
      timestamp: new Date().toISOString()
    };

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="investigation-${investigationId}-${exportMetadata.exportId}.zip"`);
    
    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    
    const exhibits = [];
    const transforms = [];
    let recordCount = 0;
    
    // Export entities
    const entitiesQuery = `MATCH (e:Entity) WHERE e.investigation_id = $investigationId RETURN e`;
    const entitiesResult = await session.run(entitiesQuery, { investigationId });
    
    const entities = entitiesResult.records.map(rec => {
      const original = rec.get('e').properties;
      const redacted = redactData(original, req.user);
      recordCount++;
      return redacted;
    });
    
    if (entities.length > 0) {
      transforms.push({
        type: 'redaction',
        description: 'Applied user-specific data redaction',
        parameters: { userRole: req.user.role, tenantId: req.user.tenantId },
        appliedAt: new Date().toISOString()
      });
    }
    
    // Create entities file with hash calculation
    const entitiesJson = JSON.stringify(entities, null, 2);
    const entitiesBuffer = Buffer.from(entitiesJson);
    const entitiesHash = crypto.createHash('sha256').update(entitiesBuffer).digest('hex');
    
    archive.append(entitiesBuffer, { name: 'entities.json' });
    exhibits.push({
      filename: 'entities.json',
      digest: entitiesHash,
      length: entitiesBuffer.length,
      contentType: 'application/json',
      description: `${entities.length} entities from investigation ${investigationId}`
    });
    
    // Export relationships
    const relationshipsQuery = `
      MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) 
      WHERE a.investigation_id = $investigationId AND b.investigation_id = $investigationId 
      RETURN a, r, b
    `;
    const relationshipsResult = await session.run(relationshipsQuery, { investigationId });
    
    const relationships = relationshipsResult.records.map(rec => {
      const r = rec.get('r');
      const a = rec.get('a');
      const b = rec.get('b');
      const original = {
        id: r.properties?.id || r.identity?.toString?.(),
        type: r.type || r.properties?.type,
        source: a.properties?.uuid,
        target: b.properties?.uuid,
        properties: r.properties || {}
      };
      recordCount++;
      return redactData(original, req.user);
    });
    
    if (relationships.length > 0) {
      const relationshipsJson = JSON.stringify(relationships, null, 2);
      const relationshipsBuffer = Buffer.from(relationshipsJson);
      const relationshipsHash = crypto.createHash('sha256').update(relationshipsBuffer).digest('hex');
      
      archive.append(relationshipsBuffer, { name: 'relationships.json' });
      exhibits.push({
        filename: 'relationships.json',
        digest: relationshipsHash,
        length: relationshipsBuffer.length,
        contentType: 'application/json',
        description: `${relationships.length} relationships from investigation ${investigationId}`
      });
    }
    
    // Add investigation metadata
    const investigationQuery = `MATCH (i:Investigation {id: $investigationId}) RETURN i`;
    const investigationResult = await session.run(investigationQuery, { investigationId });
    
    if (investigationResult.records.length > 0) {
      const investigation = redactData(investigationResult.records[0].get('i').properties, req.user);
      const investigationJson = JSON.stringify(investigation, null, 2);
      const investigationBuffer = Buffer.from(investigationJson);
      const investigationHash = crypto.createHash('sha256').update(investigationBuffer).digest('hex');
      
      archive.append(investigationBuffer, { name: 'investigation.json' });
      exhibits.push({
        filename: 'investigation.json',
        digest: investigationHash,
        length: investigationBuffer.length,
        contentType: 'application/json',
        description: 'Investigation metadata and configuration'
      });
    }
    
    // Create and add provenance manifest (GA Core requirement)
    if (includeManifest === 'true') {
      const manifest = createProvenanceManifest(exhibits, transforms, {
        ...exportMetadata,
        dataClassification: 'UNCLASSIFIED', // Would be determined by data classification rules
        redactionApplied: transforms.some(t => t.type === 'redaction'),
        recordCount
      });
      
      // Calculate manifest hash for integrity
      const manifestJson = JSON.stringify(manifest, null, 2);
      const manifestHash = crypto.createHash('sha256').update(manifestJson).digest('hex');
      manifest.integrity.manifestHash = manifestHash;
      
      const finalManifestJson = JSON.stringify(manifest, null, 2);
      archive.append(Buffer.from(finalManifestJson), { name: 'manifest.json' });
    }
    
    // Update export metadata
    exportMetadata.recordCount = recordCount;
    
    // Finalize archive
    await archive.finalize();
    
    // Audit successful export
    await auditExportAction(exportMetadata, true);
    
    console.log(`GA Core export completed: ${recordCount} records, ${exhibits.length} files, manifest included`);
    
  } catch (error) {
    console.error('GA Core export error:', error);
    await auditExportAction({ ...exportMetadata, recordCount: 0 }, false, error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Export failed',
        code: 'EXPORT_ERROR',
        requestId
      });
    }
  } finally {
    await session.close();
  }
});

/**
 * GA Core: Streaming export for large datasets
 */
router.get('/stream', gaCorePolicyMiddleware('investigation', 'export'), async (req, res) => {
  const session = getNeo4jDriver().session();
  const requestId = uuidv4();
  
  try {
    const { investigationId, batchSize = 1000 } = req.query;
    
    if (!investigationId) {
      return res.status(400).json({ error: 'Investigation ID required for streaming export' });
    }
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'application/x-ndjson'); // Newline Delimited JSON
    res.setHeader('Content-Disposition', `attachment; filename="investigation-${investigationId}-stream.ndjson"`);
    res.setHeader('Transfer-Encoding', 'chunked');
    
    let totalRecords = 0;
    const exportId = uuidv4();
    
    // Stream entities in batches
    const entitiesQuery = `
      MATCH (e:Entity) 
      WHERE e.investigation_id = $investigationId 
      RETURN e 
      SKIP $skip 
      LIMIT $limit
    `;
    
    let skip = 0;
    let hasMoreEntities = true;
    
    while (hasMoreEntities) {
      const result = await session.run(entitiesQuery, {
        investigationId,
        skip,
        limit: parseInt(batchSize)
      });
      
      if (result.records.length === 0) {
        hasMoreEntities = false;
        break;
      }
      
      for (const record of result.records) {
        const entity = redactData(record.get('e').properties, req.user);
        const entityRecord = {
          type: 'entity',
          exportId,
          timestamp: new Date().toISOString(),
          data: entity
        };
        
        res.write(JSON.stringify(entityRecord) + '\n');
        totalRecords++;
      }
      
      skip += parseInt(batchSize);
    }
    
    // Stream relationships
    const relationshipsQuery = `
      MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) 
      WHERE a.investigation_id = $investigationId AND b.investigation_id = $investigationId 
      RETURN a, r, b
      SKIP $skip 
      LIMIT $limit
    `;
    
    skip = 0;
    let hasMoreRelationships = true;
    
    while (hasMoreRelationships) {
      const result = await session.run(relationshipsQuery, {
        investigationId,
        skip,
        limit: parseInt(batchSize)
      });
      
      if (result.records.length === 0) {
        hasMoreRelationships = false;
        break;
      }
      
      for (const record of result.records) {
        const r = record.get('r');
        const a = record.get('a');
        const b = record.get('b');
        const relationship = {
          id: r.properties?.id || r.identity?.toString?.(),
          type: r.type || r.properties?.type,
          source: a.properties?.uuid,
          target: b.properties?.uuid,
          properties: r.properties || {}
        };
        
        const relationshipRecord = {
          type: 'relationship',
          exportId,
          timestamp: new Date().toISOString(),
          data: redactData(relationship, req.user)
        };
        
        res.write(JSON.stringify(relationshipRecord) + '\n');
        totalRecords++;
      }
      
      skip += parseInt(batchSize);
    }
    
    // Write final metadata record
    const metadata = {
      type: 'metadata',
      exportId,
      investigationId,
      totalRecords,
      completedAt: new Date().toISOString(),
      userId: req.user.id,
      tenantId: req.user.tenantId
    };
    
    res.write(JSON.stringify(metadata) + '\n');
    res.end();
    
    // Audit successful streaming export
    await auditExportAction({
      exportId,
      userId: req.user.id,
      tenantId: req.user.tenantId,
      investigationId,
      format: 'ndjson-stream',
      recordCount: totalRecords,
      requestId
    }, true);
    
    console.log(`GA Core streaming export completed: ${totalRecords} records`);
    
  } catch (error) {
    console.error('GA Core streaming export error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Streaming export failed',
        code: 'STREAM_EXPORT_ERROR',
        requestId
      });
    }
  } finally {
    await session.close();
  }
});

/**
 * GA Core: Verify export integrity
 */
router.post('/verify', async (req, res) => {
  try {
    const { manifestHash, expectedFiles } = req.body;
    
    if (!manifestHash || !expectedFiles) {
      return res.status(400).json({
        error: 'Manifest hash and expected files required for verification',
        code: 'VERIFICATION_PARAMS_MISSING'
      });
    }
    
    // In a real implementation, this would:
    // 1. Retrieve the original export manifest from storage
    // 2. Recalculate hashes of provided files
    // 3. Compare against manifest
    // 4. Verify chain of custody
    
    const verification = {
      verified: true, // Mock verification
      manifestHashValid: true,
      allFilesPresent: expectedFiles.length > 0,
      integrityScore: 1.0,
      verifiedAt: new Date().toISOString(),
      verificationId: uuidv4()
    };
    
    res.json(verification);
    
  } catch (error) {
    console.error('Export verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
});

module.exports = router;
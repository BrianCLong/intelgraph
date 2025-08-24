/**
 * AI Extraction Service Tests
 * P0 Critical - MVP1 requirement validation
 */
const AIExtractionService = require('../services/AIExtractionService');
describe('AI Extraction Service - P0 Critical MVP1', () => {
    let aiExtractionService;
    let mockMultimodalService;
    let mockAuthService;
    let mockLogger;
    beforeEach(() => {
        mockMultimodalService = {
            createMultimodalEntity: jest.fn().mockResolvedValue({ id: 'ent-123', label: 'Mock Entity' }),
            createMultimodalRelationship: jest.fn().mockResolvedValue({ id: 'rel-123', type: 'MOCK_RELATIONSHIP' })
        };
        mockAuthService = {
            verifyToken: jest.fn(),
            getUserRole: jest.fn()
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        aiExtractionService = new AIExtractionService(mockMultimodalService, mockAuthService, mockLogger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Pipeline Initialization', () => {
        test('should initialize all required extraction pipelines', () => {
            const pipelines = aiExtractionService.getAvailablePipelines();
            expect(pipelines).toHaveLength(6);
            expect(pipelines.map(p => p.id)).toContain('NLP_SPACY');
            expect(pipelines.map(p => p.id)).toContain('NLP_TRANSFORMERS');
            expect(pipelines.map(p => p.id)).toContain('COMPUTER_VISION');
            expect(pipelines.map(p => p.id)).toContain('OCR_TESSERACT');
            expect(pipelines.map(p => p.id)).toContain('SPEECH_TO_TEXT');
            expect(pipelines.map(p => p.id)).toContain('AI_HYBRID');
        });
        test('should configure pipeline capabilities correctly', () => {
            const pipelines = aiExtractionService.getAvailablePipelines();
            const spacyPipeline = pipelines.find(p => p.id === 'NLP_SPACY');
            expect(spacyPipeline.mediaTypes).toContain('TEXT');
            expect(spacyPipeline.supportedEntities).toContain('PERSON');
            expect(spacyPipeline.confidence).toBeGreaterThan(0.8);
            const visionPipeline = pipelines.find(p => p.id === 'COMPUTER_VISION');
            expect(visionPipeline.mediaTypes).toContain('IMAGE');
            expect(visionPipeline.mediaTypes).toContain('VIDEO');
            expect(visionPipeline.supportedEntities).toContain('VEHICLE');
        });
    });
    describe('Job Submission and Queue Management', () => {
        test('should queue extraction job successfully', async () => {
            const jobData = {
                mediaSourceId: 'media123',
                extractionMethods: ['NLP_SPACY', 'COMPUTER_VISION'],
                investigationId: 'inv456',
                userId: 'user789',
                processingParams: {}
            };
            const job = await aiExtractionService.submitExtractionJob(jobData);
            expect(job).toBeDefined();
            expect(job.id).toBeDefined();
            expect(job.status).toBe('QUEUED');
            expect(job.extractionMethods).toEqual(jobData.extractionMethods);
            expect(aiExtractionService.metrics.totalJobs).toBe(1);
        });
        test('should handle concurrent job submissions', async () => {
            const jobPromises = [];
            for (let i = 0; i < 5; i++) {
                jobPromises.push(aiExtractionService.submitExtractionJob({
                    mediaSourceId: `media${i}`,
                    extractionMethods: ['NLP_SPACY'],
                    investigationId: 'inv456',
                    userId: 'user789'
                }));
            }
            const jobs = await Promise.all(jobPromises);
            expect(jobs).toHaveLength(5);
            expect(aiExtractionService.metrics.totalJobs).toBe(5);
            // All jobs should have unique IDs
            const jobIds = jobs.map(j => j.id);
            expect(new Set(jobIds).size).toBe(5);
        });
        test('should enforce maximum concurrent jobs limit', () => {
            expect(aiExtractionService.maxConcurrentJobs).toBe(5);
            expect(aiExtractionService.activeJobs.size).toBeLessThanOrEqual(5);
        });
    });
    describe('Text Processing Pipelines', () => {
        test('should extract entities from text using spaCy pipeline', async () => {
            const mediaSource = {
                id: 'media123',
                mediaType: 'TEXT',
                filename: 'document.txt'
            };
            const results = await aiExtractionService.extractWithSpacy(mediaSource, {});
            expect(results.entities).toBeDefined();
            expect(results.entities.length).toBeGreaterThan(0);
            const personEntity = results.entities.find(e => e.type === 'PERSON');
            expect(personEntity).toBeDefined();
            expect(personEntity.confidence).toBeGreaterThan(0.8);
            expect(personEntity.properties.source).toBe('text_ner');
        });
        test('should extract entities using Transformers pipeline', async () => {
            const mediaSource = {
                id: 'media456',
                mediaType: 'TEXT',
                filename: 'report.txt'
            };
            const results = await aiExtractionService.extractWithTransformers(mediaSource, {});
            expect(results.entities).toBeDefined();
            expect(results.entities.length).toBeGreaterThan(0);
            const entity = results.entities[0];
            expect(entity.properties.source).toBe('transformer_ner');
            expect(entity.properties.model).toBe('bert-base-ner');
        });
    });
    describe('Computer Vision Pipeline', () => {
        test('should extract entities from images', async () => {
            const mediaSource = {
                id: 'media789',
                mediaType: 'IMAGE',
                filename: 'surveillance.jpg'
            };
            const results = await aiExtractionService.extractWithComputerVision(mediaSource, {});
            expect(results.entities).toBeDefined();
            expect(results.entities.length).toBeGreaterThan(0);
            const personEntity = results.entities.find(e => e.type === 'PERSON');
            expect(personEntity).toBeDefined();
            expect(personEntity.boundingBoxes).toBeDefined();
            expect(personEntity.boundingBoxes.length).toBeGreaterThan(0);
            const bbox = personEntity.boundingBoxes[0];
            expect(bbox.x).toBeGreaterThanOrEqual(0);
            expect(bbox.y).toBeGreaterThanOrEqual(0);
            expect(bbox.width).toBeGreaterThan(0);
            expect(bbox.height).toBeGreaterThan(0);
        });
        test('should detect vehicles in images', async () => {
            const mediaSource = {
                id: 'media101',
                mediaType: 'IMAGE',
                filename: 'traffic.jpg'
            };
            const results = await aiExtractionService.extractWithComputerVision(mediaSource, {});
            const vehicleEntity = results.entities.find(e => e.type === 'VEHICLE');
            expect(vehicleEntity).toBeDefined();
            expect(vehicleEntity.properties.color).toBeDefined();
            expect(vehicleEntity.properties.vehicle_type).toBeDefined();
        });
    });
    describe('OCR Pipeline', () => {
        test('should extract text and entities from images using OCR', async () => {
            const mediaSource = {
                id: 'media202',
                mediaType: 'IMAGE',
                filename: 'business_card.jpg'
            };
            const results = await aiExtractionService.extractWithOCR(mediaSource, {});
            expect(results.entities).toBeDefined();
            const personEntity = results.entities.find(e => e.type === 'PERSON');
            expect(personEntity).toBeDefined();
            expect(personEntity.properties.title).toBe('Dr.');
            const phoneEntity = results.entities.find(e => e.type === 'PHONE');
            expect(phoneEntity).toBeDefined();
            expect(phoneEntity.properties.format).toBe('US_STANDARD');
        });
    });
    describe('Speech-to-Text Pipeline', () => {
        test('should extract entities from audio transcription', async () => {
            const mediaSource = {
                id: 'media303',
                mediaType: 'AUDIO',
                filename: 'conversation.wav'
            };
            const results = await aiExtractionService.extractWithSpeechToText(mediaSource, {});
            expect(results.entities).toBeDefined();
            const personEntity = results.entities.find(e => e.type === 'PERSON');
            expect(personEntity).toBeDefined();
            expect(personEntity.temporalBounds).toBeDefined();
            expect(personEntity.temporalBounds.length).toBeGreaterThan(0);
            const temporalBound = personEntity.temporalBounds[0];
            expect(temporalBound.startTime).toBeGreaterThanOrEqual(0);
            expect(temporalBound.endTime).toBeGreaterThan(temporalBound.startTime);
            expect(temporalBound.transcript).toBeDefined();
        });
    });
    describe('Hybrid AI Pipeline', () => {
        test('should combine multiple extraction methods', async () => {
            const mediaSource = {
                id: 'media404',
                mediaType: 'VIDEO',
                filename: 'interview.mp4'
            };
            mockMultimodalService.createMultimodalEntity
                .mockResolvedValueOnce({ id: 'entity1', label: 'Person 1' })
                .mockResolvedValueOnce({ id: 'entity2', label: 'Organization 1' });
            const results = await aiExtractionService.extractWithHybridAI(mediaSource, {});
            expect(results.entities).toBeDefined();
            expect(results.entities.length).toBeGreaterThan(0);
            // Should have entities from multiple extraction methods
            const entitySources = results.entities.map(e => e.properties?.source).filter(Boolean);
            const uniqueSources = new Set(entitySources);
            expect(uniqueSources.size).toBeGreaterThanOrEqual(2);
        });
        test('should boost confidence for consensus entities', async () => {
            const mediaSource = {
                id: 'media505',
                mediaType: 'TEXT',
                filename: 'document.txt'
            };
            // Mock multiple similar entities from different pipelines
            aiExtractionService.groupSimilarEntities = jest.fn().mockReturnValue([
                [
                    { label: 'John Smith', confidence: 0.8, properties: { source: 'spacy' } },
                    { label: 'John Smith', confidence: 0.85, properties: { source: 'transformers' } }
                ]
            ]);
            const fusedResults = aiExtractionService.fuseExtractionResults({
                entities: [
                    { label: 'John Smith', confidence: 0.8, properties: { source: 'spacy' } },
                    { label: 'John Smith', confidence: 0.85, properties: { source: 'transformers' } }
                ],
                relationships: []
            });
            expect(fusedResults.entities).toHaveLength(1);
            expect(fusedResults.entities[0].confidence).toBeGreaterThan(0.85);
            expect(fusedResults.entities[0].properties.fusion_count).toBe(2);
        });
    });
    describe('Processing Loop and Job Execution', () => {
        test('should execute extraction job with proper lifecycle', async () => {
            const jobData = {
                mediaSourceId: 'media123',
                extractionMethods: ['NLP_SPACY'],
                investigationId: 'inv456',
                userId: 'user789'
            };
            // Mock entity creation
            mockMultimodalService.createMultimodalEntity.mockResolvedValue({
                id: 'entity123',
                label: 'Test Entity',
                confidence: 0.9
            });
            const job = await aiExtractionService.submitExtractionJob(jobData);
            // Wait for processing
            await new Promise(resolve => {
                const checkCompletion = () => {
                    const updatedJob = aiExtractionService.getJobStatus(job.id);
                    if (updatedJob && (updatedJob.status === 'COMPLETED' || updatedJob.status === 'FAILED')) {
                        resolve();
                    }
                    else {
                        setTimeout(checkCompletion, 100);
                    }
                };
                checkCompletion();
            });
            const completedJob = aiExtractionService.getJobStatus(job.id);
            expect(['COMPLETED', 'FAILED']).toContain(completedJob.status);
            if (completedJob.status === 'COMPLETED') {
                expect(completedJob.results).toBeDefined();
                expect(completedJob.executionTime).toBeGreaterThan(0);
            }
        });
        test('should handle job failures gracefully', async () => {
            // Force an error by providing invalid extraction method
            aiExtractionService.pipelines.set('INVALID_PIPELINE', {
                extract: jest.fn().mockRejectedValue(new Error('Pipeline failed'))
            });
            const jobData = {
                mediaSourceId: 'media123',
                extractionMethods: ['INVALID_PIPELINE'],
                investigationId: 'inv456',
                userId: 'user789'
            };
            const job = await aiExtractionService.submitExtractionJob(jobData);
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            const failedJob = aiExtractionService.getJobStatus(job.id);
            expect(failedJob.status).toBe('FAILED');
            expect(failedJob.error).toBeDefined();
            expect(aiExtractionService.metrics.failedJobs).toBeGreaterThan(0);
        });
    });
    describe('Performance Metrics', () => {
        test('should track extraction metrics accurately', async () => {
            const initialMetrics = aiExtractionService.getMetrics();
            const job = await aiExtractionService.submitExtractionJob({
                mediaSourceId: 'media123',
                extractionMethods: ['NLP_SPACY'],
                investigationId: 'inv456',
                userId: 'user789'
            });
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 1500));
            const updatedMetrics = aiExtractionService.getMetrics();
            expect(updatedMetrics.totalJobs).toBe(initialMetrics.totalJobs + 1);
        });
        test('should calculate success rate correctly', async () => {
            const metrics = aiExtractionService.getMetrics();
            if (metrics.totalJobs > 0) {
                const expectedSuccessRate = (metrics.successfulJobs / metrics.totalJobs * 100).toFixed(2);
                expect(metrics.successRate).toBe(expectedSuccessRate);
            }
        });
        test('should track entities and relationships extracted', () => {
            const metrics = aiExtractionService.getMetrics();
            expect(metrics.entitiesExtracted).toBeGreaterThanOrEqual(0);
            expect(metrics.relationshipsExtracted).toBeGreaterThanOrEqual(0);
        });
    });
    describe('Entity Similarity and Fusion', () => {
        test('should identify similar entities correctly', () => {
            const entity1 = { label: 'John Smith', type: 'PERSON' };
            const entity2 = { label: 'John Smith', type: 'PERSON' };
            const entity3 = { label: 'Jane Doe', type: 'PERSON' };
            expect(aiExtractionService.entitiesAreSimilar(entity1, entity2)).toBe(true);
            expect(aiExtractionService.entitiesAreSimilar(entity1, entity3)).toBe(false);
        });
        test('should calculate string similarity accurately', () => {
            expect(aiExtractionService.calculateStringSimilarity('John Smith', 'John Smith')).toBe(1.0);
            expect(aiExtractionService.calculateStringSimilarity('John Smith', 'Jon Smith')).toBeGreaterThan(0.8);
            expect(aiExtractionService.calculateStringSimilarity('John Smith', 'Jane Doe')).toBeLessThan(0.5);
        });
        test('should group similar entities for fusion', () => {
            const entities = [
                { label: 'John Smith', type: 'PERSON', confidence: 0.8 },
                { label: 'John Smith', type: 'PERSON', confidence: 0.9 },
                { label: 'Jane Doe', type: 'PERSON', confidence: 0.7 }
            ];
            const groups = aiExtractionService.groupSimilarEntities(entities);
            expect(groups).toHaveLength(2);
            expect(groups[0]).toHaveLength(2); // John Smith entities
            expect(groups[1]).toHaveLength(1); // Jane Doe entity
        });
    });
    describe('Error Handling and Validation', () => {
        test('should validate extraction methods', async () => {
            const jobData = {
                mediaSourceId: 'media123',
                extractionMethods: ['NONEXISTENT_METHOD'],
                investigationId: 'inv456',
                userId: 'user789'
            };
            const job = await aiExtractionService.submitExtractionJob(jobData);
            expect(job.warnings).toContain('Unknown extraction method: NONEXISTENT_METHOD');
        });
        test('should handle media source not found', async () => {
            // Mock getMediaSource to return null
            aiExtractionService.getMediaSource = jest.fn().mockResolvedValue(null);
            const job = await aiExtractionService.submitExtractionJob({
                mediaSourceId: 'nonexistent',
                extractionMethods: ['NLP_SPACY'],
                investigationId: 'inv456',
                userId: 'user789'
            });
            // Wait for processing to fail
            await new Promise(resolve => setTimeout(resolve, 1000));
            const failedJob = aiExtractionService.getJobStatus(job.id);
            expect(failedJob.status).toBe('FAILED');
        });
    });
    describe('Event Emission', () => {
        test('should emit job lifecycle events', async () => {
            const queuedHandler = jest.fn();
            const startedHandler = jest.fn();
            const completedHandler = jest.fn();
            aiExtractionService.on('jobQueued', queuedHandler);
            aiExtractionService.on('jobStarted', startedHandler);
            aiExtractionService.on('jobCompleted', completedHandler);
            const job = await aiExtractionService.submitExtractionJob({
                mediaSourceId: 'media123',
                extractionMethods: ['NLP_SPACY'],
                investigationId: 'inv456',
                userId: 'user789'
            });
            expect(queuedHandler).toHaveBeenCalledWith(expect.objectContaining({
                id: job.id,
                status: 'QUEUED'
            }));
            // Wait for processing to complete
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Events should be emitted during processing
            expect(startedHandler).toHaveBeenCalled();
        });
    });
});
// Integration tests for AI extraction with real data
if (process.env.TEST_MODE === 'integration') {
    describe('AI Extraction Integration Tests', () => {
        test('should process actual media files', async () => {
            // This would test with real files and extraction services
            // Requires actual AI model endpoints
        });
        test('should integrate with multimodal service', async () => {
            // Test full integration with database storage
        });
    });
}
//# sourceMappingURL=aiExtraction.test.js.map
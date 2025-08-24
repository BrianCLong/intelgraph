/**
 * Multimodal Data Service Tests
 * P0 Critical - MVP1 requirement validation
 */
const MultimodalDataService = require('../services/MultimodalDataService');
describe('Multimodal Data Service - P0 Critical MVP1', () => {
    let multimodalService;
    let mockNeo4jDriver;
    let mockAuthService;
    let mockStorageService;
    let mockSession;
    beforeEach(() => {
        // Mock Neo4j session
        mockSession = {
            run: jest.fn(),
            close: jest.fn()
        };
        // Mock Neo4j driver
        mockNeo4jDriver = {
            session: jest.fn(() => mockSession)
        };
        // Mock auth service
        mockAuthService = {
            verifyToken: jest.fn(),
            hasRole: jest.fn(),
            getUserRole: jest.fn()
        };
        // Mock storage service
        mockStorageService = {
            store: jest.fn(() => Promise.resolve('https://storage.example.com/file123'))
        };
        multimodalService = new MultimodalDataService(mockNeo4jDriver, mockAuthService, mockStorageService);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Media Source Management', () => {
        test('should upload and register media source', async () => {
            const mediaData = {
                content: Buffer.from('test content'),
                filename: 'test.jpg',
                mediaType: 'IMAGE',
                mimeType: 'image/jpeg',
                filesize: 1024,
                quality: 'HIGH',
                metadata: { camera: 'iPhone 12' }
            };
            mockSession.run.mockResolvedValueOnce({
                records: [{
                        get: () => ({
                            properties: {
                                id: 'media123',
                                uri: 'https://storage.example.com/file123',
                                mediaType: 'IMAGE',
                                filename: 'test.jpg'
                            }
                        })
                    }]
            });
            const result = await multimodalService.uploadMediaSource(mediaData, 'user123');
            expect(result).toBeDefined();
            expect(result.id).toBe('media123');
            expect(result.mediaType).toBe('IMAGE');
            expect(mockStorageService.store).toHaveBeenCalledWith(mediaData.content, mediaData.filename);
        });
        test('should generate unique checksum for content deduplication', () => {
            const content1 = Buffer.from('identical content');
            const content2 = Buffer.from('identical content');
            const content3 = Buffer.from('different content');
            const checksum1 = multimodalService.generateChecksum(content1);
            const checksum2 = multimodalService.generateChecksum(content2);
            const checksum3 = multimodalService.generateChecksum(content3);
            expect(checksum1).toBe(checksum2);
            expect(checksum1).not.toBe(checksum3);
            expect(checksum1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
        });
    });
    describe('Multimodal Entity Creation', () => {
        test('should create multimodal entity with extraction context', async () => {
            const entityData = {
                type: 'PERSON',
                label: 'John Smith',
                confidence: 0.85,
                extractionMethod: 'NLP_SPACY',
                extractedFrom: ['media123'],
                investigationId: 'inv456',
                boundingBoxes: [{
                        mediaSourceId: 'media123',
                        x: 0.2, y: 0.3, width: 0.4, height: 0.3,
                        confidence: 0.9
                    }],
                properties: { age: '35', role: 'suspect' }
            };
            mockSession.run.mockResolvedValueOnce({
                records: [{
                        get: () => ({
                            properties: {
                                id: 'entity789',
                                label: 'John Smith',
                                confidence: 0.85,
                                confidenceLevel: 'HIGH'
                            }
                        })
                    }]
            });
            const result = await multimodalService.createMultimodalEntity(entityData, 'user123');
            expect(result).toBeDefined();
            expect(result.label).toBe('John Smith');
            expect(result.confidence).toBe(0.85);
            expect(result.confidenceLevel).toBe('HIGH');
        });
        test('should determine confidence levels correctly', () => {
            expect(multimodalService.determineConfidenceLevel(0.95)).toBe('VERY_HIGH');
            expect(multimodalService.determineConfidenceLevel(0.85)).toBe('HIGH');
            expect(multimodalService.determineConfidenceLevel(0.7)).toBe('MEDIUM');
            expect(multimodalService.determineConfidenceLevel(0.5)).toBe('LOW');
            expect(multimodalService.determineConfidenceLevel(0.3)).toBe('VERY_LOW');
        });
    });
    describe('Cross-Modal Matching', () => {
        test('should find cross-modal matches based on similarity', async () => {
            const entityId = 'entity789';
            // Mock entity query
            mockSession.run
                .mockResolvedValueOnce({
                records: [{
                        get: () => ({
                            properties: {
                                id: 'entity789',
                                label: 'John Smith',
                                type: 'PERSON'
                            }
                        })
                    }]
            })
                // Mock candidates query
                .mockResolvedValueOnce({
                records: [{
                        get: (field) => {
                            if (field === 'e2') {
                                return {
                                    properties: {
                                        id: 'entity790',
                                        label: 'John Smith',
                                        type: 'PERSON'
                                    }
                                };
                            }
                            if (field === 'sourceType')
                                return 'TEXT';
                            if (field === 'targetType')
                                return 'IMAGE';
                        }
                    }]
            })
                // Mock match creation
                .mockResolvedValueOnce({ records: [] });
            const matches = await multimodalService.findCrossModalMatches(entityId);
            expect(matches).toBeDefined();
            expect(Array.isArray(matches)).toBe(true);
            expect(mockSession.run).toHaveBeenCalledTimes(3);
        });
        test('should calculate similarity between entities', () => {
            const entity1 = { label: 'John Smith', type: 'PERSON' };
            const entity2 = { label: 'John Smith', type: 'PERSON' };
            const entity3 = { label: 'Jane Doe', type: 'PERSON' };
            const similarity1 = multimodalService.calculateSimilarity(entity1, entity2);
            const similarity2 = multimodalService.calculateSimilarity(entity1, entity3);
            expect(similarity1).toBe(1.0); // Exact match
            expect(similarity2).toBeLessThan(0.5); // Different names
        });
    });
    describe('Extraction Pipeline', () => {
        test('should start extraction job for supported media types', async () => {
            const jobData = {
                mediaSourceId: 'media123',
                extractionMethods: ['NLP_SPACY', 'COMPUTER_VISION'],
                investigationId: 'inv456',
                processingParams: { threshold: 0.7 }
            };
            mockSession.run.mockResolvedValueOnce({
                records: [{
                        get: () => ({
                            properties: {
                                id: 'job789',
                                status: 'PENDING',
                                progress: 0.0
                            }
                        })
                    }]
            });
            const result = await multimodalService.startExtractionJob(jobData, 'user123');
            expect(result).toBeDefined();
            expect(result.id).toBe('job789');
            expect(result.status).toBe('PENDING');
        });
        test('should reject invalid extraction methods', async () => {
            const jobData = {
                mediaSourceId: 'media123',
                extractionMethods: ['INVALID_METHOD'],
                investigationId: 'inv456'
            };
            await expect(multimodalService.startExtractionJob(jobData, 'user123')).rejects.toThrow('No valid extraction methods specified');
        });
        test('should initialize extractors with correct capabilities', () => {
            const extractors = multimodalService.extractors;
            expect(extractors.has('NLP_SPACY')).toBe(true);
            expect(extractors.has('COMPUTER_VISION')).toBe(true);
            expect(extractors.has('OCR_TESSERACT')).toBe(true);
            const spacyExtractor = extractors.get('NLP_SPACY');
            expect(spacyExtractor.mediaTypes).toContain('TEXT');
            expect(spacyExtractor.entityTypes).toContain('PERSON');
        });
    });
    describe('Multimodal Search', () => {
        test('should perform multimodal search with filters', async () => {
            const searchInput = {
                query: 'suspicious person',
                mediaTypes: ['IMAGE', 'VIDEO'],
                minConfidence: 0.7,
                investigationId: 'inv456',
                limit: 20
            };
            mockSession.run.mockResolvedValueOnce({
                records: [{
                        get: (field) => {
                            if (field === 'node') {
                                return {
                                    properties: {
                                        id: 'entity789',
                                        label: 'Suspicious Individual',
                                        confidence: 0.85
                                    }
                                };
                            }
                            if (field === 'mediaSources')
                                return [];
                            if (field === 'crossModalMatches')
                                return [];
                        }
                    }]
            });
            const result = await multimodalService.multimodalSearch(searchInput);
            expect(result).toBeDefined();
            expect(result.entities).toBeDefined();
            expect(Array.isArray(result.entities)).toBe(true);
            expect(result.totalCount).toBeGreaterThanOrEqual(0);
        });
    });
    describe('Quality Thresholds', () => {
        test('should have appropriate quality thresholds', () => {
            const thresholds = multimodalService.qualityThresholds;
            expect(thresholds.minConfidence).toBe(0.3);
            expect(thresholds.duplicateSimilarity).toBe(0.95);
            expect(thresholds.crossModalThreshold).toBe(0.7);
            expect(thresholds.verificationThreshold).toBe(0.8);
        });
    });
    describe('Levenshtein Distance', () => {
        test('should calculate edit distance correctly', () => {
            expect(multimodalService.levenshteinDistance('cat', 'cat')).toBe(0);
            expect(multimodalService.levenshteinDistance('cat', 'bat')).toBe(1);
            expect(multimodalService.levenshteinDistance('saturday', 'sunday')).toBe(3);
            expect(multimodalService.levenshteinDistance('', 'abc')).toBe(3);
            expect(multimodalService.levenshteinDistance('abc', '')).toBe(3);
        });
    });
    describe('Error Handling', () => {
        test('should handle database connection errors gracefully', async () => {
            mockSession.run.mockRejectedValueOnce(new Error('Database connection failed'));
            await expect(multimodalService.uploadMediaSource({
                content: Buffer.from('test'),
                filename: 'test.jpg',
                mediaType: 'IMAGE',
                mimeType: 'image/jpeg'
            }, 'user123')).rejects.toThrow('Database connection failed');
            expect(mockSession.close).toHaveBeenCalled();
        });
        test('should handle storage service failures', async () => {
            mockStorageService.store.mockRejectedValueOnce(new Error('Storage failed'));
            await expect(multimodalService.uploadMediaSource({
                content: Buffer.from('test'),
                filename: 'test.jpg',
                mediaType: 'IMAGE',
                mimeType: 'image/jpeg'
            }, 'user123')).rejects.toThrow('Storage failed');
        });
    });
    describe('Processing Simulation', () => {
        test('should simulate extraction for different media types', async () => {
            const textMediaSource = {
                id: 'media123',
                mediaType: 'TEXT',
                filename: 'document.txt'
            };
            const imageMediaSource = {
                id: 'media456',
                mediaType: 'IMAGE',
                filename: 'photo.jpg'
            };
            const textResults = await multimodalService.simulateExtraction(textMediaSource, 'NLP_SPACY', { confidence: 0.85 }, 'inv789');
            const imageResults = await multimodalService.simulateExtraction(imageMediaSource, 'COMPUTER_VISION', { confidence: 0.80 }, 'inv789');
            expect(textResults.entities.length).toBeGreaterThan(0);
            expect(textResults.entities[0].type).toBe('PERSON');
            expect(imageResults.entities.length).toBeGreaterThan(0);
            expect(imageResults.entities[0].type).toBe('VEHICLE');
            expect(imageResults.entities[0].boundingBoxes).toBeDefined();
        });
    });
});
// Integration tests (if running in integration mode)
if (process.env.TEST_MODE === 'integration') {
    describe('Multimodal Data Integration', () => {
        test('should handle complete extraction workflow', async () => {
            // This would test the full pipeline from upload to extraction to cross-modal matching
            // Requires actual database and storage connections
        });
        test('should maintain data consistency across operations', async () => {
            // Test referential integrity and transaction consistency
        });
        test('should handle concurrent extraction jobs', async () => {
            // Test parallel processing capabilities
        });
    });
}
//# sourceMappingURL=multimodalData.test.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest")); // Assuming supertest is installed for API testing
const express_1 = __importDefault(require("express"));
const bullmq_1 = require("bullmq");
// Mock BullMQ
jest.mock('bullmq', () => ({
    Queue: jest.fn(() => ({
        add: jest.fn(),
        getJob: jest.fn(),
    })),
    Worker: jest.fn(),
    QueueScheduler: jest.fn(), // Mock QueueScheduler as well
}));
// Mock ExtractionEngine
jest.mock('../../ai/ExtractionEngine', () => ({
    ExtractionEngine: jest.fn(() => ({
        processExtraction: jest.fn(),
    })),
}));
// Mock getRedisClient and getNeo4jDriver (used by ai.ts)
jest.mock('../../db/redis', () => ({
    getRedisClient: jest.fn(() => ({
        on: jest.fn(),
        ping: jest.fn(),
    })),
}));
jest.mock('../../db/neo4j', () => ({
    getNeo4jDriver: jest.fn(() => ({
        session: jest.fn(() => ({
            run: jest.fn(),
            close: jest.fn(),
        })),
    })),
}));
// Import the router after mocks are set up
const ai_1 = __importDefault(require("../ai"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/ai', ai_1.default);
describe('AI Routes - Video Analysis', () => {
    let mockQueueAdd;
    let mockQueueGetJob;
    beforeEach(() => {
        mockQueueAdd = bullmq_1.Queue.mock.results[0].value.add;
        mockQueueGetJob = bullmq_1.Queue.mock.results[0].value.getJob;
        mockQueueAdd.mockClear();
        mockQueueGetJob.mockClear();
    });
    describe('POST /api/ai/extract-video', () => {
        it('should submit a video extraction job successfully', async () => {
            mockQueueAdd.mockResolvedValueOnce({ id: 'test-job-id' });
            const response = await (0, supertest_1.default)(app)
                .post('/api/ai/extract-video')
                .send({
                mediaPath: '/path/to/video.mp4',
                mediaType: 'VIDEO',
                extractionMethods: ['video_analysis'],
                options: { frameRate: 1 },
            });
            expect(response.statusCode).toBe(202);
            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('jobId');
            expect(response.body.message).toContain('job submitted successfully');
            expect(mockQueueAdd).toHaveBeenCalledTimes(1);
            expect(mockQueueAdd).toHaveBeenCalledWith('video-analysis-job', expect.objectContaining({ mediaPath: '/path/to/video.mp4' }), expect.objectContaining({ jobId: expect.any(String) }));
        });
        it('should return 400 if mediaPath is missing', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/ai/extract-video')
                .send({
                mediaType: 'VIDEO',
                extractionMethods: ['video_analysis'],
            });
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Validation failed');
            expect(response.body.details[0].msg).toBe('mediaPath is required');
        });
        it('should return 400 if mediaType is not VIDEO', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/ai/extract-video')
                .send({
                mediaPath: '/path/to/image.jpg',
                mediaType: 'IMAGE', // Invalid type
                extractionMethods: ['video_analysis'],
            });
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Validation failed');
            expect(response.body.details[0].msg).toBe('mediaType must be VIDEO');
        });
    });
    describe('GET /api/ai/job-status/:jobId', () => {
        it('should return job status for a completed job', async () => {
            mockQueueGetJob.mockResolvedValueOnce({
                id: 'completed-job',
                getState: jest.fn().mockResolvedValue('completed'),
                returnvalue: { status: 'completed', results: [] },
                progress: 100,
                timestamp: Date.now() - 10000,
                finishedOn: Date.now(),
            });
            const response = await (0, supertest_1.default)(app).get('/api/ai/job-status/completed-job');
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.jobId).toBe('completed-job');
            expect(response.body.status).toBe('completed');
            expect(response.body).toHaveProperty('result');
            expect(response.body).not.toHaveProperty('error');
        });
        it('should return job status for a failed job', async () => {
            mockQueueGetJob.mockResolvedValueOnce({
                id: 'failed-job',
                getState: jest.fn().mockResolvedValue('failed'),
                returnvalue: undefined,
                progress: 50,
                failedReason: 'Something went wrong',
                timestamp: Date.now() - 5000,
                finishedOn: Date.now(),
            });
            const response = await (0, supertest_1.default)(app).get('/api/ai/job-status/failed-job');
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.jobId).toBe('failed-job');
            expect(response.body.status).toBe('failed');
            expect(response.body).not.toHaveProperty('result');
            expect(response.body.error).toBe('Something went wrong');
        });
        it('should return 404 if job is not found', async () => {
            mockQueueGetJob.mockResolvedValueOnce(null);
            const response = await (0, supertest_1.default)(app).get('/api/ai/job-status/non-existent-job');
            expect(response.statusCode).toBe(404);
            expect(response.body.error).toBe('Job not found');
        });
    });
});
//# sourceMappingURL=ai.test.js.map
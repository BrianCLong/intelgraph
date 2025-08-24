"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAICaching = setupAICaching;
exports.cacheJobResult = cacheJobResult;
exports.getCachedJobResult = getCachedJobResult;
exports.cacheGraphSnapshot = cacheGraphSnapshot;
exports.getCachedGraphSnapshot = getCachedGraphSnapshot;
exports.cachePrediction = cachePrediction;
exports.getCachedPrediction = getCachedPrediction;
exports.checkRateLimit = checkRateLimit;
exports.queueMLTask = queueMLTask;
exports.dequeueMLTask = dequeueMLTask;
let redisClient = null;
function setupAICaching(redis) {
    redisClient = redis;
    console.log('AI caching layer initialized');
}
// Cache ML job results for quick retrieval
async function cacheJobResult(jobId, result, ttlSeconds = 3600) {
    if (!redisClient)
        return;
    try {
        const key = `ai:job:${jobId}`;
        await redisClient.setex(key, ttlSeconds, JSON.stringify(result));
    }
    catch (error) {
        console.error('Failed to cache job result:', error);
    }
}
async function getCachedJobResult(jobId) {
    if (!redisClient)
        return null;
    try {
        const key = `ai:job:${jobId}`;
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    catch (error) {
        console.error('Failed to get cached job result:', error);
        return null;
    }
}
// Cache graph snapshots for ML processing
async function cacheGraphSnapshot(snapshotId, edges, ttlSeconds = 1800) {
    if (!redisClient)
        return;
    try {
        const key = `ai:graph:${snapshotId}`;
        await redisClient.setex(key, ttlSeconds, JSON.stringify(edges));
    }
    catch (error) {
        console.error('Failed to cache graph snapshot:', error);
    }
}
async function getCachedGraphSnapshot(snapshotId) {
    if (!redisClient)
        return null;
    try {
        const key = `ai:graph:${snapshotId}`;
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    catch (error) {
        console.error('Failed to get cached graph snapshot:', error);
        return null;
    }
}
// Cache ML model predictions
async function cachePrediction(predictionKey, prediction, ttlSeconds = 7200) {
    if (!redisClient)
        return;
    try {
        const key = `ai:prediction:${predictionKey}`;
        await redisClient.setex(key, ttlSeconds, JSON.stringify(prediction));
    }
    catch (error) {
        console.error('Failed to cache prediction:', error);
    }
}
async function getCachedPrediction(predictionKey) {
    if (!redisClient)
        return null;
    try {
        const key = `ai:prediction:${predictionKey}`;
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    catch (error) {
        console.error('Failed to get cached prediction:', error);
        return null;
    }
}
// Rate limiting for ML endpoints
async function checkRateLimit(userId, endpoint, maxRequests = 100, windowSeconds = 3600) {
    if (!redisClient)
        return true; // Allow if no Redis
    try {
        const key = `ai:rate:${userId}:${endpoint}`;
        const current = await redisClient.incr(key);
        if (current === 1) {
            await redisClient.expire(key, windowSeconds);
        }
        return current <= maxRequests;
    }
    catch (error) {
        console.error('Failed to check rate limit:', error);
        return true; // Allow on error
    }
}
// Queue management for ML tasks
async function queueMLTask(taskId, taskData) {
    if (!redisClient)
        return;
    try {
        const queueKey = 'ai:queue:ml_tasks';
        const taskKey = `ai:task:${taskId}`;
        await redisClient.lpush(queueKey, taskId);
        await redisClient.setex(taskKey, 3600, JSON.stringify(taskData));
    }
    catch (error) {
        console.error('Failed to queue ML task:', error);
    }
}
async function dequeueMLTask() {
    if (!redisClient)
        return null;
    try {
        const queueKey = 'ai:queue:ml_tasks';
        const taskId = await redisClient.rpop(queueKey);
        if (!taskId)
            return null;
        const taskKey = `ai:task:${taskId}`;
        const taskData = await redisClient.get(taskKey);
        await redisClient.del(taskKey);
        return {
            taskId,
            taskData: taskData ? JSON.parse(taskData) : null
        };
    }
    catch (error) {
        console.error('Failed to dequeue ML task:', error);
        return null;
    }
}
//# sourceMappingURL=caching.js.map
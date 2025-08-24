/**
 * Enhanced Copilot Orchestrator with Postgres Persistence and Resume
 *
 * Features:
 * - Durable state persistence
 * - Resume capability for failed/paused runs
 * - Redis Streams for event distribution
 * - Idempotent task execution
 * - Proper error handling and retries
 */
const { v4: uuid } = require('uuid');
const CopilotPostgresStore = require('./store.postgres');
const { generatePlanForGoal } = require('./plan');
class CopilotOrchestrator {
    constructor(pgClient, redisClient) {
        this.store = new CopilotPostgresStore(pgClient);
        this.redis = redisClient;
        this.io = null;
        this.activeRuns = new Map(); // Track currently executing runs
    }
    setIO(socketIO) {
        this.io = socketIO;
    }
    /**
     * Start a new Copilot run or resume an existing one
     */
    async startRun(goalId, goalText, options = {}) {
        const { resume = false, investigationId = null } = options;
        let run;
        if (resume) {
            // Try to find an existing resumable run
            const resumableRuns = await this.store.findResumableRuns(investigationId);
            run = resumableRuns.find(r => r.goalText === goalText);
            if (run) {
                await this.emit(run.id, null, 'info', 'Resuming existing run');
                return this.resumeRun(run);
            }
        }
        // Create new run
        const runId = uuid();
        const plan = generatePlanForGoal(goalId, goalText);
        run = {
            id: runId,
            goalId,
            goalText,
            investigationId,
            status: 'pending',
            plan,
            metadata: {
                createdBy: options.userId || 'system',
                version: '1.0'
            },
            createdAt: new Date().toISOString()
        };
        await this.store.saveRun(run);
        // Save tasks for the plan
        for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            await this.store.saveTask({
                id: step.id,
                runId: run.id,
                sequenceNumber: i,
                taskType: step.kind,
                inputParams: step.input,
                status: 'pending'
            });
        }
        // Start execution asynchronously
        setImmediate(() => this.executeRun(run.id));
        return run;
    }
    /**
     * Resume an existing run from where it left off
     */
    async resumeRun(run) {
        if (this.activeRuns.has(run.id)) {
            throw new Error(`Run ${run.id} is already active`);
        }
        // Update status to running
        run.status = 'running';
        run.startedAt = new Date().toISOString();
        await this.store.updateRun(run);
        // Start execution from failed/pending tasks
        setImmediate(() => this.executeRun(run.id));
        return run;
    }
    /**
     * Execute a run with proper error handling and resume support
     */
    async executeRun(runId) {
        if (this.activeRuns.has(runId)) {
            return; // Already executing
        }
        this.activeRuns.set(runId, true);
        try {
            const run = await this.store.getRun(runId);
            if (!run) {
                throw new Error(`Run ${runId} not found`);
            }
            // Update run status
            run.status = 'running';
            run.startedAt = run.startedAt || new Date().toISOString();
            await this.store.updateRun(run);
            await this.emit(runId, null, 'info', 'Run started');
            // Get tasks for this run
            const tasks = await this.store.getTasksForRun(runId);
            // Execute tasks sequentially
            for (const task of tasks) {
                // Skip already completed tasks (for resume)
                if (task.status === 'succeeded') {
                    await this.emit(runId, task.id, 'info', `Task ${task.taskType} already completed`, task.output);
                    continue;
                }
                // Execute the task
                await this.executeTask(runId, task);
                // Check if task failed
                if (task.status === 'failed') {
                    run.status = 'failed';
                    run.finishedAt = new Date().toISOString();
                    await this.store.updateRun(run);
                    await this.emit(runId, null, 'error', `Run failed at task ${task.taskType}: ${task.error}`);
                    return;
                }
            }
            // All tasks succeeded
            run.status = 'succeeded';
            run.finishedAt = new Date().toISOString();
            await this.store.updateRun(run);
            await this.emit(runId, null, 'info', 'Run completed successfully');
        }
        catch (error) {
            const run = await this.store.getRun(runId);
            if (run) {
                run.status = 'failed';
                run.finishedAt = new Date().toISOString();
                await this.store.updateRun(run);
            }
            await this.emit(runId, null, 'error', `Run execution failed: ${error.message}`);
        }
        finally {
            this.activeRuns.delete(runId);
        }
    }
    /**
     * Execute a single task with retry logic
     */
    async executeTask(runId, task, retryCount = 0) {
        const maxRetries = 3;
        const now = () => new Date().toISOString();
        try {
            // Update task status to running
            task.status = 'running';
            task.startedAt = now();
            await this.store.updateTask(task);
            await this.emit(runId, task.id, 'progress', `Starting ${task.taskType}`, task.inputParams);
            // Execute the actual task
            const output = await this.executeTaskLogic(task);
            // Task succeeded
            task.outputData = output;
            task.status = 'succeeded';
            task.finishedAt = now();
            await this.store.updateTask(task);
            await this.emit(runId, task.id, 'info', `${task.taskType} completed`, output);
        }
        catch (error) {
            // Task failed - check if we should retry
            if (retryCount < maxRetries && this.isRetryableError(error)) {
                await this.emit(runId, task.id, 'warning', `${task.taskType} failed, retrying (${retryCount + 1}/${maxRetries}): ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
                return this.executeTask(runId, task, retryCount + 1);
            }
            // Task failed permanently
            task.status = 'failed';
            task.errorMessage = error.message;
            task.finishedAt = now();
            await this.store.updateTask(task);
            await this.emit(runId, task.id, 'error', `${task.taskType} failed: ${error.message}`);
        }
    }
    /**
     * Execute the actual task logic (placeholder for real implementations)
     */
    async executeTaskLogic(task) {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
        switch (task.taskType) {
            case 'NEO4J_QUERY':
                // TODO: Call actual Neo4j service
                return { rows: Math.floor(Math.random() * 100), query: task.inputParams };
            case 'GRAPH_ANALYTICS':
                // TODO: Call actual graph analytics service
                return {
                    algorithm: task.inputParams,
                    nodesProcessed: Math.floor(Math.random() * 1000),
                    completed: true
                };
            case 'SUMMARIZE':
                // TODO: Call actual summarization service
                return {
                    summary: `Analysis complete: ${Math.floor(Math.random() * 10)} key findings identified`,
                    confidence: Math.random()
                };
            case 'ENRICH_DATA':
                // TODO: Call actual enrichment service
                return {
                    enrichedEntities: Math.floor(Math.random() * 50),
                    sourcesUsed: ['OSINT', 'Public Records', 'Social Media']
                };
            default:
                throw new Error(`Unknown task type: ${task.taskType}`);
        }
    }
    /**
     * Determine if an error is retryable
     */
    isRetryableError(error) {
        const retryableErrors = [
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            'Service temporarily unavailable',
            'Rate limit exceeded'
        ];
        return retryableErrors.some(retryable => error.message.includes(retryable) || error.code === retryable);
    }
    /**
     * Emit event to both Socket.IO and Redis Streams
     */
    async emit(runId, taskId, level, message, payload = null) {
        const event = {
            runId,
            taskId,
            level,
            message,
            payload,
            ts: new Date().toISOString()
        };
        // Store in database
        await this.store.pushEvent(runId, event);
        // Emit via Socket.IO
        if (this.io) {
            this.io.to(`copilot:run:${runId}`).emit('copilot:event', event);
        }
        // Send to Redis Streams for other consumers
        if (this.redis) {
            try {
                await this.redis.xadd(`copilot:run:${runId}`, '*', 'event', JSON.stringify(event));
            }
            catch (error) {
                console.error('Failed to publish to Redis Stream:', error);
            }
        }
    }
    /**
     * Get run information with tasks and recent events
     */
    async getRunInfo(runId, options = {}) {
        const run = await this.store.getRun(runId);
        if (!run)
            return null;
        const tasks = await this.store.getTasksForRun(runId);
        const events = await this.store.listEvents(runId, {
            limit: options.eventLimit || 100
        });
        return {
            ...run,
            tasks,
            events,
            isActive: this.activeRuns.has(runId)
        };
    }
    /**
     * Pause a running execution
     */
    async pauseRun(runId) {
        const run = await this.store.getRun(runId);
        if (!run) {
            throw new Error(`Run ${runId} not found`);
        }
        if (run.status !== 'running') {
            throw new Error(`Cannot pause run in status: ${run.status}`);
        }
        run.status = 'paused';
        await this.store.updateRun(run);
        this.activeRuns.delete(runId);
        await this.emit(runId, null, 'info', 'Run paused');
        return run;
    }
    /**
     * Get statistics for monitoring
     */
    async getStats(timeRange = '24 hours') {
        return this.store.getRunStats(timeRange);
    }
}
module.exports = CopilotOrchestrator;
//# sourceMappingURL=orchestrator.enhanced.js.map
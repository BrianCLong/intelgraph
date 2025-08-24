const { v4: uuid } = require('uuid');
const store = require('./store.memory');
const { generatePlanForGoal } = require('./plan');
// injected at app bootstrap
let io = null;
function setIO(socketIO) { io = socketIO; }
async function executeTask(task) {
    const now = () => new Date().toISOString();
    task.status = "RUNNING";
    task.startedAt = now();
    try {
        // VERY SIMPLE STUB EXECUTION:
        let output = null;
        if (task.kind === "NEO4J_QUERY") {
            // TODO: call existing service/repo; here we simulate
            output = { rows: 42 };
        }
        else if (task.kind === "GRAPH_ANALYTICS") {
            output = { pagerankComputed: true, count: 50 };
        }
        else if (task.kind === "SUMMARIZE") {
            output = { summary: "Top coordinators identified; see top 10 nodes." };
        }
        else {
            throw new Error(`Unknown task kind: ${task.kind}`);
        }
        task.output = JSON.stringify(output);
        task.status = "SUCCEEDED";
        task.finishedAt = now();
        return task;
    }
    catch (err) {
        task.status = "FAILED";
        task.error = err.message || String(err);
        task.finishedAt = now();
        return task;
    }
}
async function startRun(goalId, goalText) {
    const runId = uuid();
    const plan = generatePlanForGoal(goalId, goalText);
    const run = {
        id: runId, goalId, plan,
        status: "PENDING",
        createdAt: new Date().toISOString()
    };
    store.saveRun(run);
    // async execute
    setImmediate(async () => {
        run.status = "RUNNING";
        run.startedAt = new Date().toISOString();
        store.updateRun(run);
        emit(run.id, null, "INFO", "Run started");
        for (const task of run.plan.steps) {
            emit(run.id, task.id, "PROGRESS", `Starting ${task.kind}`, task.input);
            await executeTask(task);
            emit(run.id, task.id, task.status === "SUCCEEDED" ? "INFO" : "ERROR", `${task.kind} ${task.status}`, task.output || task.error);
            if (task.status === "FAILED") {
                run.status = "FAILED";
                run.finishedAt = new Date().toISOString();
                store.updateRun(run);
                emit(run.id, null, "ERROR", "Run failed");
                return;
            }
        }
        run.status = "SUCCEEDED";
        run.finishedAt = new Date().toISOString();
        store.updateRun(run);
        emit(run.id, null, "INFO", "Run succeeded");
    });
    return run;
}
function emit(runId, taskId, level, message, payload) {
    const ev = {
        runId, taskId, level, message,
        ts: new Date().toISOString(),
        payload: payload || null
    };
    store.pushEvent(runId, ev);
    if (io)
        io.to(`copilot:run:${runId}`).emit('copilot:event', ev);
}
module.exports = { startRun, setIO };
//# sourceMappingURL=orchestrator.js.map
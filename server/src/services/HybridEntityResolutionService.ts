import path from "path";
import { PythonShell } from "python-shell";
import logger from '../config/logger';
import { v4 as uuidv4 } from "uuid";

const log = logger.child({ name: "HybridEntityResolutionService" });

export interface ERServiceResult {
  version: string;
  score: number;
  match: boolean;
  explanation: Record<string, number>;
  traceId: string;
}

export async function resolveEntities(
  a: string,
  b: string,
): Promise<ERServiceResult> {
  const traceId = uuidv4();
  const script = path.join(process.cwd(), "ml", "er", "api.py");
  const result = await PythonShell.run(script, {
    args: [a, b],
    pythonOptions: ["-u"],
  });
  const parsed = JSON.parse(result[0]);
  log.info({ traceId, features: parsed.explanation }, "er_match");
  return { ...parsed, traceId } as ERServiceResult;
}

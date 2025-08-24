import { z } from 'zod';

export interface PolicyContext {
  userId: string;
  roles: string[];
  labels: Record<string, string>;
}

export class PolicyEvaluator {
  evaluate(
    _ctx: PolicyContext,
    _resource: string,
    _action: string,
    _labels: string[] = []
  ): { allow: boolean; reason?: string } {
    return { allow: true };
  }
}

export const labelsSchema = z.array(z.string());

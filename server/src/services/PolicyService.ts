import { evaluate } from './AccessControl.js';
import { writeAudit } from '../utils/audit.js';

interface PolicySpec {
  action: string;
  getResource?: (parent: any, args: any, context: any, info: any) => Promise<any> | any;
}

export class PolicyError extends Error {
  code: string;
  reason: string;
  requiredClearances: string[];
  appealPath?: string;
  constructor(opts: {
    code: string;
    reason: string;
    requiredClearances?: string[];
    appealPath?: string;
  }) {
    super(opts.reason);
    this.code = opts.code;
    this.reason = opts.reason;
    this.requiredClearances = opts.requiredClearances || [];
    this.appealPath = opts.appealPath;
  }
}

export function withPolicy<T extends (...args: any[]) => any>(resolver: T, spec: PolicySpec): T {
  return (async (parent: any, args: any, context: any, info: any) => {
    const user = context.user || {};
    const resource = spec.getResource ? await spec.getResource(parent, args, context, info) : {};
    const decision = await evaluate(spec.action, user, resource, {});
    const requestId = context?.req?.id || context.requestId;
    const traceId = context?.traceId;
    await writeAudit({
      userId: user.id,
      action: spec.action,
      resourceType: info?.fieldName,
      resourceId: resource?.id,
      details: {
        decision: decision.allow ? 'allow' : 'deny',
        reason: decision.reason,
        requestId,
        traceId,
      },
    });
    context.reasonForAccess = spec.action;
    if (!decision.allow) {
      throw new PolicyError({
        code: 'POLICY_DENIED',
        reason: `Blocked: ${decision.reason || 'unauthorized'}`,
        requiredClearances: [],
        appealPath: '/appeal',
      });
    }
    return resolver(parent, args, context, info);
  }) as T;
}

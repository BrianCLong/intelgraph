import type { PolicyLabels } from '@intelgraph/common-types';

export interface User {
  id: string;
  roles: string[];
}

export interface Resource {
  policyLabels?: PolicyLabels;
}

export interface EvaluationResult {
  allowed: boolean;
  rationale: string[];
}

export class PolicyEvaluator {
  evaluate(
    user: User,
    _resource: Resource,
    action: string,
    labels: PolicyLabels = {}
  ): EvaluationResult {
    const rationale: string[] = [];
    if (user.roles.includes('ADMIN')) {
      rationale.push('role ADMIN permits all');
      return { allowed: true, rationale };
    }
    if (labels.licenseClass === 'restricted') {
      rationale.push('licenseClass restricted');
      return { allowed: false, rationale };
    }
    rationale.push(`default allow for action ${action}`);
    return { allowed: true, rationale };
  }
}

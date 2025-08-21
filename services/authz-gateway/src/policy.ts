import axios from 'axios';

function opaUrl() {
  return process.env.OPA_URL || 'http://localhost:8181/v1/data/authz/allow';
}

export interface UserContext {
  tenantId: string;
  roles: string[];
}

export interface ResourceContext {
  tenantId: string;
  needToKnow?: string;
}

export async function authorize(
  user: UserContext,
  resource: ResourceContext,
  action: string,
): Promise<{ allowed: boolean; reason: string }> {
  try {
    const res = await axios.post(opaUrl(), {
      input: { user, resource, action },
    });
    const result = res.data?.result;
    if (typeof result === 'boolean') {
      return { allowed: result, reason: result ? 'allow' : 'deny' };
    }
    return { allowed: !!result?.allow, reason: result?.reason || 'deny' };
  } catch {
    return { allowed: false, reason: 'opa_error' };
  }
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: string[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

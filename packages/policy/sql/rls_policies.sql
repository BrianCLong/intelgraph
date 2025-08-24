-- Row-level security policies for tenant isolation
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenants
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY alerts_tenant_isolation ON alerts
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

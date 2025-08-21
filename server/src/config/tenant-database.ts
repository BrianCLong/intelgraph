import fs from 'fs';
import path from 'path';
import { PoolConfig } from 'pg';

export interface TenantDbConfig {
  postgres: PoolConfig;
  neo4j: {
    uri: string;
    username: string;
    password: string;
  };
  redisPrefix?: string;
}

interface ConfigMap {
  [tenantId: string]: TenantDbConfig;
}

const configPath = process.env.TENANT_DB_CONFIG || path.resolve(process.cwd(), 'server/tenant-databases.json');
let configs: ConfigMap = {};
let version = 0;

function loadConfigs() {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    configs = JSON.parse(raw);
    version++;
  } catch (err) {
    configs = {};
  }
}

// initial load
loadConfigs();

// hot reload on config changes
try {
  fs.watch(configPath, { persistent: false }, () => {
    loadConfigs();
  });
} catch {
  // ignore watch errors; config will not hot reload
}

export function getTenantConfig(tenantId: string): TenantDbConfig | undefined {
  return configs[tenantId];
}

export function getConfigVersion(): number {
  return version;
}

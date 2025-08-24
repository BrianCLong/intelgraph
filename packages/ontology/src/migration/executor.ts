import { MigrationPlan, Migration } from '@intelgraph/common-types'
import { addMigration } from '../registry'

export function createMigration(fromVersion: string, toVersion: string, plan: MigrationPlan): Migration {
  return addMigration({ fromVersion, toVersion, status: 'PENDING', plan })
}

export function applyMigration(m: Migration): Migration {
  m.status = 'APPLIED'
  return m
}

export function rollbackMigration(m: Migration): Migration {
  m.status = 'ROLLED_BACK'
  return m
}

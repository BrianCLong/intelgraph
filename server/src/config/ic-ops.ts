import path from 'path';

export const IC_OPS_ENABLED = process.env.ICOPS_ENABLED === 'true';
export const IC_OPS_DRY_RUN = process.env.NODE_ENV !== 'production';
export const IC_OPS_RUNBOOK_DIR =
  process.env.ICOPS_RUNBOOK_DIR ||
  path.resolve(process.cwd(), 'runbooks');

import { Router } from "express";
import { tenantEnforcer, reasonRequired } from "../middleware/governance";

export interface AuditEvent {
  id: number;
  tenant: string;
  action: string;
}

export const auditEvents: AuditEvent[] = [];
export const logAudit = (event: AuditEvent) => auditEvents.push(event);

const router = Router();

// Auth placeholder
router.post("/auth/login", (req, res) => {
  const tenant = req.headers["x-tenant-id"] as string | undefined;
  if (!tenant) {
    return res.status(400).json({ error: "tenant header required" });
  }
  res.json({ token: "stub-token", tenant });
});

// Retrieve audit events for the tenant
router.get("/audit/events", reasonRequired, tenantEnforcer, (req, res) => {
  const events = auditEvents.filter((e) => e.tenant === req.tenantId);
  res.json(events);
});

// Policy simulation: return events that would be blocked
router.post("/policy/simulate", reasonRequired, (req, res) => {
  const { blockedTenants = [] } = req.body as { blockedTenants?: string[] };
  const blocked = auditEvents.filter((e) => blockedTenants.includes(e.tenant));
  res.json({ blocked });
});

// K-anonymity/redaction helper
router.post("/export/redact", reasonRequired, tenantEnforcer, (req, res) => {
  const { data = [], k = 2 } = req.body as { data?: Array<{ value: string }>; k?: number };
  const counts: Record<string, number> = {};
  data.forEach((d) => {
    counts[d.value] = (counts[d.value] || 0) + 1;
  });
  const redacted = data.map((d) => (counts[d.value] >= k ? d.value : "REDACTED"));
  res.json({ data: redacted });
});

export default router;

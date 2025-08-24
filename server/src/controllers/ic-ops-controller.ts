import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  IC_OPS_ENABLED,
  IC_OPS_DRY_RUN,
  IC_OPS_RUNBOOK_DIR,
} from '../config/ic-ops';

interface TimelineEntry {
  timestamp: string;
  action: string;
  status: string;
}

interface Incident {
  id: string;
  sev: string;
  commander: string;
  channel: string;
  declaredAt: Date;
  timeline: TimelineEntry[];
}

interface RunbookStep {
  action: string;
  [key: string]: unknown;
}

interface Runbook {
  name?: string;
  icops?: { enabled?: boolean };
  steps?: RunbookStep[];
}

const incidents = new Map<string, Incident>();

class IcOpsController {
  private loadRunbook(id: string): Runbook | null {
    const safeId = path.basename(id);
    const runbookPath = path.join(IC_OPS_RUNBOOK_DIR, `${safeId}.yaml`);
    if (!fs.existsSync(runbookPath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(runbookPath);
      if (raw.includes(0)) {
        console.warn(`Runbook ${safeId} appears to be binary; skipping`);
        return null;
      }
      const file = raw.toString('utf8');
      const parsed = yaml.load(file) as unknown;
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !Array.isArray((parsed as Runbook).steps) ||
        !(parsed as Runbook).steps!.every(step => typeof step.action === 'string')
      ) {
        console.warn(`Runbook ${safeId} is invalid or missing steps`);
        return null;
      }
      return parsed as Runbook;
    } catch {
      return null;
    }
  }

  declareIncident(req: Request, res: Response) {
    if (!IC_OPS_ENABLED) {
      return res.status(403).json({ error: 'icops.disabled' });
    }
    const { sev, commander, channel } = req.body;
    if (!sev || !commander || !channel) {
      return res.status(400).json({ error: 'missing-fields' });
    }
    const id = uuidv4();
    const incident: Incident = {
      id,
      sev,
      commander,
      channel,
      declaredAt: new Date(),
      timeline: [],
    };
    incidents.set(id, incident);
    return res.status(201).json(incident);
  }

  executeRunbook(req: Request, res: Response) {
    if (!IC_OPS_ENABLED) {
      return res.status(403).json({ error: 'icops.disabled' });
    }
    const { incidentId } = req.body;
    const runbookId = req.params.id;
    if (!incidentId) {
      return res.status(400).json({ error: 'missing-incident' });
    }
    const incident = incidents.get(incidentId);
    if (!incident) {
      return res.status(404).json({ error: 'incident.not_found' });
    }
    const runbook = this.loadRunbook(runbookId);
    if (!runbook) {
      return res.status(404).json({ error: 'runbook.not_found' });
    }
    if (!runbook.icops?.enabled) {
      return res.status(400).json({ error: 'runbook.disabled' });
    }
    const steps = Array.isArray(runbook.steps) ? runbook.steps : [];
    const logs = steps.map((step: RunbookStep, index: number) => {
      const entry: TimelineEntry = {
        action: step.action,
        status: IC_OPS_DRY_RUN ? 'dry-run' : 'executed',
        timestamp: new Date().toISOString(),
      };
      incident.timeline.push(entry);
      return { ...entry, step: index + 1 };
    });
    return res.json({
      runbook: runbook.name || runbookId,
      mode: IC_OPS_DRY_RUN ? 'dry-run' : 'live',
      logs,
    });
  }

  generateRca(req: Request, res: Response) {
    if (!IC_OPS_ENABLED) {
      return res.status(403).json({ error: 'icops.disabled' });
    }
    const { incidentId } = req.params;
    const incident = incidents.get(incidentId);
    if (!incident) {
      return res.status(404).json({ error: 'incident.not_found' });
    }
    const resolvedAt = new Date();
    incident.timeline.push({
      timestamp: resolvedAt.toISOString(),
      action: 'RCA generated',
      status: 'info',
    });
    const mttrMs = resolvedAt.getTime() - incident.declaredAt.getTime();
    return res.json({
      incidentId,
      sev: incident.sev,
      commander: incident.commander,
      channel: incident.channel,
      timeline: incident.timeline,
      metrics: { mttrMs },
      generatedAt: resolvedAt.toISOString(),
    });
  }
}

export default new IcOpsController();

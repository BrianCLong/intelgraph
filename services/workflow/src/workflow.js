import EventEmitter from 'eventemitter3';

class WorkflowEngine extends EventEmitter {
  constructor() {
    super();
    this.definitions = new Map();
    this.cases = new Map();
    this.metrics = { slaBreaches: 0 };
  }

  define(name, definition) {
    this.definitions.set(name, definition);
  }

  start(id, definitionName) {
    const def = this.definitions.get(definitionName);
    if (!def) throw new Error('definition not found');
    const initial = def.initial;
    const caseData = {
      id,
      definition: definitionName,
      state: initial,
      assignees: def.states[initial].assignees || [],
      checklist: this._sanitizeChecklist(def.states[initial].checklist || []),
      deadline: this._calcDeadline(def.states[initial].sla)
    };
    this.cases.set(id, caseData);
    this.emit('started', { id, state: initial });
    return caseData;
  }

  transition(id, transition, reason) {
    if (!reason) throw new Error('reason required');
    const caseData = this.cases.get(id);
    if (!caseData) throw new Error('case not found');
    const def = this.definitions.get(caseData.definition);
    const stateConfig = def.states[caseData.state];
    const target = stateConfig.on?.[transition];
    if (!target) throw new Error('invalid transition');
    const guard = def.guards?.[transition];
    if (guard && !guard(caseData, reason)) {
      throw new Error('guard rejected');
    }
    caseData.state = target;
    const targetConfig = def.states[target];
    caseData.assignees = targetConfig.assignees || [];
    caseData.checklist = this._sanitizeChecklist(targetConfig.checklist || []);
    caseData.deadline = this._calcDeadline(targetConfig.sla);
    this.emit('transitioned', { id, transition, state: target, reason });
    return caseData;
  }

  getCase(id) {
    const caseData = this.cases.get(id);
    if (!caseData) throw new Error('case not found');
    const now = Date.now();
    const remaining = caseData.deadline ? caseData.deadline - now : null;
    if (remaining !== null && remaining < 0) {
      this.metrics.slaBreaches += 1;
      this.emit('sla_breached', { id });
    }
    return {
      state: caseData.state,
      assignees: caseData.assignees,
      checklist: caseData.checklist,
      slaRemaining: remaining !== null ? Math.max(0, remaining) : null
    };
  }

  _calcDeadline(slaSeconds) {
    return typeof slaSeconds === 'number' ? Date.now() + slaSeconds * 1000 : null;
  }

  _sanitizeChecklist(items) {
    return items.map((text) => ({ text: String(text).replace(/[<>]/g, ''), done: false }));
  }
}

export default WorkflowEngine;

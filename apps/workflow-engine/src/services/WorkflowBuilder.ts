import { WorkflowDefinition, WorkflowStep, WorkflowTrigger, StepConnection, ConditionExpression } from './WorkflowService';
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  definition: Omit<WorkflowDefinition, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;
  isBuiltIn: boolean;
  preview?: string;
}

export class WorkflowBuilder {
  private workflow: Partial<WorkflowDefinition>;

  constructor(name?: string) {
    this.workflow = {
      name: name || 'New Workflow',
      version: '1.0.0',
      isActive: false,
      triggers: [],
      steps: [],
      settings: {
        errorHandling: 'stop',
        logging: 'minimal',
        concurrency: 1,
        variables: {},
        notifications: {}
      }
    };
  }

  setName(name: string): WorkflowBuilder {
    this.workflow.name = name;
    return this;
  }

  setDescription(description: string): WorkflowBuilder {
    this.workflow.description = description;
    return this;
  }

  setVersion(version: string): WorkflowBuilder {
    this.workflow.version = version;
    return this;
  }

  setActive(isActive: boolean): WorkflowBuilder {
    this.workflow.isActive = isActive;
    return this;
  }

  addTrigger(trigger: Omit<WorkflowTrigger, 'id'>): WorkflowBuilder {
    if (!this.workflow.triggers) {
      this.workflow.triggers = [];
    }
    
    this.workflow.triggers.push({
      id: uuidv4(),
      ...trigger
    });
    
    return this;
  }

  addEventTrigger(eventType: string, config?: Partial<Omit<WorkflowTrigger['config'], 'eventType'>>): WorkflowBuilder {
    return this.addTrigger({
      type: 'event',
      config: {
        eventType,
        ...config
      },
      isEnabled: true
    });
  }

  addScheduleTrigger(schedule: string, config?: Partial<Omit<WorkflowTrigger['config'], 'schedule'>>): WorkflowBuilder {
    return this.addTrigger({
      type: 'schedule',
      config: {
        schedule,
        ...config
      },
      isEnabled: true
    });
  }

  addWebhookTrigger(webhookPath: string, config?: Partial<Omit<WorkflowTrigger['config'], 'webhookPath'>>): WorkflowBuilder {
    return this.addTrigger({
      type: 'webhook',
      config: {
        webhookPath,
        ...config
      },
      isEnabled: true
    });
  }

  addStep(step: Omit<WorkflowStep, 'id'>): WorkflowBuilder {
    if (!this.workflow.steps) {
      this.workflow.steps = [];
    }
    
    this.workflow.steps.push({
      id: uuidv4(),
      ...step
    });
    
    return this;
  }

  addActionStep(
    name: string,
    actionType: string,
    actionConfig: Record<string, any>,
    position?: { x: number; y: number }
  ): WorkflowBuilder {
    return this.addStep({
      name,
      type: 'action',
      config: {
        actionType,
        actionConfig
      },
      position: position || { x: 0, y: 0 },
      connections: [],
      isEnabled: true
    });
  }

  addConditionStep(
    name: string,
    condition: ConditionExpression,
    position?: { x: number; y: number }
  ): WorkflowBuilder {
    return this.addStep({
      name,
      type: 'condition',
      config: {
        condition
      },
      position: position || { x: 0, y: 0 },
      connections: [],
      isEnabled: true
    });
  }

  addDelayStep(
    name: string,
    delayMs: number,
    position?: { x: number; y: number }
  ): WorkflowBuilder {
    return this.addStep({
      name,
      type: 'delay',
      config: {
        delayMs
      },
      position: position || { x: 0, y: 0 },
      connections: [],
      isEnabled: true
    });
  }

  addHumanStep(
    name: string,
    assignees: string[],
    config?: Partial<WorkflowStep['config']>,
    position?: { x: number; y: number }
  ): WorkflowBuilder {
    return this.addStep({
      name,
      type: 'human',
      config: {
        assignees,
        ...config
      },
      position: position || { x: 0, y: 0 },
      connections: [],
      isEnabled: true
    });
  }

  addLoopStep(
    name: string,
    iterateOver: string,
    maxIterations?: number,
    position?: { x: number; y: number }
  ): WorkflowBuilder {
    return this.addStep({
      name,
      type: 'loop',
      config: {
        iterateOver,
        maxIterations
      },
      position: position || { x: 0, y: 0 },
      connections: [],
      isEnabled: true
    });
  }

  connectSteps(
    fromStepIndex: number,
    toStepIndex: number,
    condition?: StepConnection['condition'],
    customCondition?: ConditionExpression
  ): WorkflowBuilder {
    if (!this.workflow.steps || 
        fromStepIndex < 0 || 
        fromStepIndex >= this.workflow.steps.length ||
        toStepIndex < 0 || 
        toStepIndex >= this.workflow.steps.length) {
      throw new Error('Invalid step indices for connection');
    }
    
    const fromStep = this.workflow.steps[fromStepIndex];
    const toStep = this.workflow.steps[toStepIndex];
    
    fromStep.connections.push({
      targetStepId: toStep.id!,
      condition: condition || 'always',
      customCondition
    });
    
    return this;
  }

  setGlobalVariable(key: string, value: any): WorkflowBuilder {
    if (!this.workflow.settings) {
      this.workflow.settings = {
        errorHandling: 'stop',
        logging: 'minimal',
        concurrency: 1,
        variables: {},
        notifications: {}
      };
    }
    
    if (!this.workflow.settings.variables) {
      this.workflow.settings.variables = {};
    }
    
    this.workflow.settings.variables[key] = value;
    return this;
  }

  setErrorHandling(errorHandling: 'stop' | 'continue' | 'retry'): WorkflowBuilder {
    if (!this.workflow.settings) {
      this.workflow.settings = {
        errorHandling: 'stop',
        logging: 'minimal',
        concurrency: 1,
        variables: {},
        notifications: {}
      };
    }
    
    this.workflow.settings.errorHandling = errorHandling;
    return this;
  }

  setLogging(logging: 'minimal' | 'detailed' | 'debug'): WorkflowBuilder {
    if (!this.workflow.settings) {
      this.workflow.settings = {
        errorHandling: 'stop',
        logging: 'minimal',
        concurrency: 1,
        variables: {},
        notifications: {}
      };
    }
    
    this.workflow.settings.logging = logging;
    return this;
  }

  setConcurrency(concurrency: number): WorkflowBuilder {
    if (!this.workflow.settings) {
      this.workflow.settings = {
        errorHandling: 'stop',
        logging: 'minimal',
        concurrency: 1,
        variables: {},
        notifications: {}
      };
    }
    
    this.workflow.settings.concurrency = concurrency;
    return this;
  }

  setTimeout(timeout: number): WorkflowBuilder {
    if (!this.workflow.settings) {
      this.workflow.settings = {
        errorHandling: 'stop',
        logging: 'minimal',
        concurrency: 1,
        variables: {},
        notifications: {}
      };
    }
    
    this.workflow.settings.timeout = timeout;
    return this;
  }

  build(): Omit<WorkflowDefinition, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> {
    if (!this.workflow.name) {
      throw new Error('Workflow name is required');
    }
    
    if (!this.workflow.steps || this.workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }
    
    if (!this.workflow.triggers || this.workflow.triggers.length === 0) {
      throw new Error('Workflow must have at least one trigger');
    }
    
    // Validate step connections
    this.validateConnections();
    
    return {
      name: this.workflow.name!,
      description: this.workflow.description,
      version: this.workflow.version!,
      isActive: this.workflow.isActive!,
      triggers: this.workflow.triggers!,
      steps: this.workflow.steps!,
      settings: this.workflow.settings!
    };
  }

  private validateConnections(): void {
    if (!this.workflow.steps) return;
    
    const stepIds = new Set(this.workflow.steps.map(step => step.id));
    
    for (const step of this.workflow.steps) {
      for (const connection of step.connections) {
        if (!stepIds.has(connection.targetStepId)) {
          throw new Error(`Invalid connection: step ${step.name} connects to non-existent step ${connection.targetStepId}`);
        }
      }
    }
    
    // Check for circular dependencies (simplified check)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);
      
      const step = this.workflow.steps!.find(s => s.id === stepId);
      if (step) {
        for (const connection of step.connections) {
          if (!visited.has(connection.targetStepId)) {
            if (hasCycle(connection.targetStepId)) {
              return true;
            }
          } else if (recursionStack.has(connection.targetStepId)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(stepId);
      return false;
    };
    
    for (const step of this.workflow.steps) {
      if (!visited.has(step.id!) && hasCycle(step.id!)) {
        throw new Error('Workflow contains circular dependencies');
      }
    }
  }

  // Static methods for common workflow patterns
  static createDataProcessingWorkflow(name: string): WorkflowBuilder {
    return new WorkflowBuilder(name)
      .setDescription('Data processing and analysis workflow')
      .addEventTrigger('data.received')
      .addActionStep('Validate Data', 'validation', {
        schema: 'data_schema',
        strict: true
      }, { x: 100, y: 100 })
      .addConditionStep('Check Quality', {
        field: 'validation.errors',
        operator: 'eq',
        value: 0
      }, { x: 100, y: 200 })
      .addActionStep('Process Data', 'data_processing', {
        algorithm: 'ml_analysis',
        confidence_threshold: 0.8
      }, { x: 200, y: 300 })
      .addActionStep('Store Results', 'database', {
        table: 'processed_data',
        operation: 'insert'
      }, { x: 200, y: 400 })
      .connectSteps(0, 1) // Validate -> Check Quality
      .connectSteps(1, 2, 'success') // Check Quality -> Process Data (on success)
      .connectSteps(2, 3) // Process Data -> Store Results
      .setErrorHandling('retry')
      .setLogging('detailed');
  }

  static createIncidentResponseWorkflow(name: string): WorkflowBuilder {
    return new WorkflowBuilder(name)
      .setDescription('Automated incident response workflow')
      .addEventTrigger('incident.detected')
      .addActionStep('Create Ticket', 'jira', {
        project: 'INCIDENT',
        issueType: 'Incident',
        priority: 'High'
      }, { x: 100, y: 100 })
      .addActionStep('Notify Team', 'slack', {
        channel: '#incidents',
        message: 'New incident detected: {{incident.title}}'
      }, { x: 200, y: 100 })
      .addHumanStep('Assess Severity', ['incident-manager', 'security-team'], {
        formConfig: {
          fields: [
            { name: 'severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
            { name: 'impact', type: 'text', required: true },
            { name: 'next_steps', type: 'textarea', required: true }
          ]
        },
        dueDate: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      }, { x: 150, y: 200 })
      .addConditionStep('Check Severity', {
        field: 'assessment.severity',
        operator: 'in',
        value: ['High', 'Critical']
      }, { x: 150, y: 300 })
      .addActionStep('Escalate', 'email', {
        to: ['cto@company.com', 'security-lead@company.com'],
        subject: 'Critical Incident: {{incident.title}}',
        template: 'incident_escalation'
      }, { x: 250, y: 400 })
      .addActionStep('Standard Response', 'api', {
        endpoint: '/api/incident/standard-response',
        method: 'POST',
        data: {
          incidentId: '{{incident.id}}',
          assessment: '{{assessment}}'
        }
      }, { x: 50, y: 400 })
      .connectSteps(0, 1) // Create Ticket -> Notify Team (parallel)
      .connectSteps(0, 2) // Create Ticket -> Assess Severity
      .connectSteps(2, 3) // Assess Severity -> Check Severity
      .connectSteps(3, 4, 'success') // Check Severity -> Escalate (if high/critical)
      .connectSteps(3, 5, 'failure') // Check Severity -> Standard Response (if not high/critical)
      .setErrorHandling('continue')
      .setLogging('detailed')
      .setConcurrency(2);
  }

  static createApprovalWorkflow(name: string): WorkflowBuilder {
    return new WorkflowBuilder(name)
      .setDescription('Multi-stage approval workflow')
      .addEventTrigger('approval.requested')
      .addConditionStep('Check Amount', {
        field: 'request.amount',
        operator: 'gt',
        value: 10000
      }, { x: 100, y: 100 })
      .addHumanStep('Manager Approval', ['manager'], {
        formConfig: {
          fields: [
            { name: 'decision', type: 'select', options: ['Approve', 'Reject', 'Request Changes'] },
            { name: 'comments', type: 'textarea' }
          ]
        }
      }, { x: 50, y: 200 })
      .addHumanStep('Director Approval', ['director'], {
        formConfig: {
          fields: [
            { name: 'decision', type: 'select', options: ['Approve', 'Reject'] },
            { name: 'comments', type: 'textarea' }
          ]
        }
      }, { x: 150, y: 200 })
      .addConditionStep('Check Manager Decision', {
        field: 'manager_approval.decision',
        operator: 'eq',
        value: 'Approve'
      }, { x: 50, y: 300 })
      .addConditionStep('Check Director Decision', {
        field: 'director_approval.decision',
        operator: 'eq',
        value: 'Approve'
      }, { x: 150, y: 300 })
      .addActionStep('Final Approval', 'api', {
        endpoint: '/api/requests/approve',
        method: 'POST',
        data: {
          requestId: '{{request.id}}',
          approvedBy: ['{{manager_approval.user}}', '{{director_approval.user}}']
        }
      }, { x: 100, y: 400 })
      .addActionStep('Rejection Notice', 'email', {
        to: '{{request.submitter}}',
        subject: 'Request Rejected: {{request.title}}',
        template: 'request_rejected'
      }, { x: 250, y: 400 })
      .connectSteps(0, 1, 'failure') // Check Amount -> Manager Approval (if <= 10000)
      .connectSteps(0, 2, 'success') // Check Amount -> Director Approval (if > 10000)
      .connectSteps(1, 3) // Manager Approval -> Check Manager Decision
      .connectSteps(2, 4) // Director Approval -> Check Director Decision  
      .connectSteps(3, 5, 'success') // Check Manager -> Final Approval (if approved)
      .connectSteps(4, 5, 'success') // Check Director -> Final Approval (if approved)
      .connectSteps(3, 6, 'failure') // Check Manager -> Rejection (if not approved)
      .connectSteps(4, 6, 'failure') // Check Director -> Rejection (if not approved)
      .setErrorHandling('stop')
      .setLogging('detailed');
  }
}

export const BuiltInWorkflowTemplates: WorkflowTemplate[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Entity Processing Pipeline',
    description: 'Automated pipeline for processing and analyzing new entities',
    category: 'data-processing',
    tags: ['entities', 'ml', 'automation'],
    definition: WorkflowBuilder.createDataProcessingWorkflow('Entity Processing Pipeline').build(),
    isBuiltIn: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011', 
    name: 'Security Incident Response',
    description: 'Automated response workflow for security incidents',
    category: 'security',
    tags: ['security', 'incident', 'escalation'],
    definition: WorkflowBuilder.createIncidentResponseWorkflow('Security Incident Response').build(),
    isBuiltIn: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    name: 'Case Approval Process', 
    description: 'Multi-stage approval workflow for case actions',
    category: 'approval',
    tags: ['approval', 'case-management', 'governance'],
    definition: WorkflowBuilder.createApprovalWorkflow('Case Approval Process').build(),
    isBuiltIn: true
  }
];
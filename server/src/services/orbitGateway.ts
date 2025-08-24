interface Model {
  id: string;
  backend: string;
}

interface CanaryRoute {
  model: string;
  canary: string;
  traffic: number;
}

interface InferenceResult {
  model: string;
  route: string;
  usage: { tokens: number };
  output: string;
}

interface EvalMetrics {
  accuracy: number;
  toxicity: number;
  latency: number;
}

export class OrbitGateway {
  private models = new Map<string, Model>();
  private canaryRoutes = new Map<string, CanaryRoute>();
  private tokenUsage = 0;
  static readonly MAX_TOKENS = 1000;
  static readonly MAX_LATENCY_MS = 2000;

  registerModel(id: string, backend: string) {
    this.models.set(id, { id, backend });
  }

  registerCanary(model: string, canary: string, traffic: number) {
    if (traffic > 0.1) {
      throw new Error('Canary traffic must be <= 10%');
    }
    this.canaryRoutes.set(model, { model, canary, traffic });
  }

  private sanitizeInput(text: string) {
    if (/jailbreak/i.test(text)) {
      throw new Error('Jailbreak attempt detected');
    }
    return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/gi, '[REDACTED]');
  }

  private resolveRoute(model: string) {
    const canary = this.canaryRoutes.get(model);
    if (canary && Math.random() < canary.traffic) {
      return canary.canary;
    }
    return model;
  }

  async infer(model: string, input: string): Promise<InferenceResult> {
    const start = Date.now();
    const tokens = input.split(/\s+/).length;
    if (this.tokenUsage + tokens > OrbitGateway.MAX_TOKENS) {
      throw new Error('Token budget exceeded');
    }
    const sanitized = this.sanitizeInput(input);
    const result = `processed:${sanitized}`;
    const latency = Date.now() - start;
    if (latency > OrbitGateway.MAX_LATENCY_MS) {
      throw new Error('Latency budget exceeded');
    }
    this.tokenUsage += tokens;
    return {
      model,
      route: this.resolveRoute(model),
      usage: { tokens },
      output: result,
    };
  }

  async evalRun(_model: string): Promise<EvalMetrics> {
    // Stub metrics for demonstration
    return { accuracy: 1, toxicity: 0, latency: 0 };
  }

  reset() {
    this.models.clear();
    this.canaryRoutes.clear();
    this.tokenUsage = 0;
  }
}

export const orbitGateway = new OrbitGateway();

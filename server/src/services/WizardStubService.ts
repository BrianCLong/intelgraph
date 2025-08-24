import fs from 'fs';
import path from 'path';

export interface Fixtures {
  [key: string]: string;
}

export default class WizardStubService {
  private fixturesPath: string;
  private fixtures: Fixtures;
  private logPath: string;

  constructor() {
    this.fixturesPath = path.join(__dirname, '..', 'fixtures', 'hard-capability.json');
    this.logPath = path.join(__dirname, '..', '..', 'wizard-audit.log');
    this.fixtures = this.loadFixtures();
  }

  private loadFixtures(): Fixtures {
    try {
      const data = fs.readFileSync(this.fixturesPath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return { default: 'No fixtures loaded.' };
    }
  }

  getFixtures(): Fixtures {
    return this.fixtures;
  }

  setFixtures(newFixtures: Fixtures): void {
    this.fixtures = newFixtures;
    fs.writeFileSync(this.fixturesPath, JSON.stringify(this.fixtures, null, 2));
  }

  private redactPII(str: string): string {
    return str
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[REDACTED_PHONE]');
  }

  logInteraction(request: unknown, response: unknown): void {
    const entry = {
      timestamp: new Date().toISOString(),
      request: this.redactPII(JSON.stringify(request)),
      response: this.redactPII(JSON.stringify(response)),
    };
    fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
  }

  private getFixtureResponse(input: string): string {
    for (const [pattern, response] of Object.entries(this.fixtures)) {
      if (pattern !== 'default' && input.includes(pattern)) {
        return response;
      }
    }
    return this.fixtures.default || 'No simulated response available.';
  }

  private async jitterDelay(): Promise<void> {
    const delay = 50 + Math.random() * 250;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async handleRequest(input: string): Promise<Record<string, unknown>> {
    await this.jitterDelay();
    const result = this.getFixtureResponse(input);
    return {
      banner: '*** SIMULATED RESPONSE ***',
      simulated: true,
      result,
    };
  }
}

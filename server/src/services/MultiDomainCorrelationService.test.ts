import { MultiDomainCorrelationService } from './MultiDomainCorrelationService';
import { FusionEntity } from '../../../packages/contracts/src/integration';

describe('MultiDomainCorrelationService', () => {
  it('triggers alert for credential access during low maturity phase', () => {
    const service = new MultiDomainCorrelationService();
    const entities: FusionEntity[] = [
      {
        id: 'actor1',
        type: 'threat_actor',
        domain: 'intelligence',
        phase: 'Phase 3',
        description: 'APT actor',
        tags: ['credential_access'],
        linked_to: ['org1'],
      },
      {
        id: 'org1',
        type: 'maturity_score',
        domain: 'cybersecurity',
        phase: 'Phase 2',
        description: 'Mid-level org',
        score: 40,
      },
    ];

    const alerts = service.correlate(entities);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].source).toBe('actor1');
    expect(alerts[0].target).toBe('org1');
  });
});

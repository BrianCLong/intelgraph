import { FusionEntity, CorrelationAlert } from '../../../packages/contracts/src/integration';

export class MultiDomainCorrelationService {
  correlate(entities: FusionEntity[]): CorrelationAlert[] {
    const alerts: CorrelationAlert[] = [];

    for (const entity of entities) {
      if (!entity.linked_to) continue;
      for (const linkId of entity.linked_to) {
        const target = entities.find((e) => e.id === linkId);
        if (!target) continue;

        if (
          entity.tags?.includes('credential_access') &&
          target.domain === 'cybersecurity' &&
          target.phase === 'Phase 2'
        ) {
          alerts.push({
            message: 'Vulnerability in identity protection detected during low maturity phase',
            source: entity.id,
            target: target.id,
          });
        }
      }
    }

    return alerts;
  }
}

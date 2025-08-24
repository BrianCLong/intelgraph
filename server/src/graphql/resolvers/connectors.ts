import { ingestEcsEvents } from '../../services/connectors/elasticEcs.js';

export default {
  Query: {
    connectorStatus: () => ([
      { name: 'elastic-ecs', enabled: true, version: '1.0.0' },
      { name: 'splunk-hec', enabled: process.env.ENABLE_SPLUNK_HEC === 'true', version: '0.1.0' }
    ])
  },
  Mutation: {
    ingestEcsEvents: async (_: any, { events, options }: any) => ingestEcsEvents(events, options)
  }
};

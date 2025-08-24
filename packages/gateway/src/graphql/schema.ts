import { gql } from 'apollo-server';

// Local type definitions to avoid external dependency during tests
interface SLO {
  name: string;
  objective: number;
  windows: { duration: string }[];
  errorBudgetRemaining: number;
}

interface Rollout {
  service: string;
  strategy: string;
  phase: string;
  canPromote: boolean;
  canAbort: boolean;
}

interface Backup {
  id: string;
  target: string;
  takenAt: string;
  sizeBytes: number;
  checksum: string;
  region: string;
}

interface DRStatus {
  primaryRegion: string;
  secondaryRegion: string;
  healthy: boolean;
  lastFailoverAt?: string;
  drills: string[];
}

export const typeDefs = gql`
  type SLI {
    name: String!
    value: Float!
    target: Float!
    window: String!
  }
  type SLO {
    name: String!
    objective: Float!
    errorBudgetRemaining: Float!
    windows: [SLOWindow!]!
  }
  type SLOWindow {
    duration: String!
  }
  type Rollout {
    service: String!
    strategy: String!
    phase: String!
    canPromote: Boolean!
    canAbort: Boolean!
  }
  type Backup {
    id: ID!
    target: String!
    takenAt: String!
    sizeBytes: Int!
    checksum: String!
    region: String!
  }
  type DRStatus {
    primaryRegion: String!
    secondaryRegion: String!
    healthy: Boolean!
    lastFailoverAt: String
    drills: [String!]!
  }
  type Query {
    slos: [SLO!]!
    rollouts: [Rollout!]!
    backups(target: String): [Backup!]!
    drStatus: DRStatus!
  }
  type Mutation {
    promoteRollout(service: String!): Boolean!
    abortRollout(service: String!): Boolean!
    triggerBackup(target: String!): Boolean!
    startFailover: Boolean!
    runFailoverDrill: Boolean!
    restore(target: String!, snapshotId: String!, verifyOnly: Boolean): Boolean!
  }
  type Subscription {
    opsEvents: String!
  }
`;

export const resolvers = {
  Query: {
    slos: (): SLO[] => [
      {
        name: 'availability',
        objective: 99.9,
        windows: [{ duration: '30d' }],
        errorBudgetRemaining: 0.9,
      },
    ],
    rollouts: (): Rollout[] => [
      {
        service: 'gateway',
        strategy: 'canary',
        phase: 'Healthy',
        canPromote: true,
        canAbort: true,
      },
    ],
    backups: (_: unknown, args: { target?: string }): Backup[] => [
      {
        id: '1',
        target: args.target || 'postgres',
        takenAt: new Date().toISOString(),
        sizeBytes: 1024,
        checksum: 'abc',
        region: 'region-a',
      },
    ],
    drStatus: (): DRStatus => ({
      primaryRegion: 'region-a',
      secondaryRegion: 'region-b',
      healthy: true,
      drills: [],
    }),
  },
  Mutation: {
    promoteRollout: () => true,
    abortRollout: () => true,
    triggerBackup: () => true,
    startFailover: () => true,
    runFailoverDrill: () => true,
    restore: () => true,
  },
  Subscription: {
    opsEvents: {
      subscribe: async function* () {
        yield 'ok';
      },
    },
  },
};

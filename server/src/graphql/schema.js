import { gql } from 'graphql-tag';
const { copilotTypeDefs } = require('./schema.copilot.js');
const { graphTypeDefs } = require('./schema.graphops.js');
const { aiTypeDefs } = require('./schema.ai.js');
const { annotationsTypeDefs } = require('./schema.annotations.js');
const graphragTypes = require('./types/graphragTypes.js');
import { coreTypeDefs } from './schema.core.js';

const base = gql`
  scalar JSON
  scalar DateTime
  
  type Query { _empty: String }
  type Mutation { _empty: String }
  type Subscription { _empty: String }
`;

export const typeDefs = [base, coreTypeDefs, copilotTypeDefs, graphTypeDefs, graphragTypes, aiTypeDefs, annotationsTypeDefs];

import { gql } from 'graphql-tag';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const { copilotTypeDefs } = require('./schema.copilot.js');
const { graphTypeDefs } = require('./schema.graphops.js');
const { aiTypeDefs } = require('./schema.ai.js');
const { annotationsTypeDefs } = require('./schema.annotations.js');
const graphragTypes = require('./types/graphragTypes.js');
import { coreTypeDefs } from './schema.core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const connectorsTypeDefs = gql(readFileSync(path.join(__dirname, 'schema/connectors.graphql'), 'utf8'));

const base = gql`
  scalar JSON
  scalar DateTime
  
  type Query { _empty: String }
  type Mutation { _empty: String }
  type Subscription { _empty: String }
`;

export const typeDefs = [base, coreTypeDefs, copilotTypeDefs, graphTypeDefs, graphragTypes, aiTypeDefs, annotationsTypeDefs, connectorsTypeDefs];

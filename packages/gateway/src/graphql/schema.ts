import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList } from 'graphql';
import { tenants } from './store';

const TenantType = new GraphQLObjectType({
  name: 'Tenant',
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString }
  }
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    tenants: {
      type: new GraphQLList(TenantType),
      resolve: () => tenants
    }
  }
});

export default new GraphQLSchema({ query: QueryType });

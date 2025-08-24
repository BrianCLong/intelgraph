import { ApolloServer } from '@apollo/server';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { persistedOnlyPlugin } from './plugins/persistedOnly';
import { costLimitPlugin } from './plugins/costLimit';

function rateLimitPlugin() {
  return {
    async requestDidStart() {
      return {
        async willSendResponse() {
          /* placeholder */
        },
      };
    },
  };
}

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({ subgraphs: [] }),
});

export const server = new ApolloServer({
  gateway,
  includeStacktraceInErrorResponses: false,
  plugins: [rateLimitPlugin(), persistedOnlyPlugin(), costLimitPlugin()],
});

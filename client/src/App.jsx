import React from "react";
import { Provider } from "react-redux";
import { store } from "./store";
import Explorer from "./features/explorer/Explorer";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
} from "@apollo/client";

// Initialize Apollo Client
const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql",
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

function TestApp() {
  return (
    <ApolloProvider client={client}>
      <Provider store={store}>
        <Explorer />
      </Provider>
    </ApolloProvider>
  );
}

export default TestApp;

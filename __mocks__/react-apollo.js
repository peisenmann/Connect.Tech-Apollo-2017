
// import ApolloProvider, { graphql as g, withApollo as wa } from 'react-apollo';
const ApolloProvider = require('react-apollo/lib/ApolloProvider');
const g = require('react-apollo/lib/graphql');

const graphql = jest.fn((DOCUMENT, options) => {
  const func = g.default(DOCUMENT, options);
  func.DOCUMENT = DOCUMENT;
  func.options = options;
  return func;
});

const withApollo = jest.fn(g.withApollo);

export {
  graphql,
  withApollo,
};

export default ApolloProvider;

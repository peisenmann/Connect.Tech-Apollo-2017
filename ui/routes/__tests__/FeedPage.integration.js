/* eslint-disable react/prop-types, import/no-extraneous-dependencies, react/no-multi-comp */
import React, { Component } from 'react';
import renderer from 'react-test-renderer';
import { MockedProvider } from 'react-apollo/lib/test-utils';

import FEED_QUERY from '../../graphql/FeedQuery.graphql';
import { withData } from '../FeedPage';

jest.mock('react-apollo');

describe('withData', () => {
  xit('correctly makes a query with minimal props', (done) => {
    const feed = [];
    const result = {
      currentUser: null,
      feed,
    };

    const variables = { type: 'TOP', offset: 0, limit: 10 };

    class Dummy extends Component {
      componentWillMount() {
        expect(this.props.loading).toEqual(true);
      }

      componentWillReceiveProps(nextProps) {
        if (this.props.loading) {
          expect(nextProps.loading).toEqual(false);
          expect(nextProps.feed).toEqual(feed);
          done();
        }
      }

      render() {
        return <div />;
      }
    }

    const DummyWithData = withData(Dummy);
    const query = FEED_QUERY;

    renderer.create(
      <MockedProvider
        mocks={[
          { request: { query, variables }, result: { data: result } },
        ]}
      >
        <DummyWithData />
      </MockedProvider>
    );
  });
  xit('correctly makes a query with params', (done) => {
    const feed = [];
    const result = {
      currentUser: null,
      feed,
    };

    const variables = { type: 'BOTTOM', offset: 0, limit: 10 };

    class Dummy extends Component {
      componentWillMount() {
        expect(this.props.loading).toEqual(true);
      }

      componentWillReceiveProps(nextProps) {
        if (this.props.loading) {
          expect(nextProps.loading).toEqual(false);
          expect(nextProps.feed).toEqual(feed);
          done();
        }
      }

      render() {
        return <div />;
      }
    }

    const DummyWithData = withData(Dummy);
    const query = FEED_QUERY;

    renderer.create(
      <MockedProvider
        mocks={[
          { request: { query, variables }, result: { data: result } },
        ]}
      >
        <DummyWithData params={{ type: 'BOTTOM' }} />
      </MockedProvider>
    );
  });
  xit('allows for fetching more items', (done) => {
    const feed = [
      {
        id: 1,
        commentCount: 0,
        repository: {
          full_name: 'apollographql/apollo-client',
          html_url: 'https://github.com/apollographql/apollo-client',
          owner: {
            avatar_url: 'https://avatars.githubusercontent.com/u/17189275?v=3',
          },
          description: ':rocket: A fully-featured caching GraphQL client for any server or UI framework',
          stargazers_count: 1901,
          open_issues_count: 120,
        },
        score: 3,
        vote: {
          vote_value: 1,
        },
        createdAt: 1488157422095,
        postedBy: {
          html_url: 'https://github.com/stubailo',
          login: 'stubailo',
        },
      },
    ];
    const feedItem2 = {
      id: 2,
      commentCount: 0,
      repository: {
        full_name: 'apollographql/react-apollo',
        html_url: 'https://github.com/apollographql/react-apollo',
        owner: {
          avatar_url: 'https://avatars.githubusercontent.com/u/17189275?v=3',
        },
        description: ':rocket: A fully-featured caching GraphQL client for any server or UI framework',
        stargazers_count: 1901,
        open_issues_count: 120,
      },
      score: 3,
      vote: {
        vote_value: 1,
      },
      createdAt: 1488157422095,
      postedBy: {
        html_url: 'https://github.com/stubailo',
        login: 'stubailo',
      },
    };

    const result = {
      currentUser: {
        login: 'jbaxleyiii',
      },
      feed,
    };

    const result1 = {
      currentUser: {
        login: 'jbaxleyiii',
      },
      feed: [feedItem2],
    };

    const variables = { type: 'BOTTOM', offset: 0, limit: 10 };
    const variables1 = { offset: 1 };

    let hasReturnedOnce = false;
    class Dummy extends Component {
      componentWillMount() {
        expect(this.props.loading).toEqual(true);
      }

      componentWillReceiveProps(nextProps) {
        if (hasReturnedOnce) {
          done();
        }

        if (!hasReturnedOnce && this.props.loading) {
          expect(nextProps.loading).toEqual(false);
          expect(nextProps.feed).toEqual(feed);
          hasReturnedOnce = true;
          nextProps.fetchMore();
        }
      }

      render() {
        return <div />;
      }
    }

    const DummyWithData = withData(Dummy);
    const query = FEED_QUERY;

    renderer.create(
      <MockedProvider
        mocks={[
          { request: { query, variables }, result: { data: result } },
          { request: { query, variables: variables1 }, result: { data: result1 } },
        ]}
      >
        <DummyWithData params={{ type: 'BOTTOM' }} />
      </MockedProvider>
    );
  });
});

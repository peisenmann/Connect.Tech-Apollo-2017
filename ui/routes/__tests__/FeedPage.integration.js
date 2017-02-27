/* eslint-disable react/propTypes */
import React, { Component } from 'react';
// eslint-disable-next-line
import renderer from 'react-test-renderer';
import { MockedProvider } from 'react-apollo/lib/test-utils';

import FEED_QUERY from '../../graphql/FeedQuery.graphql';
import FeedPage, { withData, withMutations } from '../FeedPage';

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

    renderer.create(
      <MockedProvider
        mocks={[
          { request: { query: FEED_QUERY, variables }, result: { data: result } },
        ]}
      >
        <DummyWithData />
      </MockedProvider>
    );
  });
});

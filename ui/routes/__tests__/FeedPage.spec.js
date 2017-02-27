import React from 'react';
import { graphql } from 'react-apollo';
// eslint-disable-next-line
import renderer from 'react-test-renderer';

// because we mock graphql, we don't need to import them here
import { FeedPage } from '../FeedPage';
import FEED_QUERY from '../../graphql/FeedQuery.graphql';
import VOTE_MUTATION from '../../graphql/Vote.graphql';

jest.mock('react-apollo', () => ({
  graphql: jest.fn(() => jest.fn(comp => comp)),
  withApollo: jest.fn(comp => comp),
}));


jest.mock('../../components/Feed', () => {
  // eslint-disable-next-line
  const { PropTypes } = require('react');
  // eslint-disable-next-line
  const el = (props) => <div {...props} />;
  // eslint-disable-next-line
  el.propTypes = { entries: PropTypes.array };
  return el;
});

const withData = {
  DOCUMENT: graphql.mock.calls[0][0],
  options: graphql.mock.calls[0][1],
};

const withMutations = {
  DOCUMENT: graphql.mock.calls[1][0],
  options: graphql.mock.calls[1][1],
};

describe('withData', () => {
  it('uses the FEED_QUERY as the document', () => {
    expect(withData.DOCUMENT).toEqual(FEED_QUERY);
  });

  it('passes an options object with a function for options and props', () => {
    const { options, props } = withData.options;
    expect(typeof options).toEqual('function');
    expect(typeof props).toEqual('function');
  });

  describe('options', () => {
    it('sets the type from the params.type', () => {
      const props = { params: { type: 'BOTTOM' } };
      const { variables: { type } } = withData.options.options(props);
      expect(type).toEqual(props.params.type);
    });
    it('uses a default of TOP for the type', () => {
      const { variables: { type } } = withData.options.options({});
      expect(type).toEqual('TOP');
    });
    it('has a default offset of 0', () => {
      const { variables: { offset } } = withData.options.options({});
      expect(offset).toEqual(0);
    });
    it('has a default limit of 10', () => {
      const { variables: { limit } } = withData.options.options({});
      expect(limit).toEqual(10);
    });
    it('sets forceFetch to be true', () => {
      const { forceFetch } = withData.options.options({});
      expect(forceFetch).toEqual(true);
    });
  });

  describe('props', () => {
    const defaultData = {
      loading: true,
      feed: [],
      currentUser: {},
      fetchMore: jest.fn(() => {}),
    };
    it('returns an object with loading', () => {
      const props = withData.options.props({ data: defaultData });
      expect(props.loading).toEqual(defaultData.loading);
    });
    it('returns an object with the feed', () => {
      const props = withData.options.props({ data: defaultData });
      expect(props.feed).toEqual(defaultData.feed);
    });
    it('returns an object with the currentUser', () => {
      const props = withData.options.props({ data: defaultData });
      expect(props.currentUser).toEqual(defaultData.currentUser);
    });
    it('returns an object with a fetchMore function', () => {
      const props = withData.options.props({ data: defaultData });
      expect(typeof props.fetchMore).toEqual('function');
    });
    describe('fetchMore', () => {
      it('should return variables based on the length of the query', () => {
        const fetchMoreMock = jest.fn(() => {});
        const data = { ...defaultData, ...{ fetchMore: fetchMoreMock } };
        const { fetchMore } = withData.options.props({ data });

        fetchMore();
        const mockCall = fetchMoreMock.mock.calls[0][0];
        expect(mockCall.variables).toEqual({ offset: 0 });
      });
      it('should return variables based on the length of the query', () => {
        const fetchMoreMock = jest.fn(() => {});
        const data = { ...defaultData, ...{ fetchMore: fetchMoreMock } };
        data.feed = [0, 1, 2, 3];
        const { fetchMore } = withData.options.props({ data });

        fetchMore();
        const mockCall = fetchMoreMock.mock.calls[0][0];
        expect(mockCall.variables).toEqual({ offset: 4 });
      });
      describe('updateQuery', () => {
        it('returns the prev result if no new data', () => {
          const fetchMoreMock = jest.fn(() => {});
          const data = { ...defaultData, ...{ fetchMore: fetchMoreMock } };
          const { fetchMore } = withData.options.props({ data });
          fetchMore();
          const { updateQuery } = fetchMoreMock.mock.calls[0][0];

          const prev = { feed: [] };
          const fetchMoreResult = {};
          expect(updateQuery(prev, { fetchMoreResult })).toEqual(prev);
        });
        it('adds new items to the feed', () => {
          const fetchMoreMock = jest.fn(() => {});
          const data = { ...defaultData, ...{ fetchMore: fetchMoreMock } };
          const { fetchMore } = withData.options.props({ data });
          fetchMore();
          const { updateQuery } = fetchMoreMock.mock.calls[0][0];

          const prev = { feed: [1] };
          const fetchMoreResult = { data: { feed: [2] } };
          expect(updateQuery(prev, { fetchMoreResult })).toEqual({ feed: [1, 2] });
        });
      });
    });
  });
});

describe('withMutations', () => {
  it('uses the VOTE_MUTATION as the document', () => {
    expect(withMutations.DOCUMENT).toEqual(VOTE_MUTATION);
  });
  it('passes an options object with a function props', () => {
    const { props } = withMutations.options;
    expect(typeof props).toEqual('function');
    expect(typeof props({ mutate: () => {} }).vote).toEqual('function');
  });
  describe('vote', () => {
    it('passes the repoFullName and type to the mutation function', () => {
      const mutate = jest.fn(() => {});
      const { vote } = withMutations.options.props({ mutate });
      const vars = { repoFullName: 'react-apollo', type: 'UPVOTE' };
      vote(vars);
      expect(mutate).toBeCalledWith({ variables: vars });
    });
  });
});

describe('FeedPage', () => {
  it('renders with minimal props', () => {
    const props = {
      vote: jest.fn(() => {}),
      loading: true,
      currentUser: null,
      feed: [],
      fetchMore: jest.fn(() => {}),
    };

    const result = renderer.create(
      <FeedPage {...props} />
    );

    expect(result).toMatchSnapshot();
  });
  it('renders with minimal props', () => {
    const props = {
      vote: jest.fn(() => {}),
      loading: false,
      currentUser: null,
      feed: null,
      fetchMore: jest.fn(() => {}),
    };

    const result = renderer.create(
      <FeedPage {...props} />
    );

    expect(result).toMatchSnapshot();
  });
  it('renders with currentUser', () => {
    const props = {
      vote: jest.fn(() => {}),
      loading: false,
      currentUser: { login: '' },
      feed: [],
      fetchMore: jest.fn(() => {}),
    };

    const result = renderer.create(
      <FeedPage {...props} />
    );

    expect(result).toMatchSnapshot();
  });
});

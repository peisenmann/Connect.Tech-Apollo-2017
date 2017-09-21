import React, {PropTypes} from 'react';
import { gql, graphql } from 'react-apollo';
import { Link } from 'react-router-dom';

const PROFILE_QUERY = gql`
  query CurrentUserForLayout {
    currentUser {
      login
      avatar_url
    }
  }
`;

function Profile ({loading, currentUser}) {
  if (loading) {
    return (
      <p className="navbar-text navbar-right">
        Loading...
      </p>
    );
  } else if (currentUser) {
    return (
      <span>
        <p className="navbar-text navbar-right">
          {currentUser.login}
          &nbsp;
          <a href="/logout">Log out</a>
        </p>
        <Link
          type="submit"
          className="btn navbar-btn navbar-right btn-success"
          to="/submit"
        >
          <span
            className="glyphicon glyphicon-plus"
            aria-hidden="true"
          />
          &nbsp;
          Submit
        </Link>
      </span>
    );
  }
  return (
    <p className="navbar-text navbar-right">
      <a href="/login/github">Log in with GitHub</a>
    </p>
  );
}


Profile.propTypes = {
  loading: PropTypes.bool,
  currentUser: PropTypes.shape({
    login: PropTypes.string.isRequired,
  }),
};


export default graphql(PROFILE_QUERY, {
  options: {fetchPolicy: 'cache-and-network'}, // cache-only, network-only, cache-first
  props: ({ data: { loading, currentUser } }) => ({loading, currentUser}),
})(Profile);

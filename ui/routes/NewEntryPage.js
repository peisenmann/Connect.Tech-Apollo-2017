import React from 'react';
import { graphql } from 'react-apollo';
import { withRouter } from 'react-router';

import SUBMIT_REPOSITORY_MUTATION from '../graphql/SubmitRepository.graphql';

class NewEntryPage extends React.Component {
  constructor() {
    super();
    this.state = {};

    this.submitForm = this.submitForm.bind(this);
  }

  submitForm(event) {
    event.preventDefault();

    const { submit } = this.props;

    const repoFullName = event.target.repoFullName.value;

    return submit(repoFullName).then(res => {
      if (!res.errors) {
        this.props.history.push('/feed/new');
      } else {
        this.setState({ errors: res.errors });
      }
    });
  }

  render() {
    const { errors } = this.state;
    return (
      <div>
        <h1>Submit a repository</h1>

        <form onSubmit={this.submitForm}>
          <div className="form-group">
            <label htmlFor="exampleInputEmail1">Repository name</label>

            <input
              type="text"
              className="form-control"
              id="exampleInputEmail1"
              name="repoFullName"
              placeholder="peisenmann/Connect.Tech-Apollo-2017"
            />
          </div>

          {errors && (
            <div className="alert alert-danger" role="alert">
              {errors[0].message}
            </div>
          )}

          <button type="submit" className="btn btn-primary">
            Submit
          </button>
        </form>
      </div>
    );
  }
}

NewEntryPage.propTypes = {
  submit: React.PropTypes.func.isRequired,
};

const withData = graphql(SUBMIT_REPOSITORY_MUTATION, {
  props: ({ mutate }) => ({
    submit: repoFullName =>
      mutate({
        variables: { repoFullName },
      }),
  }),
});

export default withRouter(withData(NewEntryPage));

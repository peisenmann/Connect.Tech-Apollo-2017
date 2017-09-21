import React, {Component, PropTypes} from 'react';

import {deepDiffShouldComponentUpdate} from '../helpers/should-component-update';

export function withMutations(mutationArgs = []) {
  return withMutationsHelper;

  function withMutationsHelper(WrappedComponent) {
    class WithMutations extends Component {
      static contextTypes = {
        client: PropTypes.object,
      };

      shouldComponentUpdate(nextProps, nextState) {
        return deepDiffShouldComponentUpdate(
          this.props,
          nextProps,
          this.state,
          nextState,
          {
            debug: true,
            key: 'withMutations',
            ignoreProp: (key, oldValue, newValue) =>
              typeof oldValue === 'function' && typeof newValue === 'function',
          },
        );
      }

      handleInvokeMutation = mutation => options =>
        this.context.client.mutate({mutation, ...options});

      render() {
        const mutations = mutationArgs.reduce((acc, mutation) => {
          acc[determineMutationName(mutation)] = this.handleInvokeMutation(
            mutation,
          );
          return acc;
        }, {});

        return React.createElement(WrappedComponent, {
          ...this.props,
          ...mutations,
        });
      }
    }

    return WithMutations;
  }
}

function determineMutationName(mutation) {
  const def = mutation.definitions.find(
    d => d.kind === 'OperationDefinition' && d.operation === 'mutation',
  );
  return def && def.name.value;
}

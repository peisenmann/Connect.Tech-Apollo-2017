/* eslint-disable react/no-set-state */
import React, {Component, PropTypes} from 'react';
import {graphql, compose} from 'react-apollo';

import {WorkAreaGQL, WorkspaceGQL} from '../queries';
import {deepDiffShouldComponentUpdate} from '../../util/should-component-update';

import {Logger, LogManager} from '../../log';

const logger: Logger = LogManager.getLogger(
  'ca.graphql.decorators.withWorkspaces',
);

/**
 * These are the defaults of the WorkspacesOptions defined below.
 */
const defaultOptions = Object.freeze({
  name: 'data',
  assignedOnly: false,
  conflictingOnly: false,
  addConflicting: false,
  locationFetchPolicy: 'cache-first',
  workspaceFetchPolicy: 'cache-and-network',
  visitIds: [],
});

/**
 * A document created by gql``
 */
type gqlDocument = Object

/**
 * This is essentially the prop types of this decorator
 * You can pass in either an object that matches this structure,
 * or {options: props => {return some object with name, assignedOnly, etc}}.
 */
type WorkspacesOptions = {
  /**
   * The key of the prop that will be passed in to the view. Default: data
   */
  name: string,

  /**
   * Whether to include only workspaces that are assigned to the user. Default: false
   */
  assignedOnly: boolean,

  /**
   * Can request either active and discharged visits OR conflicting visits.
   * Whether to request only conflicting visits. Default: false
   */
  conflictingOnly: boolean,

  /**
   * Done for CA-467 - Variance needs to see conflicting as well as others
   */
  addConflicting: boolean,

  /**
   * The Apollo fetchPolicy to use with the location tree. Default: cache-first
   * This default will cause the location tree not to update after it's cached
   */
  locationFetchPolicy: string,

  /**
   * The Apollo fetchPolicy to use with the workspaces query. Default: cache-and-network
   * This default will cause the workspace contents to update every time it's mounted
   */
  workspaceFetchPolicy: string,

  /**
   * Instead of requesting all or all assigned visits, specific visits can be requested by id
   * Default: undefined
   */
  visitIds: [number],
}

/**
 * The object structure to provide to the decorator
 */
type WithWorkspacesParam = {
  /**
   * What query to use for requesting locations. Must take a variable `assignedBedsOnly` boolean.
   */
  locationQuery: gqlDocument,

  /**
   * What query to use for requesting workspaces. Must take a variable `visitIds` array of Long.
   */
  workspaceQuery: gqlDocument,

  /**
   * The options can be passed in as an object or as a synchronous function that takes props
   * and returns an object of options.
   */
  options: WorkspacesOptions | ((props: Object) => WorkspacesOptions),
}

/**
 * Decorator to request and provide workspace data merged with location structure data
 * @param {[{workspaceQuery: gqlDocument, options: function(props):WorkspacesOptions} | {workspaceQuery: gqlDocument, options: WorkspacesOptions} | Class]} arg?
 */
export function withWorkspaces(arg: WithWorkspacesParam) {
  // Determine if there were options
  const opts = arg && arg.options;

  // Extract or setup the default for our two queries
  const locationQuery =
    (arg && arg.locationQuery) || WorkAreaGQL.queries.FacilityBeds;
  const workspaceQuery =
    (arg && arg.workspaceQuery) ||
    WorkspaceGQL.queries.FullWorkspacePlanVisitByVisitIds;

  // This is the case that either there was no argument at all @withWorkspaces()
  // Or there were options @withWorkspaces({options: objectOrFunction})
  if (!arg || arg.options) {
    return withWorkspacesHelper;
  } else if (typeof arg === 'function') {
    // This is the case where there were no parens on the decorator @withWorkspaces
    return withWorkspacesHelper(arg);
  }
  // Something invalid was passed in
  logger.error(
    'Invalid arg passed to withWorkspaces',
    typeof arg,
    arg,
    `Expected one of the following shapes:
    @withWorkspaces
    @withWorkspaces()
    @withWorkspaces({options: {name: 'data', assignedOnly: true}})
    @withWorkspaces({options: props => {return {name: props.name, locationFetchPolicy: 'cache-only'}}})`,
  );


  // A decorator is expected to return a function that consumes a component
  function withWorkspacesHelper(WrappedComponent) {
    /**
     * This is the class that will actually wrap the component when
     * all the decorator bits are sorted out finally resolved
     */
    @compose(
      // Location query
      // Pull facilities with assigned or not as a variable
      graphql(locationQuery, {
        name: 'facilityBeds',
        options: (props) => {
          const finalOptions = mergeOptions(props, defaultOptions, opts);
          return {
            fetchPolicy: finalOptions.locationFetchPolicy,
            variables: {assignedBedsOnly: finalOptions.assignedOnly},
          };
        },
      }),
      // Workspace query
      // Once we've gathered some ids, run the workspace query
      // Wait to run this query until there's some visit ids are available
      graphql(workspaceQuery, {
        name: 'workspacePlanVisit',
        // If the query specifically contained an array of visitIds and that array was empty
        // or if none of the beds had visit ids, then do not send this query
        skip: (props) => {
          const finalOptions = mergeOptions(props, opts);
          return (
            // If the user intentionally passed in an array of length 0, don't request anything
            (finalOptions.visitIds && finalOptions.visitIds.length === 0) ||
            // If the user didn't pass anything in, but we don't have any facility beds (yet)
            !visitIdsFromFacilities(
              props.facilityBeds.facilities,
              finalOptions.conflictingOnly,
              finalOptions.addConflicting,
            ).length
          );
        },
        options: (props) => {
          const finalOptions = mergeOptions(props, defaultOptions, opts);
          return {
            fetchPolicy: finalOptions.workspaceFetchPolicy,
            // If the decorator was given visit ids, use those. Otherwise, use the ones we accumulated from the facility
            // Note from the skip that if the user passed in an array, but it was empty, then this won't get run
            variables: {
              visitIds: finalOptions.visitIds.length
                ? finalOptions.visitIds
                : visitIdsFromFacilities(
                  props.facilityBeds.facilities,
                  finalOptions.conflictingOnly,
                  finalOptions.addConflicting,
                ),
            },
          };
        },
      }),
    )
    class WithWorkspaces extends Component {
      static propTypes = {
        facilityBeds: PropTypes.shape({
          facilities: PropTypes.arrayOf(
            PropTypes.shape({
              exchangeName: PropTypes.string,
              departments: PropTypes.arrayOf(
                PropTypes.shape({
                  exchangeName: PropTypes.string,
                  beds: PropTypes.arrayOf(
                    PropTypes.shape({
                      visitId: PropTypes.number,
                    }),
                  ),
                }),
              ),
            }),
          ),
        }),
        workspacePlanVisit: PropTypes.shape({
          workspaces: PropTypes.arrayOf(
            PropTypes.shape({
              bed: PropTypes.arrayOf(
                PropTypes.shape({
                  exchangeName: PropTypes.string,
                  visitId: PropTypes.number,
                }),
              ),
              plan: PropTypes.object,
              visit: PropTypes.object,
            }),
          ),
        }),
      }

      state = {workspaces: []}

      componentWillMount() {
        this.prepareWorkspaceState(this.props);
      }

      componentWillReceiveProps(nextProps) {
        this.prepareWorkspaceState(nextProps);
      }

      shouldComponentUpdate(nextProps, nextState) {
        return deepDiffShouldComponentUpdate(
          this.props,
          nextProps,
          this.state,
          nextState,
          {
            debug: true,
            key: 'withWorkspaces',
            ignoreProp: (key, oldValue, newValue) =>
              typeof oldValue === 'function' && typeof newValue === 'function',
          },
        );
      }

      /*
       * Merge the facility data and the server's workspace data together only when it changes
       */
      prepareWorkspaceState = (props) => {
        // If the server data has changed, recalculate the workspace data
        if (
          this.props.facilityBeds !== props.facilityBeds ||
          this.props.workspacePlanVisit !== props.workspacePlanVisit
        ) {
          // Both the workspace and the facility data could be not set and load in either order
          // because of caching or latency
          const workspaces = props.workspacePlanVisit &&
          props.workspacePlanVisit.workspaces
            ? props.workspacePlanVisit.workspaces.slice()
            : [];
          const facilities =
            (props.facilityBeds && props.facilityBeds.facilities) || [];

          // Organize workspaces by bed exchange name. This ensures that we get one workspace per assigned bed,
          // even if there is not a patient in that bed. Now we can look up workspaces in O(1)
          const workspacesByBedExchangeName: Map = workspaces.reduce(
            (acc: Map, workspace) => {
              // Accumulate all the exchange names that this workspace participates in
              const exchangeNames: Set = new Set();
              if (workspace.bed.length) {
                workspace.bed.forEach((bed) => {
                  exchangeNames.add(bed.exchangeName);
                });
              }
              // Discharged visits may not have a bed
              if (workspace.visit && workspace.visit.homeBedExchangeName) {
                exchangeNames.add(workspace.visit.homeBedExchangeName);
              }
              // Conflicting Visits may need to get bed name from the conflict
              if (workspace.visit && workspace.visit.bedConflict) {
                exchangeNames.add(workspace.visit.bedConflict.exchangeName);
              }
              exchangeNames.forEach((exchangeName) => {
                const workspacesForExchangeName =
                  acc.get(exchangeName) || new Set();
                workspacesForExchangeName.add(workspace);
                acc.set(exchangeName, workspacesForExchangeName);
              });

              return acc;
            },
            new Map(),
          );

          // Our goal output is an array of workspaces where every workspace has (some optional):
          // facility, department, bed, visit, plan
          // But we don't want to get all that repeated data from the server, so we request the
          // location tree stuff just once, then merge it into the workspaces below
          // Now, facilities, departments, and beds should be able to === because they will
          // literally be the same references.
          const coallatedWorkspaces = [];
          facilities.forEach(facility =>
            facility.departments.forEach(department =>
              department.beds.forEach(bed =>
                (workspacesByBedExchangeName.get(bed.exchangeName) ||
                  new Set([{}]))
                  .forEach((workspace) => {
                    coallatedWorkspaces.push({
                      ...workspace,
                      facility,
                      department,
                      bed,
                    });
                  }),
              ),
            ),
          );

          // Store this value simply on the class. Maybe this should be in state?
          this.setState({workspaces: coallatedWorkspaces});
        }
      };

      handleRefetch = () => {
        const {facilityBeds, workspacePlanVisit} = this.props;
        facilityBeds.refetch();
        if (workspacePlanVisit) {
          workspacePlanVisit.refetch();
        }
      };

      render() {
        // Get the known data props plus any additional props that might have been passed down
        const {facilityBeds, workspacePlanVisit, ...props} = this.props;

        // If a name value was passed in, we need to grab it
        const finalOptions = mergeOptions(props, defaultOptions, opts);

        // Create the structure that to pass into the receiving view. We need to use the named prop that the
        // requester provided.
        const dataProps = {
          [finalOptions.name]: {
            loading:
            facilityBeds.loading ||
            (workspacePlanVisit && workspacePlanVisit.loading),
            // todo Is this the right function to call for refetching?
            refetch: this.handleRefetch,
            workspaces: this.state.workspaces,
          },
        };

        return <WrappedComponent {...props} {...dataProps} />;
      }
    }

    return WithWorkspaces;
  }
}

type Facility = {
  departments: [{beds: [{visitId: number, conflictingVisitIds: [number]}]}],
}

/**
 * Extract all the visitIds from the beds of the facilities
 * @param {[Facility]} facilities The array of facilities to extract from
 * @param {boolean} conflictingOnly Use only the conflictingVisitIds instead of the visitId
 * @param {boolean} addConflicting Include conflictingVisitIds with others
 * @returns {[number]} The array of visit ids from the beds of the facilities
 */
function visitIdsFromFacilities(
  facilities: [Facility],
  conflictingOnly: boolean,
  addConflicting: boolean,
) {
  return facilities
    ? [
      ...new Set(
        facilities.reduce(
          (visitIds, facility) =>
            visitIds.concat(
              facility.departments.reduce(
                (visitIds, department) =>
                  visitIds.concat(
                    department.beds.reduce((visitIds, bed) => {
                      let ids;
                      if (conflictingOnly) {
                        ids = bed.conflictingVisitIds;
                      } else if (
                        bed.visitId ||
                        bed.dischargedVisitId ||
                        bed.conflictingVisitIds
                      ) {
                        ids = [];
                        if (bed.visitId) {
                          ids.push(bed.visitId);
                        }
                        if (bed.dischargedVisitId) {
                          ids.push(bed.dischargedVisitId);
                        }
                        if (
                          addConflicting &&
                          bed.conflictingVisitIds.length > 0
                        ) {
                          bed.conflictingVisitIds.forEach(id => ids.push(id));
                        }
                      }
                      return ids && ids.length
                        ? visitIds.concat(ids)
                        : visitIds;
                    }, []),
                  ),
                [],
              ),
            ),
          [],
        ),
      ),
    ]
    : [];
}

/**
 * Combines any number of options objects or options functions together
 * @param props The props to pass into any options function
 * @param {[function|WorkspacesOptions]} optionArgs The
 * @returns {*}
 */
function mergeOptions(props, ...optionArgs) {
  return optionArgs.reduce((acc, opt) => {
    if (typeof opt === 'function') {
      return Object.assign(acc, opt(props));
    } else if (typeof opt === 'object') {
      return Object.assign(acc, opt);
    }
  }, {});
}

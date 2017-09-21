import {addTypenameToDocument} from 'apollo-client';
import graphqlTag from 'graphql-tag';
import graphqlToString from 'graphql/language/printer';

import {assembleDataId} from '../cl-apollo-client';

import {LogManager} from '../log';

const logger = LogManager.getLogger('ca.graphql.util.gql');

/**
 * Shared fragments across the app
 * @type {Map<String, Definition>} Fragment name to Fragment definition Map
 */
const globalSharedFragments = new Map();

export default function gql(stringParts, ...variableParts) {
  // We're not doing any magic on the string parts themselves
  // So step one, collate them
  const queryString = stringParts
    .map((str, i) => [str, variableParts[i]])
    .join('');

  // Next, apply the graphql-tag version of the gql parser
  const queryDoc = addTypenameToDocument(graphqlTag([queryString]));

  // Analyze the fragment definitions in the doc
  const fragmentInfo = extractFragmentInfo(queryDoc);

  if (fragmentInfo.fragmentsOnly) {
    // If the doc is only fragments, then save them into the global registry
    fragmentInfo.fragments.forEach((fragment, name) => {
      logger.debug('Registering global fragment', name, fragment);
      globalSharedFragments.set(name, fragment);
    });
  }

  // Return the modified document that contains all the fragment names
  return queryDoc;
}

/**
 * Helper function to extract all spread fragment names from a Definition or Field structure
 */
function extractSpreadFragmentNames(item) {
  if (item.kind === 'FragmentSpread') {
    return [item.name.value];
  } else if (item.selectionSet) {
    return item.selectionSet.selections.reduce(
      (acc, selection) => acc.concat(extractSpreadFragmentNames(selection)),
      [],
    );
  }

  return [];
}

/**
 * Inject into the query string the necessary fragments to satisfy this query/mutation
 * @param {string|Definition} query The string
 */
export function injectNeededFragments(query: string | Object) {
  const queryDoc = typeof query === 'string' ? graphqlTag([query]) : query;
  const fragmentInfo = extractFragmentInfo(queryDoc);

  const neededFragmentMap: Map = determineNeededFragments(queryDoc);

  neededFragmentMap.forEach((def, name) => {
    if (!fragmentInfo.fragments.has(name)) {
      if (def) {
        queryDoc.definitions.push(def);
      } else {
        logger.warn(
          'Query',
          (queryDoc.name && queryDoc.name.value) || queryDoc,
          'needed fragment',
          name,
          'but could not locate it.',
        );
      }
    }
  });

  return typeof query === 'string' ? graphqlToString(queryDoc) : queryDoc;
}

/**
 * Helper function to analyze fragment definitions in the document
 * @param queryDoc
 * @returns {{fragments: Map<String, Object>, fragmentsOnly: boolean}}
 */
function extractFragmentInfo(queryDoc) {
  const definitions = queryDoc.definitions
    ? [...queryDoc.definitions]
    : [queryDoc];

  // Check if the all the definitions in the document are `kind: "FragmentDefinition"`
  return definitions.reduce(
    (acc, def) => {
      if (def.kind === 'FragmentDefinition') {
        acc.fragments.set(def.name.value, def);
      } else {
        acc.fragmentsOnly = false;
      }

      return acc;
    },
    {fragmentsOnly: true, fragments: new Map()},
  );
}

function determineNeededFragments(defOrDoc) {
  const definitions = defOrDoc.definitions
    ? [...defOrDoc.definitions]
    : [defOrDoc];
  const neededFragments = new Map();

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    if (def.kind === 'FragmentSpread') {
      const globalFragmentDef = globalSharedFragments.get(def.name.value);
      neededFragments.set(def.name.value, globalFragmentDef);
      if (globalFragmentDef) {
        definitions.push(globalFragmentDef);
      }
    } else if (def.selectionSet) {
      definitions.push(...def.selectionSet.selections);
    }
  }

  return neededFragments;
}

export function extractVariableDefinitions(queryDoc) {
  if (
    !queryDoc ||
    !Array.isArray(queryDoc.definitions) ||
    !queryDoc.definitions.length ||
    !Array.isArray(queryDoc.definitions[0].variableDefinitions)
  ) {
    return [];
  }

  // todo This should be more generic, and less type.type.type
  return queryDoc.definitions[0].variableDefinitions.map(varDef => ({
    name: varDef.variable.name.value,
    type: (varDef.type.name ||
      varDef.type.type.name ||
      varDef.type.type.type.name).value,
    required: varDef.type.kind === 'NonNullType',
    list:
    (varDef.type.type ? varDef.type.type.kind : varDef.type.kind) ===
    'ListType',
  }));
}

export function generateFragmentQuery(fragmentDoc, id, variables) {
  const fragmentDef = fragmentDoc.definitions[0];
  return {
    fragment: fragmentDoc,
    fragmentName: fragmentDef.name.value,
    id: assembleDataId(fragmentDef.typeCondition.name.value, id),
    variables,
  };
}

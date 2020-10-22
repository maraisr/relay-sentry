import { addBreadcrumb, captureException } from '@sentry/minimal';
import type { GraphQLFormattedError } from 'graphql';
import type { RequestParameters } from 'relay-runtime';
import type { LogFunction } from 'relay-runtime/lib/store/RelayStoreTypes';

type LogEvent = Parameters<LogFunction>[0];

type GroupingOf<Col extends LogEvent, Grp extends string> =
	Col extends { name: `${Grp}.${string}` } ? Col : never;

export interface ErrorWithGraphQLErrors extends Error {
	graphqlErrors?: ReadonlyArray<GraphQLFormattedError>;
}

interface Options {
	/**
	 * The "tag" key that'll get used to annotate the Exception as a Relay exception. Defaults to `"data.client"`.
	 *
	 * @example
	 * data.client = relay
	 */
	tag?: string;
}

const CATEGORY = 'relay' as const;

const isExecuteEvent = (
	logEvent: LogEvent,
): logEvent is GroupingOf<typeof logEvent, 'execute'> =>
	logEvent.name.startsWith('execute');

const isQueryResourceEvent = (
	logEvent: LogEvent,
): logEvent is GroupingOf<typeof logEvent, 'queryresource'> =>
	logEvent.name.startsWith('queryresource');

const errorsIsGraphQLError = (
	errors: any,
): errors is ReadonlyArray<GraphQLFormattedError> =>
	Array.isArray(errors) && errors.some((item) => 'message' in item);

/**
 * Runs on every Relay life cycle stages, passing through some context for this function to _react_ upon. Through this
 * you can pass an _optional_ {@link Options} to set some properties that get emitted to Sentry.
 */
export const logFunction = ({
	tag = 'data.client',
}: Options = {}): LogFunction => (logEvent) => {
	const category = `${CATEGORY}.${logEvent.name}`;

	if (isExecuteEvent(logEvent)) {
		const { transactionID } = logEvent;
		switch (logEvent.name) {
			case 'execute.start': {
				const params = logEvent.params as RequestParameters;

				addBreadcrumb({
					type: 'info',
					category,
					data: {
						transactionID,
						id: params.id ?? params.cacheID,
						kind: params.operationKind,
						name: params.name,
						variables: logEvent.variables,
					},
				});
				break;
			}
			case 'execute.error': {
				let errors: ReadonlyArray<GraphQLFormattedError> | 'na' = 'na';

				const error = logEvent.error as ErrorWithGraphQLErrors;
				if (
					'graphqlErrors' in error &&
					errorsIsGraphQLError(error?.graphqlErrors)
				) {
					errors = error.graphqlErrors;
					delete error.graphqlErrors;
				}

				captureException(error, {
					tags: {
						[tag]: 'relay',
					},
					contexts: {
						relay: {
							transactionID,
							name: logEvent.name,
							errors,
						},
					},
				});
				break;
			}
			default: {
				addBreadcrumb({
					type: 'debug',
					category,
					data: {
						transactionID,
					},
				});
				break;
			}
		}
	} else if (isQueryResourceEvent(logEvent)) {
		// @ts-ignore wait for https://github.com/DefinitelyTyped/DefinitelyTyped/pull/49006 to merge
		const { resourceID } = logEvent;
		switch (logEvent.name) {
			case 'queryresource.fetch': {
				const params = logEvent.operation.request.node.params;

				addBreadcrumb({
					type: 'info',
					category,
					data: {
						resourceID,
						id: params.id ?? params.cacheID,
						kind: params.operationKind,
						name: params.name,
						variables: logEvent.operation.root.variables,
						shouldFetch: logEvent.shouldFetch ? 'yes' : 'no',
						fetchPolicy: logEvent.fetchPolicy,
						renderPolicy: logEvent.renderPolicy,
						queryAvailability: logEvent.queryAvailability,
					},
				});

				break;
			}
			default: {
				addBreadcrumb({
					type: 'debug',
					category,
					data: {
						resourceID,
					},
				});
				break;
			}
		}
	} else {
		addBreadcrumb({
			type: 'debug',
			category,
		});
	}
};

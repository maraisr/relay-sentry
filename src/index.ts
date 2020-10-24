import { addBreadcrumb, captureException } from '@sentry/minimal';
import { Severity } from '@sentry/types';
import type { GraphQLFormattedError } from 'graphql';
import type { RequestParameters } from 'relay-runtime';
import type { LogFunction } from 'relay-runtime/lib/store/RelayStoreTypes';

type LogEvent = Parameters<LogFunction>[0];

type GroupingOf<Col extends LogEvent, Grp extends string> =
	Col extends { name: `${Grp}.${string}` } ? Col : never;

export interface ErrorWithGraphQLErrors {
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
					level: Severity.Info,
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

				let error = logEvent.error as ErrorWithGraphQLErrors;
				if (
					'graphqlErrors' in error &&
					errorsIsGraphQLError(error?.graphqlErrors)
				) {
					errors = error.graphqlErrors;
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
					level: Severity.Debug,
					category,
					data: {
						transactionID,
					},
				});
				break;
			}
		}
	} else if (isQueryResourceEvent(logEvent)) {
		const { resourceID } = logEvent;
		switch (logEvent.name) {
			case 'queryresource.fetch': {
				const {
					node: { params },
					variables,
				} = logEvent.operation.request;

				addBreadcrumb({
					type: 'info',
					level: Severity.Info,
					category,
					data: {
						resourceID,
						id: params.id ?? params.cacheID,
						kind: params.operationKind,
						name: params.name,
						variables,
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
					level: Severity.Debug,
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
			level: Severity.Debug,
			category,
		});
	}
};

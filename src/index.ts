import { addBreadcrumb } from '@sentry/minimal';
import { Severity } from '@sentry/types';
import type { GraphQLFormattedError } from 'graphql';
import type { PayloadError } from 'relay-runtime';
import type { LogFunction } from 'relay-runtime/lib/store/RelayStoreTypes';

type LogEvent = Parameters<LogFunction>[0];

type GroupingOf<Col extends LogEvent, Grp extends string> =
	Col extends { name: `${Grp}.${string}` } ? Col : never;

const isExecuteEvent = (
	logEvent: LogEvent,
): logEvent is GroupingOf<typeof logEvent, 'execute'> =>
	logEvent.name.startsWith('execute');

const isQueryResourceEvent = (
	logEvent: LogEvent,
): logEvent is GroupingOf<typeof logEvent, 'queryresource'> =>
	logEvent.name.startsWith('queryresource');

export interface ErrorWithGraphQLErrors extends Error {
	graphqlErrors?: ReadonlyArray<GraphQLFormattedError | PayloadError>;
}

interface Options {
	/**
	 * Use this function to filter events that you do not wish to emit as breadcrumbs. Perhaps you don't get when the
	 * store did a garbage collection, so you can use this to filter that. The idea here is to keep this method pure, so
	 * please don't use this to log things 😅
	 *
	 * Return `true` for the event not to be included.
	 *
	 * @example
	 *
	 * ```js
	 * logFunction({
	 *  filterEvents(logEvent) {
	 *      // Don't include store.gc events
	 *      return logEvent.name !== "store.gc";
	 *  }
	 * })
	 * ```
	 */
	filterEvents?: (logEvent: LogEvent) => boolean;
}

const CATEGORY = 'relay' as const;

const errorsIsGraphQLError = (
	errors: any,
): errors is ReadonlyArray<GraphQLFormattedError> =>
	Array.isArray(errors) && errors.some((item) => 'message' in item);

/**
 * Runs on every Relay life cycle stages, passing through some context for this function to _react_ upon. Through this
 * you can pass an _optional_ {@link Options} to set some properties that get emitted to Sentry.
 */
export const logFunction = ({ filterEvents }: Options = {}): LogFunction => (
	logEvent,
) => {
	if (typeof filterEvents === 'function' && !filterEvents(logEvent)) return;

	const category = `${CATEGORY}.${logEvent.name}`;

	if (isExecuteEvent(logEvent)) {
		const { transactionID } = logEvent;
		switch (logEvent.name) {
			case 'execute.start': {
				const params = logEvent.params;

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
				const data: {
					transactionID: number;
					name: string;
					errors?: ErrorWithGraphQLErrors['graphqlErrors'];
				} = {
					transactionID,
					name: logEvent.name,
				};

				let error = logEvent.error as ErrorWithGraphQLErrors;
				if (
					'graphqlErrors' in error &&
					errorsIsGraphQLError(error?.graphqlErrors)
				) {
					data.errors = error.graphqlErrors;
				}

				addBreadcrumb({
					type: 'error',
					level: Severity.Error,
					category,
					data,
				});
				break;
			}
			case 'execute.info':
				addBreadcrumb({
					type: 'info',
					level: Severity.Info,
					category,
					data: {
						transactionID,
						info: logEvent.info,
					},
				});
				break;
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
			data: {},
		});
	}
};

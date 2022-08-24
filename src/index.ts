import { addBreadcrumb } from '@sentry/hub';
import type { GraphQLFormattedError } from 'graphql';

import type {
	LogEvent,
	LogFunction,
} from 'relay-runtime/lib/store/RelayStoreTypes';

import type { ErrorWithGraphQLErrors, Options } from 'relay-sentry';

type GroupingOf<Col extends LogEvent, Grp extends string> = Col extends {
	name: `${Grp}.${string}`;
}
	? Col
	: never;

const CATEGORY = 'relay' as const;

/*#__INLINE__*/
const isExecuteEvent = (
	logEvent: LogEvent,
): logEvent is GroupingOf<typeof logEvent, 'execute'> =>
	logEvent.name.startsWith('execute');

/*#__INLINE__*/
const isQueryResourceEvent = (
	logEvent: LogEvent,
): logEvent is GroupingOf<typeof logEvent, 'queryresource'> =>
	logEvent.name.startsWith('queryresource');

/*#__INLINE__*/
const isNetworkEvent = (
	logEvent: LogEvent,
): logEvent is GroupingOf<typeof logEvent, 'network'> =>
	logEvent.name.startsWith('network');

/*#__INLINE__*/
const errorsIsGraphQLError = (
	errors: any,
): errors is ReadonlyArray<GraphQLFormattedError> =>
	Array.isArray(errors) && errors.some((item) => 'message' in item);

/**
 * Runs on every Relay life cycle stages, passing through some context for this function to _react_ upon. Through this
 * you can pass an _optional_ {@link Options} to set some properties that get emitted to Sentry.
 */
export const logFunction =
	({ filterEvents }: Options = {}): LogFunction =>
	(logEvent) => {
		if (typeof filterEvents === 'function' && !filterEvents(logEvent))
			return;

		const category = `${CATEGORY}.${logEvent.name}`;

		if (isExecuteEvent(logEvent)) {
			const { executeId } = logEvent;

			switch (logEvent.name) {
				case 'execute.start':
					addBreadcrumb({
						type: 'info',
						level: 'info',
						category,
						data: {
							executeId,
							...logEvent.params,
							variables: logEvent.variables,
						},
					});
					break;
				case 'execute.next':
					addBreadcrumb({
						type: 'debug',
						level: 'debug',
						category,
						data: {
							executeId,
							response: logEvent.response,
							duration: logEvent.duration,
						},
					});
					break;
				case 'execute.complete':
					addBreadcrumb({
						type: 'info',
						level: 'info',
						category,
						data: {
							executeId,
						},
					});
					break;
				case 'execute.error':
					addBreadcrumb({
						type: 'error',
						level: 'error',
						category,
						data: {
							executeId,
							error: logEvent.error,
						},
					});
					break;
				default: {
					addBreadcrumb({
						type: 'debug',
						level: 'debug',
						category,
						data: {
							executeId,
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
						level: 'info',
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
						level: 'debug',
						category,
						data: {
							resourceID,
						},
					});
					break;
				}
			}
		} else if (isNetworkEvent(logEvent)) {
			const { networkRequestId } = logEvent;
			switch (logEvent.name) {
				case 'network.start': {
					const params = logEvent.params;

					addBreadcrumb({
						type: 'info',
						level: 'info',
						category,
						data: {
							networkRequestId,
							id: params.id ?? params.cacheID,
							kind: params.operationKind,
							name: params.name,
							variables: logEvent.variables,
						},
					});
					break;
				}
				case 'network.error': {
					const data: {
						networkRequestId: number;
						name: string;
						errors?: ErrorWithGraphQLErrors['graphqlErrors'];
					} = {
						networkRequestId,
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
						level: 'error',
						category,
						data,
					});
					break;
				}
				case 'network.info': {
					const { info } = logEvent;

					addBreadcrumb({
						type: 'info',
						level: 'info',
						category,
						data: {
							networkRequestId,
							info,
						},
					});
					break;
				}
				case 'network.complete': {
					addBreadcrumb({
						type: 'info',
						level: 'info',
						category,
						data: {
							networkRequestId,
						},
					});
					break;
				}
				default: {
					addBreadcrumb({
						type: 'debug',
						level: 'debug',
						category,
						data: {
							networkRequestId,
						},
					});
					break;
				}
			}
		} else {
			addBreadcrumb({
				type: 'debug',
				level: 'debug',
				category,
				data: {},
			});
		}
	};
